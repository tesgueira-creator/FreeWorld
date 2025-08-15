import csv
from pathlib import Path
p = Path(__file__).resolve().parents[1] / 'new_site (1)' / 'database' / 'nuforc-2025-07-02_with_coords_manual_filled.csv'
if not p.exists():
    print('File not found:', p)
    raise SystemExit(1)

with p.open(encoding='utf-8') as fh:
    r = csv.DictReader(fh)
    total = 0
    both = 0
    none = 0
    for row in r:
        total += 1
        lat = (row.get('lat') or '').strip()
        lon = (row.get('lon') or '').strip()
        if lat and lon:
            both += 1
        else:
            none += 1

print('TOTAL_ROWS:', total)
print('BOTH_LAT_LON:', both)
print('NONE:', none)
