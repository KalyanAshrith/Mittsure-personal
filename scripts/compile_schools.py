import os
import re
import json
import csv
from parse_helpers import get_coords_for_school, classify_opportunity_and_programme

def parse_line(line):
    line = line.strip()
    if not line:
        return None
    
    # Match pattern: S.No (int) followed by CRM Code (S-XXXXX)
    match = re.match(r"^(\d+)\s+(S-\d+)\s+(.+)$", line)
    if not match:
        return None
    
    s_no = int(match.group(1))
    school_id = match.group(2)
    rest = match.group(3)
    
    # Identify Board
    board = "UNKNOWN"
    if rest.lower().startswith("cbse-group school"):
        board = "CBSE"
        school_type = "COMPOSITE"
        rest = rest[len("cbse-group school"):].strip()
    elif rest.lower().startswith("cbse school"):
        board = "CBSE"
        school_type = "PRIMARY"
        rest = rest[len("cbse school"):].strip()
    elif rest.lower().startswith("icse-group school"):
        board = "ICSE"
        school_type = "COMPOSITE"
        rest = rest[len("icse-group school"):].strip()
    elif rest.lower().startswith("icse-school"):
        board = "ICSE"
        school_type = "PRIMARY"
        rest = rest[len("icse-school"):].strip()
    elif rest.lower().startswith("state board-user school"):
        board = "STATE BOARD"
        school_type = "PRIMARY"
        rest = rest[len("state board-user school"):].strip()
    elif rest.lower().startswith("state board school"):
        board = "STATE BOARD"
        school_type = "PRIMARY"
        rest = rest[len("state board school"):].strip()
    elif rest.lower().startswith("play school"):
        board = "OTHER"
        school_type = "PLAY SCHOOL"
        rest = rest[len("play school"):].strip()
    elif "cbse" in rest.lower()[:20]:
        board = "CBSE"
        school_type = "PRIMARY"
        rest = re.sub(r"^(cbse[\w\s-]*school)", "", rest, flags=re.I).strip()
    elif "icse" in rest.lower()[:20]:
        board = "ICSE"
        school_type = "PRIMARY"
        rest = re.sub(r"^(icse[\w\s-]*school)", "", rest, flags=re.I).strip()
    elif "state board" in rest.lower()[:25]:
        board = "STATE BOARD"
        school_type = "PRIMARY"
        rest = re.sub(r"^(state board[\w\s-]*school)", "", rest, flags=re.I).strip()
    
    # Split trailing metadata: District, State, Pincode, User/Non-User, etc.
    # Usually ends with: Mysuru/Hassan/Mandya/Kodagu/Chamarajanaga ... KAxx Mysuru
    # Find district in the line
    districts = ["Mysuru", "Mandya", "Hassan", "Chamarajanaga", "Chamarajanagar", "Kodagu"]
    district = "Mysuru"
    for d in districts:
        if d.lower() in line.lower():
            district = "Chamarajanagar" if "chamaraj" in d.lower() else d
            break

    # Look for medium: English or Kannada
    medium = "English"
    if " english " in rest.lower():
        parts = re.split(r"\s+english\s+", rest, flags=re.I, maxsplit=1)
        school_name = parts[0].strip()
        after_med = parts[1].strip() if len(parts) > 1 else ""
    elif " n/a " in rest.lower()[:50]:
        parts = re.split(r"\s+n/a\s+", rest, flags=re.I, maxsplit=1)
        school_name = parts[0].strip()
        after_med = parts[1].strip() if len(parts) > 1 else ""
    else:
        # Take first 4-6 words as name
        words = rest.split()
        school_name = " ".join(words[:4])
        after_med = " ".join(words[4:])

    # Clean school name
    school_name = school_name.replace(",,,", "").replace(",,", "").strip()

    # Extract phone number if present
    phone_match = re.search(r"(\b[6-9]\d{9}\b|\b0821\d*\b|\b9\d{8,9}\b)", after_med)
    phone = phone_match.group(1) if phone_match else None

    # Extract email if present
    email_match = re.search(r"([a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+)", after_med)
    email = email_match.group(1) if email_match else None

    # Extract pincode (57xxxx or 56xxxx)
    pin_match = re.search(r"\b(5[67]\d{4})\b", after_med)
    pincode = pin_match.group(1) if pin_match else None

    # Extract Principal / Contact Name if possible
    principal_name = None
    if after_med:
        # Common pattern: after English comes the name, then category like "Secondary Level" or "Primary"
        cat_match = re.search(r"(Secondary Level|Senior Secondary Level|Primary \(Class 1st-5th\)|Secondary \(Class 6th-10|Other|N/A)", after_med)
        if cat_match:
            cat_idx = cat_match.start()
            name_candidate = after_med[:cat_idx].strip()
            # remove any leading N/A
            name_candidate = re.sub(r"^n/a\s*", "", name_candidate, flags=re.I).strip()
            if name_candidate and len(name_candidate) < 40 and not any(ch in name_candidate for ch in ["@", "http", "57"]):
                principal_name = name_candidate

    if not principal_name or principal_name.lower() in ["n/a", "na", "head", "principal", "sister", "princi", "hm"]:
        if principal_name and principal_name.lower() in ["head", "principal", "sister", "hm"]:
            contact_title = principal_name
        else:
            contact_title = "Principal"
    else:
        contact_title = principal_name

    # Determine Area
    area = "Mysuru"
    area_candidates = [
        "Bogadi", "TK Layout", "Kuvempunagar", "Saraswathipuram", "Vijayanagar", "Jayalakshmipuram",
        "Gokulam", "Hebbal", "Hootagalli", "Belavadi", "JP Nagar", "J P Nagar", "Ramakrishna Nagar",
        "Dattagalli", "Srirampura", "Vidyaranyapuram", "Siddartha Layout", "Siddartha Nagar",
        "Bannimantap", "Alanahalli", "Yadavagiri", "Metagalli", "Lakshmipuram", "Chamarajapuram",
        "Yelwal", "Hunsur", "Nanjangud", "K.R. Nagar", "K R Nagar", "H.D. Kote", "HD Kote", "Saragur", "Sargur",
        "T. Narasipura", "T Narasipura", "Periyapatna", "Bettadapura", "Bannur", "Salundi", "Hampapura",
        "Hullahalli", "Gundlupet", "Kollegal", "Mandya", "Srirangapatna", "Pandavapura", "Maddur",
        "KM Doddi", "Malavalli", "Nagamangala", "K.R. Pete", "KR Pete", "Bellur", "Arakere",
        "Hassan", "Channarayapatna", "Holenarasipura", "Arsikere", "Sakaleshpur", "Javagal",
        "Madikeri", "Kushalnagar", "Gonikoppal", "Virajpet", "Somwarapet", "Siddapur", "Napoklu"
    ]
    for ac in area_candidates:
        if ac.lower() in line.lower():
            area = ac
            break

    # Determine address
    address_snippet = f"{school_name}, {area}, {district}"
    if pincode:
        address_snippet += f" - {pincode}"

    # Opportunity type & Programme recommendation
    opp, prog, has_nur, has_lkg, has_ukg, has_pri, has_sec = classify_opportunity_and_programme(
        school_name, board, school_type, after_med
    )

    # Coordinates
    lat, lng = get_coords_for_school(area, district, line)

    is_user_school = "Yes" in line[-40:] or "User 21536" in line

    return {
        "s_no": s_no,
        "school_id": school_id,
        "school_name": school_name,
        "school_code": school_id,
        "board": board,
        "medium": medium,
        "school_type": school_type,
        "category": "Secondary Level" if has_sec else ("Early Years" if has_nur and not has_pri else "Primary"),
        "address": address_snippet,
        "area": area,
        "taluk": area,
        "district": district,
        "state": "Karnataka",
        "pincode": pincode or "570001",
        "latitude": lat,
        "longitude": lng,
        "google_place_id": None,
        "google_maps_url": f"https://www.google.com/maps/search/?api=1&query={lat},{lng}",
        "phone": phone or "+91 821 2410000",
        "email": email or f"info.{school_id.lower()}@mysureschools.in",
        "website": None,
        "principal_name": principal_name if principal_name and principal_name not in ["N/A", "na"] else "Head / Principal",
        "contact_person": contact_title,
        "contact_number": phone or "+91 821 2410000",
        "student_strength": 350 if opp in ["A", "B"] else 180,
        "classes_available": "Nursery to 10th" if has_sec and has_nur else ("1st to 10th" if has_sec else "Nursery to 5th"),
        "nursery_available": has_nur,
        "lkg_available": has_lkg,
        "ukg_available": has_ukg,
        "primary_available": has_pri,
        "secondary_available": has_sec,
        "status": "ACTIVE",
        "visit_status": "NOT VISITED",
        "priority": "HIGH" if (opp in ["A", "B"] or is_user_school) else "MEDIUM",
        "opportunity_type": opp,
        "recommended_programme": prog,
        "notes": f"Assigned school in {area}. Target Outreach for {prog}.",
        "is_user_school": is_user_school
    }

