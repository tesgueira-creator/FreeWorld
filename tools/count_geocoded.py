import csv
from collections import Counter
from pathlib import Path
p = Path(__file__).resolve().parents[1] / 'new_site (1)' / 'database' / 'nuforc-2025-07-02_with_coords.csv'
if not p.exists():
    print('CSV not found:', p)
    raise SystemExit(1)

with p.open(encoding='utf-8') as fh:
    r = csv.DictReader(fh)
    total = 0
    both = 0
    lat_only = 0
    lon_only = 0
    none = 0
    missing = Counter()
    for row in r:
        total += 1
        lat = (row.get('lat') or '').strip()
        lon = (row.get('lon') or '').strip()
        if lat and lon:
            both += 1
        elif lat and not lon:
            lat_only += 1
        elif lon and not lat:
            lon_only += 1
        else:
            none += 1
        if not (lat and lon):
            city = (row.get('column-city') or '').strip()
            state = (row.get('column-state') or '').strip()
            country = (row.get('column-country') or '').strip()
            key = f"{city}, {state}, {country}"
            missing[key] += 1

print('TOTAL_ROWS:', total)
print('BOTH_LAT_LON:', both)
print('LAT_ONLY:', lat_only)
print('LON_ONLY:', lon_only)
print('NONE:', none)

print('\nTOP 30 CITIES MISSING COORDS:')
for city, count in missing.most_common(30):
    print(f'{count:4d}  {city}')
