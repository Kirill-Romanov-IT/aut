import os
from contextlib import asynccontextmanager
from typing import Annotated
from dotenv import load_dotenv
import csv
import io
from fastapi import FastAPI, Depends, HTTPException, status, UploadFile, File
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from fastapi.middleware.cors import CORSMiddleware
import psycopg
from jose import JWTError, jwt

import db
import models
import auth

load_dotenv()

@asynccontextmanager
async def lifespan(app: FastAPI):
    db.init_db()
    yield

app = FastAPI(lifespan=lifespan)

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token")

origins = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

async def get_current_user(token: Annotated[str, Depends(oauth2_scheme)]):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, auth.SECRET_KEY, algorithms=[auth.ALGORITHM])
        username: str = payload.get("sub")
        if username is None:
            raise credentials_exception
        token_data = models.TokenData(username=username)
    except JWTError:
        raise credentials_exception
    
    conn = db.get_db_connection()
    try:
        with conn.cursor() as cur:
            cur.execute("SELECT * FROM users WHERE username = %s", (token_data.username,))
            user = cur.fetchone()
            if user is None:
                raise credentials_exception
            return models.User(**user)
    finally:
        conn.close()

@app.post("/register", response_model=models.User)
async def register(user: models.UserCreate):
    conn = db.get_db_connection()
    try:
        with conn.cursor() as cur:
            cur.execute("SELECT * FROM users WHERE username = %s OR email = %s", (user.username, user.email))
            if cur.fetchone():
                raise HTTPException(status_code=400, detail="Username or email already registered")
            
            hashed_password = auth.get_password_hash(user.password)
            cur.execute(
                "INSERT INTO users (username, email, hashed_password) VALUES (%s, %s, %s) RETURNING id, username, email, is_active",
                (user.username, user.email, hashed_password)
            )
            new_user = cur.fetchone()
            conn.commit()
            return models.User(**new_user)
    except Exception as e:
        conn.rollback() # Rollback in case of error (though with single statement autocommit isn't an issue, but good practice if logic grows)
        # Re-raise HTTP exceptions, otherwise wrap or log
        if isinstance(e, HTTPException):
            raise e
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        conn.close()

@app.post("/token", response_model=models.Token)
async def login_for_access_token(form_data: Annotated[OAuth2PasswordRequestForm, Depends()]):
    conn = db.get_db_connection()
    try:
        with conn.cursor() as cur:
            cur.execute("SELECT * FROM users WHERE username = %s", (form_data.username,))
            user = cur.fetchone()
            if not user or not auth.verify_password(form_data.password, user["hashed_password"]):
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Incorrect username or password",
                    headers={"WWW-Authenticate": "Bearer"},
                )
            
            access_token = auth.create_access_token(data={"sub": user["username"]})
            return {"access_token": access_token, "token_type": "bearer"}
    finally:
        conn.close()

@app.get("/users/me", response_model=models.User)
async def read_users_me(current_user: Annotated[models.User, Depends(get_current_user)]):
    return current_user

@app.get("/")
async def root():
    return {"message": "Hello from FastAPI"}

@app.get("/health")
async def health():
    return {"status": "OK"}
@app.get("/health/db")
def health_db():
    dsn = os.environ["DATABASE_URL"]
    with psycopg.connect(dsn) as conn:
        with conn.cursor() as cur:
            cur.execute("SELECT 1;")
            value = cur.fetchone()[0]
    return {"db": "ok", "value": value}

