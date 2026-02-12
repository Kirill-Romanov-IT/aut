import os
import json
from typing import Optional, Dict, Any
from google import genai
from google.genai import types
from fastapi import HTTPException

# Configure Gemini
API_KEY = os.environ.get("GEMINI_API_KEY")
MODEL_NAME = "gemini-3-flash-preview"  # Updated to user preference

def get_client():
    if not API_KEY:
        raise HTTPException(status_code=500, detail="GEMINI_API_KEY is not set")
    return genai.Client(api_key=API_KEY)

def safe_json_load(s: str) -> Optional[Dict[str, Any]]:
    s = (s or "").strip()
    try:
        return json.loads(s)
    except Exception:
        pass
    
    # Try to find JSON object in the string
    start = s.find("{")
    end = s.rfind("}")
    if start != -1 and end != -1 and end > start:
        chunk = s[start:end + 1]
        try:
            return json.loads(chunk)
        except Exception:
            return None
    return None

def estimate_headcount(prompt: str) -> Dict[str, Any]:
    client = get_client()
    
    # Configure for JSON response
    config = types.GenerateContentConfig(
        response_mime_type="application/json",
        response_schema={
            "type": "OBJECT",
            "properties": {
                "headcount": {
                    "type": "OBJECT",
                    "properties": {
                        "value": {"type": "INTEGER", "nullable": True},
                        "min": {"type": "INTEGER", "nullable": True},
                        "max": {"type": "INTEGER", "nullable": True}
                    }
                },
                "confidence": {"type": "NUMBER"},
                "source_hint": {"type": "STRING"}
            }
        },
        tools=[types.Tool(google_search=types.GoogleSearch())]
    )

    try:
        response = client.models.generate_content(
            model=MODEL_NAME,
            contents=prompt,
            config=config,
        )
        
        raw_text = getattr(response, "text", None)
        data = safe_json_load(raw_text)
        
        if not data:
             raise ValueError("Failed to parse JSON from Gemini response")

        return data

    except Exception as e:
        print(f"Gemini Error: {e}")
        raise HTTPException(status_code=500, detail=f"Gemini API Error: {str(e)}")

def estimate_headcount_bulk(companies: list[dict]) -> list[dict]:
    """
    companies: list of dicts with 'id', 'name', 'location'
    Returns: list of dicts with 'id' and 'headcount_data' (value, min, max, confidence, source)
    """
    client = get_client()

    # Construct a bulk prompt
    companies_text = ""
    for c in companies:
        companies_text += f"- ID: {c['id']}, Name: {c['name']}, Location: {c['location']}\n"

    prompt = f"""You are an OSINT analyst. Determine the approximate number of employees (headcount) for the following companies.

Companies:
{companies_text}

Rules:
- Return ONLY valid JSON.
- No explanations.
- Return a LIST of objects, one for each company.
- Each object must include the 'id' from the input.
- If an exact number is unknown, return a range (min/max).
- Include a confidence score (0..1) and a short source hint.

JSON format:
[
  {{
    "id": "string | number",
    "headcount": {{ "value": number | null, "min": number | null, "max": number | null }},
    "confidence": number,
    "source_hint": string
  }}
]
"""

    # Configure for JSON response
    config = types.GenerateContentConfig(
        response_mime_type="application/json",
        response_schema={
            "type": "ARRAY",
            "items": {
                "type": "OBJECT",
                "properties": {
                    "id": {"type": "STRING"}, # ID might be int or string, safe to treat as string in JSON
                    "headcount": {
                        "type": "OBJECT",
                        "properties": {
                            "value": {"type": "INTEGER", "nullable": True},
                            "min": {"type": "INTEGER", "nullable": True},
                            "max": {"type": "INTEGER", "nullable": True}
                        }
                    },
                    "confidence": {"type": "NUMBER"},
                    "source_hint": {"type": "STRING"}
                }
            }
        },
        tools=[types.Tool(google_search=types.GoogleSearch())]
    )

    try:
        response = client.models.generate_content(
            model=MODEL_NAME,
            contents=prompt,
            config=config,
        )
        
        raw_text = getattr(response, "text", None)
        data = safe_json_load(raw_text)
        
        if not data or not isinstance(data, list):
             # Fallback or error? Let's try to wrap in list if it's a single object (edge case)
             if isinstance(data, dict):
                 data = [data]
             else:
                 raise ValueError("Failed to parse JSON list from Gemini response")

        return data

    except Exception as e:
        print(f"Gemini Bulk Error: {e}")
        raise HTTPException(status_code=500, detail=f"Gemini API Bulk Error: {str(e)}")