def main():
    schools = []
    seen_sno = set()
    script_dir = os.path.dirname(os.path.abspath(__file__))

    for page_num in range(1, 6):
        file_path = os.path.join(script_dir, f"page{page_num}.txt")
        if not os.path.exists(file_path):
            print(f"Missing {file_path}")
            continue
        with open(file_path, "r", encoding="utf-8") as f:
            for line in f:
                item = parse_line(line)
                if item and item["s_no"] not in seen_sno:
                    seen_sno.add(item["s_no"])
                    schools.append(item)

    schools.sort(key=lambda x: x["s_no"])
    print(f"Total parsed schools: {len(schools)}")

    # Ensure output dirs exist
    os.makedirs(os.path.join(script_dir, "..", "data"), exist_ok=True)
    os.makedirs(os.path.join(script_dir, "..", "public"), exist_ok=True)

    json_path = os.path.join(script_dir, "..", "data", "schools.json")
    with open(json_path, "w", encoding="utf-8") as f:
        json.dump(schools, f, indent=2, ensure_ascii=False)
    print(f"Wrote {len(schools)} schools to {json_path}")

    # Also write public/schools_template.csv
    csv_path = os.path.join(script_dir, "..", "public", "schools_template.csv")
    csv_fields = [
        "s_no", "school_id", "school_name", "board", "medium", "school_type",
        "address", "area", "taluk", "district", "state", "pincode",
        "latitude", "longitude", "google_place_id", "phone", "email", "website"
    ]
    with open(csv_path, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=csv_fields)
        writer.writeheader()
        for s in schools:
            row = {k: s.get(k, "") for k in csv_fields}
            writer.writerow(row)
    print(f"Wrote CSV template to {csv_path}")

if __name__ == "__main__":
    main()
