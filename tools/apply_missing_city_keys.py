import csv
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
CSV_IN = ROOT / 'new_site (1)' / 'database' / 'nuforc-2025-07-02_with_coords.csv'
MISSING = ROOT / 'new_site (1)' / 'database' / 'missing_city_keys.csv'
CSV_OUT = ROOT / 'new_site (1)' / 'database' / 'nuforc-2025-07-02_with_coords_manual_filled.csv'

if not CSV_IN.exists():
    print('Input CSV not found:', CSV_IN)
    raise SystemExit(1)
if not MISSING.exists():
    print('Missing keys CSV not found:', MISSING)
    raise SystemExit(1)

# load mapping
mapping = {}
with MISSING.open(encoding='utf-8', newline='') as fh:
    reader = csv.DictReader(fh)
    for r in reader:
        city = (r.get('column-city') or '').strip()
        state = (r.get('column-state') or '').strip()
        country = (r.get('column-country') or '').strip()
        lat = (r.get('lat') or '').strip()
        lon = (r.get('lon') or '').strip()
        if lat and lon:
            mapping[(city, state, country)] = (lat, lon)

# apply
with CSV_IN.open(encoding='utf-8', newline='') as fh:
    reader = csv.DictReader(fh)
    headers = reader.fieldnames
    rows = list(reader)

applied = 0
for r in rows:
    lat = (r.get('lat') or '').strip()
    lon = (r.get('lon') or '').strip()
    if lat and lon:
        continue
    key = ((r.get('column-city') or '').strip(), (r.get('column-state') or '').strip(), (r.get('column-country') or '').strip())
    val = mapping.get(key)
    if val:
        r['lat'] = val[0]
        r['lon'] = val[1]
        applied += 1

with CSV_OUT.open('w', encoding='utf-8', newline='') as fh:
    writer = csv.DictWriter(fh, fieldnames=headers)
    writer.writeheader()
    writer.writerows(rows)

print('Applied', applied, 'rows and wrote', CSV_OUT)
