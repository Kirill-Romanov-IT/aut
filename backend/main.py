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
            cur.execute("SELECT * FROM companies ORDER BY created_at DESC")
            companies = cur.fetchall()
            return [models.Company(**company) for company in companies]
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
            
            # 1. Fetch data from companies
            cur.execute("SELECT name, location FROM companies WHERE id = ANY(%s)", (int_ids,))
            companies_to_move = cur.fetchall()
            
            if not companies_to_move:
                return {"message": "No matching companies found", "updated_count": 0}
            
            # 2. Insert into ready_companies (Name becomes company_name)
            for company in companies_to_move:
                cur.execute(
                    "INSERT INTO ready_companies (company_name, location) VALUES (%s, %s)",
                    (company['name'], company['location'])
                )
            
            # 3. Delete from companies
            cur.execute("DELETE FROM companies WHERE id = ANY(%s)", (int_ids,))
            
            conn.commit()
            return {"message": f"Successfully moved {len(companies_to_move)} companies to Ready", "updated_count": len(companies_to_move)}
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
            cur.execute("SELECT * FROM ready_companies ORDER BY created_at DESC")
            companies = cur.fetchall()
            return [models.ReadyCompany(**company) for company in companies]
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
            
            cur.execute("DELETE FROM ready_companies WHERE id = ANY(%s)", (int_ids,))
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
                UPDATE ready_companies 
                SET company_name = %s, location = %s, name = %s, sur_name = %s, phone_number = %s
                WHERE id = %s
                RETURNING *
                """,
                (company_update.company_name, company_update.location, company_update.name, 
                 company_update.sur_name, company_update.phone_number, company_id)
            )
            updated_company = cur.fetchone()
            if not updated_company:
                raise HTTPException(status_code=404, detail="Ready company not found")
            conn.commit()
            return models.ReadyCompany(**updated_company)
    except Exception as e:
        conn.rollback()
        if isinstance(e, HTTPException):
            raise e
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        conn.close()
