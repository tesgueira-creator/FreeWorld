import csv
from collections import Counter
from pathlib import Path
p=Path(r"C:\Users\xenod\repo\FreeWorld\new_site (1)\database\nuforc-2025-07-02_with_coords.csv")
if not p.exists():
    print('MISSING', p)
    raise SystemExit(1)

total=0
shape=Counter()
country=Counter()
valid_coords=0
placeholder_coords=0
zero_coords=0
invalid_coords=0
missing_rows=[]
for row in csv.DictReader(p.open(newline='',encoding='utf-8')):
    total+=1
    shape[(row.get('column-shape') or '').strip() or 'Unknown']+=1
    country[(row.get('column-country') or '').strip() or 'Unspecified']+=1
    lat = row.get('latitude') if row.get('latitude') is not None else row.get('lat')
    lon = row.get('longitude') if row.get('longitude') is not None else row.get('lon')
    if lat is None or lon is None or lat.strip()=='' or lon.strip()=='':
        invalid_coords+=1
        missing_rows.append((row.get('column-city'), row.get('column-state'), row.get('column-country')))
        continue
    try:
        lf=float(lat); rf=float(lon)
        if lf==0 and rf==0:
            zero_coords+=1
        elif abs(lf-37.0902)<1e-6 and abs(rf+95.7129)<1e-6:
            placeholder_coords+=1
        elif -90<=lf<=90 and -180<=rf<=180:
            valid_coords+=1
        else:
            invalid_coords+=1
            missing_rows.append((row.get('column-city'), row.get('column-state'), row.get('column-country')))
    except Exception:
        invalid_coords+=1
        missing_rows.append((row.get('column-city'), row.get('column-state'), row.get('column-country')))

print(f"TOTAL_ROWS={total}")
print(f"VALID_COORDS={valid_coords}")
print(f"PLACEHOLDER_COORDS={placeholder_coords}")
print(f"ZERO_COORDS={zero_coords}")
print(f"INVALID_OR_MISSING_COORDS={invalid_coords}")
print('\nTop 7 shapes:')
for s,c in shape.most_common(7): print(f"  {s}: {c}")
print('\nTop 7 countries:')
for s,c in country.most_common(7): print(f"  {s}: {c}")
print('\nSample missing coord rows (up to 10):')
for r in missing_rows[:10]: print(f"  city={r[0]}, state={r[1]}, country={r[2]}")
