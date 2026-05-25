import pandas as pd
import io
import math
from typing import List, Tuple, Dict, Any, Optional
from uuid import UUID
from supabase_client import supabase, supabase_service
from schemas.customer import ImportPreviewRow, ImportPreviewResponse

# Common area prefixes derived from user request
AREA_PREFIXES = ["K", "Ta", "Y", "L", "F", "U", "B", "D", "M", "R", "SY", "BH"]

def _clean_str(val: Any) -> str:
    if pd.isna(val) or val is None:
        return ""
    if isinstance(val, float) and math.isinf(val):
        return ""
    s = str(val).strip()
    if s.lower() == "nan":
        return ""
    return s

def extract_area_from_door_number(door_number: str) -> str:
    """Extract area prefix like 'K' from 'K-3/1' or 'K 3/1'."""
    if not door_number:
        return None
    # Check for prefix followed by '-' or space
    for prefix in sorted(AREA_PREFIXES, key=len, reverse=True): # Check longer prefixes first (like SY)
        if door_number.upper().startswith(f"{prefix.upper()}-") or door_number.upper().startswith(f"{prefix.upper()} "):
            return prefix
    return None

def generate_customer_id(area: str, tenant_id: int) -> str:
    """Generate sequential customer ID like 'K-001' using Supabase."""
    prefix = area if area else "GEN"
    
    # Get highest sequence number for this prefix and tenant
    # Note: This is a bit inefficient with Supabase REST, but for simple needs it works.
    # In production, a database function would be better.
    latest_customer = supabase_service.table("customers")\
        .select("customer_id")\
        .eq("tenant_id", tenant_id)\
        .like("customer_id", f"{prefix}-%")\
        .order("id", desc=True)\
        .limit(1)\
        .execute()

    if latest_customer.data:
        try:
            seq_part = latest_customer.data[0]["customer_id"].split("-")[1]
            next_seq = int(seq_part) + 1
        except (IndexError, ValueError):
            next_seq = 1
    else:
        next_seq = 1

    return f"{prefix}-{next_seq:03d}"

async def parse_import_file(file_bytes: bytes, filename: str, tenant_id: int) -> ImportPreviewResponse:
    """Parses uploaded file and returns a preview response indicating valid/invalid/duplicate rows."""
    if filename.endswith(".csv"):
        df = pd.read_csv(io.BytesIO(file_bytes), dtype=str)
    elif filename.endswith(".xlsx"):
        df = pd.read_excel(io.BytesIO(file_bytes), dtype=str)
    else:
        raise ValueError("Unsupported file format. Please upload .csv or .xlsx")

    # Expected mappings
    col_mapping = {
        "door_number": ["door no", "door", "door_number", "doornumber", "house no"],
        "name": ["name", "full name", "customer name", "full_name"],
        "card_number": ["card no", "card number", "card", "card_number", "stb no"],
        "phone_number": ["phone", "mobile", "phone no", "phone_number", "contact"],
        "provider_tag": ["provider", "tag", "provider_tag", "cable operator"],
        "expiry_date": ["expiry", "expiry date", "valid until", "due date", "end date"]
    }

    # Normalize columns
    df.columns = [str(c).lower().strip() for c in df.columns]
    
    mapped_df = pd.DataFrame()
    for standard_col, alternates in col_mapping.items():
        found = False
        for alt in alternates:
            if alt in df.columns:
                mapped_df[standard_col] = df[alt]
                found = True
                break
        if not found:
            mapped_df[standard_col] = "" # Empty if not found

    preview_data = []
    total = len(mapped_df)
    valid = 0
    errors = 0
    duplicates = 0

    # Fetch existing card numbers for THIS SHOP ONLY
    # This allows different shops to have the same card numbers
    # while preventing duplicates within the same shop.
    existing_cards_res = supabase.table("customers").select("card_number").eq("tenant_id", tenant_id).execute()
    existing_cards = {row["card_number"] for row in existing_cards_res.data}

    for index, row in mapped_df.iterrows():
        door_no = _clean_str(row.get("door_number", ""))
        name = _clean_str(row.get("name", ""))
        card_no = _clean_str(row.get("card_number", ""))
        phone = _clean_str(row.get("phone_number", ""))
        provider = _clean_str(row.get("provider_tag", ""))

        if phone.endswith(".0"):
            phone = phone[:-2]

        area = extract_area_from_door_number(door_no)
        
        # Try to parse expiry date if provided
        raw_expiry = _clean_str(row.get("expiry_date", ""))
        parsed_expiry = None
        if raw_expiry:
            try:
                parsed_expiry = pd.to_datetime(raw_expiry).date()
            except:
                pass

        preview_row = ImportPreviewRow(
            door_number=door_no,
            name=name,
            card_number=card_no,
            phone_number=phone if phone else None,
            provider_tag=provider if provider else None,
            area=area,
            expiry_date=parsed_expiry
        )

        error_msgs = []
        if not name:
            error_msgs.append("Name is required.")
        if not door_no:
            error_msgs.append("Door Number is required.")
        if not card_no:
            error_msgs.append("Card Number is required.")

        if error_msgs:
            preview_row.status_import = "error"
            preview_row.error_message = " ".join(error_msgs)
            errors += 1
        elif card_no in existing_cards:
            preview_row.status_import = "duplicate"
            preview_row.error_message = "Card number already exists."
            duplicates += 1
        else:
            preview_row.status_import = "new"
            valid += 1
            existing_cards.add(card_no)

        preview_data.append(preview_row)

    return ImportPreviewResponse(
        total_rows=total,
        valid_rows=valid,
        error_rows=errors,
        duplicate_rows=duplicates,
        data=preview_data
    )
