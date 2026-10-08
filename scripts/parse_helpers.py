# Python script to build 487 assigned schools dataset from the attached PDF OCR
import json
import re
import os
import random

# Coordinates dictionary for accurate clustering across Mysuru, Mandya, Hassan, Chamarajanagar, Kodagu
GEO_COORDS = {
    # Mysuru city areas
    "Bogadi": (12.3021, 76.6178),
    "TK Layout": (12.2985, 76.6201),
    "Kuvempunagar": (12.2858, 76.6267),
    "Saraswathipuram": (12.3075, 76.6325),
    "Vijayanagar": (12.3421, 76.6087),
    "Jayalakshmipuram": (12.3218, 76.6305),
    "Gokulam": (12.3325, 76.6342),
    "Hebbal": (12.3615, 76.6148),
    "Hootagalli": (12.3552, 76.5823),
    "Belavadi": (12.3512, 76.5789),
    "Belawadi": (12.3512, 76.5789),
    "JP Nagar": (12.2705, 76.6521),
    "J P Nagar": (12.2705, 76.6521),
    "Ramakrishna Nagar": (12.2905, 76.6189),
    "Dattagalli": (12.2831, 76.6062),
    "Srirampura": (12.2721, 76.6278),
    "Vidyaranyapuram": (12.2812, 76.6492),
    "Siddartha Layout": (12.3052, 76.6851),
    "Siddartha Nagar": (12.3052, 76.6851),
    "Bannimantap": (12.3385, 76.6512),
    "Alanahalli": (12.2989, 76.6991),
    "Yadavagiri": (12.3292, 76.6391),
    "Metagalli": (12.3489, 76.6212),
    "Lakshmipuram": (12.2965, 76.6412),
    "Chamarajapuram": (12.2991, 76.6445),
    "Yelwal": (12.3482, 76.5291),
    "Krishnamurthy Puram": (12.2978, 76.6398),
    "Niveditha Nagara": (12.2952, 76.6142),
    "Sharadadevi Nagar": (12.2921, 76.6115),
    "Roopa Nagar": (12.2941, 76.5982),
    "Lalithadripuram": (12.2912, 76.7082),
    "Kadakola": (12.2045, 76.6712),
    # Mysuru District Taluks
    "Hunsur": (12.3082, 76.2925),
    "Nanjangud": (12.1194, 76.6835),
    "K.R. Nagar": (12.4392, 76.3815),
    "KR Nagar": (12.4392, 76.3815),
    "H.D. Kote": (11.9832, 76.3142),
    "HD Kote": (11.9832, 76.3142),
    "Saragur": (11.9782, 76.3215),
    "T. Narasipura": (12.2125, 76.9042),
    "T Narasipura": (12.2125, 76.9042),
    "Periyapatna": (12.3415, 76.0982),
    "Bettadapura": (12.4512, 76.0421),
    "Bannur": (12.3312, 76.8645),
    "Salundi": (12.2415, 76.6112),
    "Hampapura": (12.1482, 76.4382),
    "Hullahalli": (12.0482, 76.5412),
    "Gundlupet": (11.8089, 76.6908),
    "Chamarajanagar": (11.9261, 76.9437),
    "Kollegal": (12.1558, 77.1189),
    # Mandya
    "Mandya": (12.5222, 76.8973),
    "Srirangapatna": (12.4225, 76.6948),
    "Pandavapura": (12.4985, 76.6698),
    "Maddur": (12.5841, 77.0452),
    "KM Doddi": (12.5182, 77.0125),
    "Malavalli": (12.3871, 77.0567),
    "Nagamangala": (12.8211, 76.7589),
    "K.R. Pete": (12.6591, 76.4952),
    "KR Pete": (12.6591, 76.4952),
    "Bellur": (12.9812, 76.7321),
    "Arakere": (12.4412, 76.8125),
    # Hassan
    "Hassan": (13.0033, 76.1004),
    "Channarayapatna": (12.9032, 76.3912),
    "Holenarasipura": (12.7885, 76.2789),
    "Arsikere": (13.3132, 76.2571),
    "Sakaleshpur": (12.9421, 75.7892),
    "Javagal": (13.3182, 76.0645),
    # Kodagu
    "Madikeri": (12.4244, 75.7382),
    "Kushalnagar": (12.4552, 75.9621),
    "Gonikoppal": (12.1812, 75.8032),
    "Virajpet": (12.1982, 75.8089),
    "Somwarapet": (12.5982, 75.8645),
    "Siddapur": (12.3112, 75.8892),
    "Napoklu": (12.3212, 75.7112)
}

def get_coords_for_school(area, district, address):
    # Try finding matching key in GEO_COORDS
    text = f"{area} {address} {district}"
    for key, (lat, lng) in GEO_COORDS.items():
        if key.lower() in text.lower():
            # Add small pseudo-random deterministic jitter (+/- 0.005) so schools don't stack on exact same spot
            jitter_lat = (hash(text) % 100 - 50) * 0.00008
            jitter_lng = ((hash(text) // 100) % 100 - 50) * 0.00008
            return round(lat + jitter_lat, 6), round(lng + jitter_lng, 6)
    
    # Default fallback to Bogadi/Mysuru
    return round(12.3021 + (hash(text) % 100 - 50) * 0.0001, 6), round(76.6178 + ((hash(text)//100) % 100 - 50) * 0.0001, 6)

def classify_opportunity_and_programme(school_name, board, school_type, category):
    name_type = f"{school_name} {school_type} {category}".lower()
    
    # Pre-school / Play-school / Nursery
    if any(w in name_type for w in ['play school', 'pre school', 'pre-school', 'nursery', 'kindergarten', 'montessori', 'kids', 'toddler']):
        opp = "D" if 'play' in name_type or 'pre' in name_type else "E"
        prog = "Junior Power Quest"
        has_nur, has_lkg, has_ukg, has_pri, has_sec = True, True, True, False, False
    elif any(w in name_type for w in ['international', 'public school', 'convent', 'central school', 'vidyalaya', 'academy', 'composite']):
        if 'international' in name_type or 'global' in name_type or 'world' in name_type:
            opp = "A"
        elif 'high school' in name_type or 'senior secondary' in name_type or 'composite' in name_type:
            opp = "B"
        else:
            opp = "C"
        
        if any(w in name_type for w in ['composite', 'integrated', 'secondary level', 'senior secondary level']):
            prog = "Both"
            has_nur, has_lkg, has_ukg, has_pri, has_sec = True, True, True, True, True
        else:
            prog = "MOM"
            has_nur, has_lkg, has_ukg, has_pri, has_sec = False, False, False, True, True
    else:
        opp = "C"
        prog = "MOM"
        has_nur, has_lkg, has_ukg, has_pri, has_sec = False, False, False, True, False

    return opp, prog, has_nur, has_lkg, has_ukg, has_pri, has_sec

print("Helper functions ready.")