@app.post("/companies/upload", status_code=status.HTTP_201_CREATED)
async def upload_companies(file: UploadFile = File(...), current_user: models.User = Depends(get_current_user)):
    if not file.filename.endswith('.csv'):
        raise HTTPException(status_code=400, detail="Invalid file format. Please upload a CSV file.")

    content = await file.read()
    decoded_content = content.decode('utf-8')
    csv_reader = csv.DictReader(io.StringIO(decoded_content))
    
    # Get column mappings
    conn = db.get_db_connection()
    try:
        with conn.cursor() as cur:
            cur.execute("SELECT csv_header, db_field FROM company_column_mappings")
            mappings = {row['csv_header']: row['db_field'] for row in cur.fetchall()}
            
            # Prepare to insert
            companies_to_insert = []
            for row in csv_reader:
                company_data = {}
                for csv_header, value in row.items():
                    if csv_header is None:
                        continue
                        
                    db_field = None
                    if csv_header.lower() == "business_owner_name":
                        db_field = "name"
                    elif csv_header.lower() == "address_state":
                        db_field = "location"
                    else:
                        for map_header, map_field in mappings.items():
                            if map_header and map_header.lower() == csv_header.lower():
                                db_field = map_field
                                break
                    
                    if db_field:
                        company_data[db_field] = value
                
                # Only add if we have at least a name (or other required fields)
                if 'name' in company_data:
                    # Provide defaults for missing fields if necessary, though DB handles defaults for employees/created_at
                     companies_to_insert.append(company_data)

            # Insert companies
            inserted_count = 0
            skipped_count = 0
            
            # Fetch existing names to prevent duplicates
            cur.execute("SELECT name FROM companies")
            existing_names = {row['name'].lower() for row in cur.fetchall()}
            
            for company in companies_to_insert:
                if company['name'].lower() in existing_names:
                    skipped_count += 1
                    continue
                    
                keys = list(company.keys())
                if not keys:
                    continue
                
                columns = ', '.join(keys)
                placeholders = ', '.join(['%s'] * len(keys))
                values = list(company.values())
                
                cur.execute(
                    f"INSERT INTO companies ({columns}) VALUES ({placeholders})",
                    values
                )
                existing_names.add(company['name'].lower())
                inserted_count += 1
            
            # Get total count
            cur.execute("SELECT COUNT(*) FROM companies")
            total_count = cur.fetchone()['count']
            
            conn.commit()
            return {
                "message": f"Successfully imported {inserted_count} companies.",
                "inserted_count": inserted_count,
                "skipped_count": skipped_count,
                "total_in_csv": len(companies_to_insert),
                "total_count": total_count
            }
            
    except Exception as e:
        conn.rollback()
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        conn.close()

@app.get("/companies", response_model=list[models.Company])
async def get_companies(current_user: models.User = Depends(get_current_user)):
    conn = db.get_db_connection()
    try:
        with conn.cursor() as cur:
            cur.execute("SELECT * FROM companies WHERE is_in_kanban = FALSE AND is_ready = FALSE ORDER BY created_at DESC")
            companies = cur.fetchall()
            return [models.Company(**company) for company in companies]
    finally:
        conn.close()

@app.get("/companies/kanban", response_model=list[models.Company])
async def get_kanban_companies(current_user: models.User = Depends(get_current_user)):
    conn = db.get_db_connection()
    try:
        with conn.cursor() as cur:
            cur.execute("SELECT * FROM companies WHERE is_in_kanban = TRUE ORDER BY created_at DESC")
            companies = cur.fetchall()
            return [models.Company(**company) for company in companies]
    finally:
        conn.close()
@app.put("/companies/{company_id}", response_model=models.Company)
async def update_company(company_id: int, company_update: models.CompanyCreate, current_user: models.User = Depends(get_current_user)):
    conn = db.get_db_connection()
    try:
        with conn.cursor() as cur:
            cur.execute(
                """
                UPDATE companies 
                SET name = %s, employees = %s, location = %s
                WHERE id = %s
                RETURNING *
                """,
                (company_update.name, company_update.employees, company_update.location, company_id)
            )
            updated_company = cur.fetchone()
            if not updated_company:
                raise HTTPException(status_code=404, detail="Company not found")
            conn.commit()
            return models.Company(**updated_company)
    except Exception as e:
        conn.rollback()
        if isinstance(e, HTTPException):
            raise e
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        conn.close()

