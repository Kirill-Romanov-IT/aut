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

@app.post("/upload-csv")
async def upload_csv(file: UploadFile = File(...), current_user: models.User = Depends(get_current_user)):
    if not file.filename.endswith('.csv'):
        raise HTTPException(status_code=400, detail="Invalid file format. Please upload a CSV file.")

    content = await file.read()
    decoded_content = content.decode('utf-8')
    csv_reader = csv.DictReader(io.StringIO(decoded_content))

    conn = db.get_db_connection()
    try:
        with conn.cursor() as cur:
            for row in csv_reader:
                cur.execute(
                    """
                    INSERT INTO clients (
                        phone_number, user_name, user_surname, clients_company, 
                        position, agent_name, location_office, direct_extension, previous_call_summary
                    ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
                    """,
                    (
                        row['phone_number'], row['user_name'], row['user_surname'], row['clients_company'],
                        row['position'], row['agent_name'], row['location_office'], 
                        row.get('direct_extension'), row.get('previous_call_summary')
                    )
                )
            conn.commit()
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=f"Error processing CSV: {str(e)}")
    finally:
        conn.close()

    return {"message": "CSV uploaded and processed successfully"}

@app.get("/clients", response_model=list[models.Client])
async def get_clients(current_user: models.User = Depends(get_current_user)):
    conn = db.get_db_connection()
    try:
        with conn.cursor() as cur:
            cur.execute("SELECT * FROM clients")
            clients = cur.fetchall()
            return [models.Client(**client) for client in clients]
    finally:
        conn.close()

@app.get("/health/db")
def health_db():
    dsn = os.environ["DATABASE_URL"]
    with psycopg.connect(dsn) as conn:
        with conn.cursor() as cur:
            cur.execute("SELECT 1;")
            value = cur.fetchone()[0]
    return {"db": "ok", "value": value}
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

@app.post("/companies", response_model=models.Company)
async def create_company(company: models.Company, current_user: models.User = Depends(get_current_user)):
    conn = db.get_db_connection()
    try:
        with conn.cursor() as cur:
            cur.execute(
                """
                INSERT INTO companies (name, domain, industry, country, status)
                VALUES (%s, %s, %s, %s, %s)
                RETURNING id, name, domain, industry, country, status, created_at
                """,
                (company.name, company.domain, company.industry, company.country, company.status or "active")
            )
            new_company = cur.fetchone()
            conn.commit()
            return models.Company(**new_company)
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=f"Error creating company: {str(e)}")
    finally:
        conn.close()

@app.post("/upload-companies-csv")
async def upload_companies_csv(file: UploadFile = File(...), current_user: models.User = Depends(get_current_user)):
    if not file.filename.endswith('.csv'):
        raise HTTPException(status_code=400, detail="Invalid file format. Please upload a CSV file.")

    content = await file.read()
    decoded_content = content.decode('utf-8')
    csv_reader = csv.DictReader(io.StringIO(decoded_content))

    conn = db.get_db_connection()
    try:
        count = 0
        with conn.cursor() as cur:
            for row in csv_reader:
                cur.execute(
                    """
                    INSERT INTO companies (name, domain, industry, country, status)
                    VALUES (%s, %s, %s, %s, %s)
                    """,
                    (
                        row.get('name', ''),
                        row.get('domain', ''),
                        row.get('industry', ''),
                        row.get('country', ''),
                        row.get('status', 'active')
                    )
                )
                count += 1
            conn.commit()
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=f"Error processing CSV: {str(e)}")
    finally:
        conn.close()

    return {"message": f"CSV uploaded successfully. {count} companies imported."}
