# Add these endpoints to main.py after the /clients endpoint (around line 169)

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