@app.patch("/companies/{company_id}/status", response_model=models.Company)
async def update_company_status(company_id: int, status_update: models.CompanyStatusUpdate, current_user: models.User = Depends(get_current_user)):
    conn = db.get_db_connection()
    try:
        with conn.cursor() as cur:
            cur.execute(
                """
                UPDATE companies 
                SET status = %s
                WHERE id = %s
                RETURNING *
                """,
                (status_update.status, company_id)
            )
            updated_company = cur.fetchone()
            if not updated_company:
                raise HTTPException(status_code=404, detail="Company not found")
            conn.commit()
            return models.Company(**updated_company)
    except Exception as e:
        conn.rollback()
        if isinstance(e, HTTPException):
            raise e
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        conn.close()


@app.post("/companies/bulk-delete")
async def bulk_delete_companies(ids: list[int | str], current_user: models.User = Depends(get_current_user)):
    conn = db.get_db_connection()
    try:
        with conn.cursor() as cur:
            # Convert string IDs to int if necessary
            int_ids = []
            for id_val in ids:
                try:
                    int_ids.append(int(id_val))
                except (ValueError, TypeError):
                    continue
            
            if not int_ids:
                return {"message": "No valid IDs provided", "deleted_count": 0}
            
            cur.execute("DELETE FROM companies WHERE id = ANY(%s)", (int_ids,))
            deleted_count = cur.rowcount
            conn.commit()
            return {"message": f"Successfully deleted {deleted_count} companies", "deleted_count": deleted_count}
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        conn.close()

@app.patch("/companies/bulk-enrich")
async def bulk_enrich_companies(updates: list[models.CompanyEnrich], current_user: models.User = Depends(get_current_user)):
    conn = db.get_db_connection()
    try:
        with conn.cursor() as cur:
            for update in updates:
                cur.execute(
                    "UPDATE companies SET employees = %s WHERE id = %s",
                    (update.employees, update.id)
                )
            conn.commit()
            return {"message": f"Successfully enriched {len(updates)} companies"}
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        conn.close()

@app.patch("/companies/bulk-ready")
async def bulk_ready_companies(ids: list[int | str], current_user: models.User = Depends(get_current_user)):
    conn = db.get_db_connection()
    try:
        with conn.cursor() as cur:
            # Convert string IDs to int if necessary
            int_ids = []
            for id_val in ids:
                try:
                    int_ids.append(int(id_val))
                except (ValueError, TypeError):
                    continue
            
            if not int_ids:
                return {"message": "No valid IDs provided", "updated_count": 0}
            
            # Update is_ready flag
            cur.execute("UPDATE companies SET is_ready = TRUE WHERE id = ANY(%s)", (int_ids,))
            updated_count = cur.rowcount
            
            conn.commit()
            return {"message": f"Successfully marked {updated_count} companies as Ready", "updated_count": updated_count}
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        conn.close()

@app.get("/ready-companies", response_model=list[models.ReadyCompany])
async def get_ready_companies(current_user: models.User = Depends(get_current_user)):
    conn = db.get_db_connection()
    try:
        with conn.cursor() as cur:
            cur.execute("SELECT * FROM companies WHERE is_ready = TRUE ORDER BY created_at DESC")
            companies = cur.fetchall()
            # Map database fields to ReadyCompany model
            ready_companies = []
            for c in companies:
                ready_companies.append(models.ReadyCompany(
                    id=c['id'],
                    company_name=c['name'],
                    location=c['location'],
                    name=c['contact_name'],
                    sur_name=c['contact_surname'],
                    phone_number=c['contact_phone'],
                    created_at=c['created_at']
                ))
            return ready_companies
    finally:
        conn.close()

@app.post("/ready-companies/bulk-delete")
async def bulk_delete_ready_companies(ids: list[int | str], current_user: models.User = Depends(get_current_user)):
    conn = db.get_db_connection()
    try:
        with conn.cursor() as cur:
            int_ids = []
            for id_val in ids:
                try:
                    int_ids.append(int(id_val))
                except (ValueError, TypeError):
                    continue
            
            if not int_ids:
                return {"message": "No valid IDs provided", "deleted_count": 0}
            
            # We delete from companies table but filter by is_ready just in case
            cur.execute("DELETE FROM companies WHERE id = ANY(%s) AND is_ready = TRUE", (int_ids,))
            deleted_count = cur.rowcount
            conn.commit()
            return {"message": f"Successfully deleted {deleted_count} ready companies", "deleted_count": deleted_count}
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        conn.close()

