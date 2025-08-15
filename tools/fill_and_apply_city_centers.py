import csv
import difflib
import unicodedata
import re
from pathlib import Path
from collections import OrderedDict

try:
    import geonamescache
except Exception as e:
    print('geonamescache not available:', e)
    raise

ROOT = Path(__file__).resolve().parents[1]
CSV_IN = ROOT / 'new_site (1)' / 'database' / 'nuforc-2025-07-02_with_coords.csv'
CSV_OUT = ROOT / 'new_site (1)' / 'database' / 'nuforc-2025-07-02_with_coords_auto_filled.csv'

if not CSV_IN.exists():
    print('Input CSV not found:', CSV_IN)
    raise SystemExit(1)


def normalize(s):
    if not s:
        return ''
    s = s.strip().lower()
    s = unicodedata.normalize('NFKD', s)
    s = ''.join(c for c in s if not unicodedata.combining(c))
    s = re.sub(r"[^a-z0-9 ]+", ' ', s)
    s = re.sub(r"\s+", ' ', s).strip()
    return s

# build geonamescache index
gc = geonamescache.GeonamesCache()
cities = gc.get_cities()
# normalize per-country name -> (lat, lon)
index = {}
country_to_names = {}
for cid, info in cities.items():
    name = normalize(info.get('name') or '')
    cc = info.get('countrycode') or ''
    lat = info.get('latitude')
    lon = info.get('longitude')
    if not name or not cc:
        continue
    index.setdefault((name, cc.upper()), (lat, lon))
    country_to_names.setdefault(cc.upper(), {})[name] = (lat, lon)

rows = []
with CSV_IN.open(encoding='utf-8', newline='') as fh:
    reader = csv.DictReader(fh)
    headers = reader.fieldnames
    for r in reader:
        rows.append(r)

# find unique missing keys
missing_keys = OrderedDict()
for r in rows:
    lat = (r.get('lat') or '').strip()
    lon = (r.get('lon') or '').strip()
    if lat and lon:
        continue
    city = (r.get('column-city') or '').strip()
    state = (r.get('column-state') or '').strip()
    country = (r.get('column-country') or '').strip()
    key = (city, state, country)
    if key not in missing_keys:
        missing_keys[key] = None

print('Unique missing city keys:', len(missing_keys))

# attempt to fill
filled_map = {}
not_found = []
for (city, state, country) in missing_keys.keys():
    ncity = normalize(city)
    cc = (country or '').strip()
    cc_norm = cc.upper()
    latlon = None
    if ncity and cc_norm:
        # try exact
        latlon = index.get((ncity, cc_norm))
        # try close match within country
        if not latlon and cc_norm in country_to_names and ncity:
            names = list(country_to_names[cc_norm].keys())
            matches = difflib.get_close_matches(ncity, names, n=1, cutoff=0.78)
            if matches:
                latlon = country_to_names[cc_norm].get(matches[0])
        # try global close match
        if not latlon and ncity:
            allnames = [k for k,_ in index.keys()]
            matches = difflib.get_close_matches(ncity, allnames, n=1, cutoff=0.85)
            if matches:
                # pick first match with any country
                for (nm, cc2), latl in index.items():
                    if nm == matches[0]:
                        latlon = latl
                        break
    # fallback: try matching only city name ignoring country
    if not latlon and ncity:
        allnames = [k for k,_ in index.keys()]
        matches = difflib.get_close_matches(ncity, allnames, n=1, cutoff=0.9)
        if matches:
            for (nm, cc2), latl in index.items():
                if nm == matches[0]:
                    latlon = latl
                    break
    if latlon:
        filled_map[(city, state, country)] = latlon
    else:
        not_found.append((city, state, country))

print('Found coords for', len(filled_map), 'unique missing city keys')
print('Not found:', len(not_found))

# apply fills to rows
applied = 0
for r in rows:
    lat = (r.get('lat') or '').strip()
    lon = (r.get('lon') or '').strip()
    if lat and lon:
        continue
    key = ( (r.get('column-city') or '').strip(), (r.get('column-state') or '').strip(), (r.get('column-country') or '').strip() )
    latlon = filled_map.get(key)
    if latlon:
        r['lat'] = latlon[0]
        r['lon'] = latlon[1]
        applied += 1

# write new CSV
with CSV_OUT.open('w', encoding='utf-8', newline='') as fh:
    writer = csv.DictWriter(fh, fieldnames=headers)
    writer.writeheader()
    writer.writerows(rows)

print('Applied fills to', applied, 'rows')
print('Wrote', CSV_OUT)

# print top not found sample
print('\nSample cities still not found (up to 50):')
for i, k in enumerate(not_found[:50], start=1):
    print(f'{i:2d}: {k[0] or "(no city)"}, {k[1]}, {k[2]}')
