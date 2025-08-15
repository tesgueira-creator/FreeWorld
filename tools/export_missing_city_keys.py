import csv
from collections import Counter
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
CSV_IN = ROOT / 'new_site (1)' / 'database' / 'nuforc-2025-07-02_with_coords.csv'
CSV_OUT = ROOT / 'new_site (1)' / 'database' / 'missing_city_keys.csv'

if not CSV_IN.exists():
    print('Input CSV not found:', CSV_IN)
    raise SystemExit(1)

counter = Counter()
with CSV_IN.open(encoding='utf-8', newline='') as fh:
    reader = csv.DictReader(fh)
    for r in reader:
        lat = (r.get('lat') or '').strip()
        lon = (r.get('lon') or '').strip()
        if lat and lon:
            continue
        city = (r.get('column-city') or '').strip()
        state = (r.get('column-state') or '').strip()
        country = (r.get('column-country') or '').strip()
        key = (city, state, country)
        counter[key] += 1

# write CSV header: city,state,country,count,lat,lon (lat/lon empty for you to fill)
with CSV_OUT.open('w', encoding='utf-8', newline='') as fh:
    writer = csv.writer(fh)
    writer.writerow(['column-city','column-state','column-country','count','lat','lon'])
    for (city,state,country), count in counter.most_common():
        writer.writerow([city, state, country, count, '', ''])

print('Wrote', CSV_OUT, 'with', len(counter), 'unique keys')