@app.put("/ready-companies/{company_id}", response_model=models.ReadyCompany)
async def update_ready_company(company_id: int, company_update: models.ReadyCompanyCreate, current_user: models.User = Depends(get_current_user)):
    conn = db.get_db_connection()
    try:
        with conn.cursor() as cur:
            cur.execute(
                """
                UPDATE companies 
                SET name = %s, location = %s, contact_name = %s, contact_surname = %s, contact_phone = %s
                WHERE id = %s AND is_ready = TRUE
                RETURNING *
                """,
                (company_update.company_name, company_update.location, company_update.name, 
                 company_update.sur_name, company_update.phone_number, company_id)
            )
            updated = cur.fetchone()
            if not updated:
                raise HTTPException(status_code=404, detail="Ready company not found")
            conn.commit()
            return models.ReadyCompany(
                id=updated['id'],
                company_name=updated['name'],
                location=updated['location'],
                name=updated['contact_name'],
                sur_name=updated['contact_surname'],
                phone_number=updated['contact_phone'],
                created_at=updated['created_at']
            )
    except Exception as e:
        conn.rollback()
        if isinstance(e, HTTPException):
            raise e
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        conn.close()

@app.post("/ready-companies/{company_id}/move-to-kanban", response_model=models.Company)
async def move_to_kanban(company_id: int, current_user: models.User = Depends(get_current_user)):
    conn = db.get_db_connection()
    try:
        with conn.cursor() as cur:
            # 1. Fetch from companies
            cur.execute("SELECT * FROM companies WHERE id = %s AND is_ready = TRUE", (company_id,))
            ready_comp = cur.fetchone()
            if not ready_comp:
                raise HTTPException(status_code=404, detail="Ready company not found")
            
            # Validation: Check if all fields are filled
            missing_fields = []
            if not ready_comp.get('name'): missing_fields.append("Company Name")
            if not ready_comp.get('location'): missing_fields.append("Location")
            if not ready_comp.get('contact_name'): missing_fields.append("Contact Name")
            if not ready_comp.get('contact_surname'): missing_fields.append("Surname")
            if not ready_comp.get('contact_phone'): missing_fields.append("Phone Number")
            
            if missing_fields:
                raise HTTPException(
                    status_code=400, 
                    detail=f"I cannot transfer because the following fields are not filled: {', '.join(missing_fields)}"
                )
            
            # 2. Update status and flags
            cur.execute(
                """
                UPDATE companies 
                SET status = 'new', is_in_kanban = TRUE, is_ready = FALSE
                WHERE id = %s
                RETURNING *
                """,
                (company_id,)
            )
            updated_company = cur.fetchone()
            conn.commit()
            return models.Company(**updated_company)
    except Exception as e:
        conn.rollback()
        if isinstance(e, HTTPException):
            raise e
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        conn.close()

@app.post("/ready-companies/bulk-move-to-kanban", response_model=list[models.Company])
async def bulk_move_to_kanban(company_ids: list[int], current_user: models.User = Depends(get_current_user)):
    conn = db.get_db_connection()
    try:
        moved_companies = []
        with conn.cursor() as cur:
            for company_id in company_ids:
                # 1. Fetch
                cur.execute("SELECT * FROM companies WHERE id = %s AND is_ready = TRUE", (company_id,))
                ready_comp = cur.fetchone()
                if not ready_comp:
                    continue
                
                # Validation
                missing_fields = []
                if not ready_comp.get('name'): missing_fields.append("Company Name")
                if not ready_comp.get('location'): missing_fields.append("Location")
                if not ready_comp.get('contact_name'): missing_fields.append("Contact Name")
                if not ready_comp.get('contact_surname'): missing_fields.append("Surname")
                if not ready_comp.get('contact_phone'): missing_fields.append("Phone Number")
                
                if missing_fields:
                    raise HTTPException(
                        status_code=400, 
                        detail=f"I cannot transfer because the following fields are not filled: {', '.join(missing_fields)}"
                    )
                
                # 2. Update
                cur.execute(
                    """
                    UPDATE companies 
                    SET status = 'new', is_in_kanban = TRUE, is_ready = FALSE
                    WHERE id = %s
                    RETURNING *
                    """,
                    (company_id,)
                )
                updated_company = cur.fetchone()
                moved_companies.append(models.Company(**updated_company))
            
            conn.commit()
            return moved_companies
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        conn.close()

from pydantic import BaseModel

class HeadcountPrompt(BaseModel):
    prompt: str

@app.post("/companies/ai-estimate-headcount")
async def estimate_headcount_ep(body: HeadcountPrompt, current_user: models.User = Depends(get_current_user)):
    try:
        from ai_service import estimate_headcount
        # The service expects a string prompt.
        result = estimate_headcount(body.prompt)
        return result
    except Exception as e:
        print(f"Error in estimate_headcount endpoint: {e}")
        raise HTTPException(status_code=500, detail=str(e))

class CompanyInfo(BaseModel):
    id: str | int
    name: str
    location: str

class BulkHeadcountRequest(BaseModel):
    companies: list[CompanyInfo]

@app.post("/companies/ai-bulk-estimate-headcount")
async def estimate_headcount_bulk_ep(body: BulkHeadcountRequest, current_user: models.User = Depends(get_current_user)):
    try:
        from ai_service import estimate_headcount_bulk
        # Convert Pydantic models to dicts
        companies_dicts = [c.model_dump() for c in body.companies]
        results = estimate_headcount_bulk(companies_dicts)
        return results
    except Exception as e:
        print(f"Error in estimate_headcount_bulk endpoint: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.patch("/ready-companies/bulk-enrich")
async def bulk_enrich_ready_companies(updates: list[models.ReadyCompanyEnrich], current_user: models.User = Depends(get_current_user)):
    conn = db.get_db_connection()
    try:
        with conn.cursor() as cur:
            for update in updates:
                # Build dynamic update query based on provided fields
                update_fields = []
                values = []
                
                if update.name is not None:
                    update_fields.append("contact_name = %s")
                    values.append(update.name)
                
                if update.sur_name is not None:
                    update_fields.append("contact_surname = %s")
                    values.append(update.sur_name)
                    
                if update.phone_number is not None:
                    update_fields.append("contact_phone = %s")
                    values.append(update.phone_number)
                
                if not update_fields:
                    continue
                    
                values.append(update.id)
                query = f"UPDATE companies SET {', '.join(update_fields)} WHERE id = %s AND is_ready = TRUE"
                
                cur.execute(query, values)
                
            conn.commit()
            return {"message": f"Successfully enriched {len(updates)} ready companies"}
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        conn.close()

@app.post("/ready-companies/ai-bulk-find-decision-maker")
async def find_decision_maker_bulk_ep(body: models.BulkDecisionMakerRequest, current_user: models.User = Depends(get_current_user)):
    try:
        from ai_service import find_decision_maker_bulk
        # Convert Pydantic models to dicts
        companies_dicts = [c.model_dump() for c in body.companies]
        results = find_decision_maker_bulk(companies_dicts)
        return results
    except Exception as e:
        print(f"Error in find_decision_maker_bulk endpoint: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# --- Archived Companies ---

@app.get("/archived-companies", response_model=list[models.ArchivedCompany])
async def get_archived_companies(current_user: models.User = Depends(get_current_user)):
    conn = db.get_db_connection()
    try:
        with conn.cursor() as cur:
            cur.execute("SELECT * FROM archived_companies ORDER BY archived_at DESC")
            archived = cur.fetchall()
            return [models.ArchivedCompany(**a) for a in archived]
    finally:
        conn.close()

@app.post("/ready-companies/{company_id}/archive", response_model=models.ArchivedCompany)
async def archive_ready_company(company_id: int, current_user: models.User = Depends(get_current_user)):
    conn = db.get_db_connection()
    try:
        with conn.cursor() as cur:
            # 1. Fetch from companies
            cur.execute("SELECT * FROM companies WHERE id = %s AND is_ready = TRUE", (company_id,))
            ready_comp = cur.fetchone()
            if not ready_comp:
                raise HTTPException(status_code=404, detail="Ready company not found")
            
            # 2. Insert into archived_companies
            cur.execute(
                """
                INSERT INTO archived_companies (company_name, location, name, sur_name, phone_number)
                VALUES (%s, %s, %s, %s, %s)
                RETURNING *
                """,
                (ready_comp['name'], ready_comp['location'], ready_comp['contact_name'], 
                 ready_comp['contact_surname'], ready_comp['contact_phone'])
            )
            archived_company = cur.fetchone()
            
            # 3. Delete from companies
            cur.execute("DELETE FROM companies WHERE id = %s", (company_id,))
            
            conn.commit()
            return models.ArchivedCompany(**archived_company)
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        conn.close()

@app.post("/companies/{company_id}/archive", response_model=models.ArchivedCompany)
async def archive_lifecycle_company(company_id: int, current_user: models.User = Depends(get_current_user)):
    conn = db.get_db_connection()
    try:
        with conn.cursor() as cur:
            # 1. Fetch from companies
            cur.execute("SELECT * FROM companies WHERE id = %s", (company_id,))
            comp = cur.fetchone()
            if not comp:
                raise HTTPException(status_code=404, detail="Company not found")
            
            # 2. Insert into archived_companies
            cur.execute(
                """
                INSERT INTO archived_companies (company_name, location, name, sur_name, phone_number)
                VALUES (%s, %s, %s, %s, %s)
                RETURNING *
                """,
                (comp['name'], comp['location'], comp['contact_name'], 
                 comp['contact_surname'], comp['contact_phone'])
            )
            archived_company = cur.fetchone()
            
            # 3. Delete from companies
            cur.execute("DELETE FROM companies WHERE id = %s", (company_id,))
            
            conn.commit()
            return models.ArchivedCompany(**archived_company)
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        conn.close()

@app.post("/archived-companies/bulk-delete")
async def bulk_delete_archived_companies(company_ids: list[int], current_user: models.User = Depends(get_current_user)):
    conn = db.get_db_connection()
    try:
        with conn.cursor() as cur:
            if not company_ids:
                return {"message": "No IDs provided", "deleted_count": 0}
            
            cur.execute("DELETE FROM archived_companies WHERE id = ANY(%s)", (company_ids,))
            deleted_count = cur.rowcount
            conn.commit()
            return {"message": f"Successfully deleted {deleted_count} archived companies", "deleted_count": deleted_count}
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        conn.close()

@app.post("/archived-companies/bulk-restore")
async def bulk_restore_archived_companies(company_ids: list[int], current_user: models.User = Depends(get_current_user)):
    conn = db.get_db_connection()
    try:
        with conn.cursor() as cur:
            if not company_ids:
                return {"message": "No IDs provided", "restored_count": 0}
            
            # Get data from archived_companies
            cur.execute(
                "SELECT company_name, location, name, sur_name, phone_number FROM archived_companies WHERE id = ANY(%s)",
                (company_ids,)
            )
            companies = cur.fetchall()
            
            restored_count = 0
            for company in companies:
                # Insert into companies (Kanban) with 'new' status and is_in_kanban=True
                cur.execute(
                    "INSERT INTO companies (name, location, contact_name, contact_surname, contact_phone, status, is_in_kanban) VALUES (%s, %s, %s, %s, %s, 'new', TRUE)",
                    (company['company_name'], company['location'], company['name'], company['sur_name'], company['phone_number'])
                )
                restored_count += 1
            
            # Delete from archived_companies
            cur.execute("DELETE FROM archived_companies WHERE id = ANY(%s)", (company_ids,))
            
            conn.commit()
            return {"message": f"Successfully restored {restored_count} companies to Kanban", "restored_count": restored_count}
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        conn.close()
