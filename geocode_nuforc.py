import csv
import json
import zipfile
from pathlib import Path
import geonamescache
import unicodedata
import re
import difflib
import time
import requests

# Paths
ZIP_PATH = Path('answer (1).zip')
CSV_INSIDE_ZIP = 'database/nuforc-2025-07-02.csv'
OUTPUT_CSV = Path("new_site (1)/database/nuforc-2025-07-02_with_coords.csv")
OUTPUT_JS = Path("new_site (1)/database/nuforc-with-coords.js")

# Load geonames data
_gc = geonamescache.GeonamesCache()
_cities = _gc.get_cities()
_countries = _gc.get_countries()
_us_states = _gc.get_us_states()

# Build city index for quick lookup
_city_index = {}
_city_index_norm = {}

def _normalize(s: str):
    if not s:
        return ''
    s = unicodedata.normalize('NFKD', s)
    s = s.encode('ascii', 'ignore').decode('ascii')
    s = s.lower()
    s = re.sub(r"[^a-z0-9\s]", '', s)
    s = re.sub(r"\s+", ' ', s).strip()
    return s

for c in _cities.values():
    name = c['name'] or ''
    country = c['countrycode'] or ''
    admin = c.get('admin1code', '')
    key = (name.lower(), country, admin)
    _city_index[key] = c
    key2 = (name.lower(), country, '')
    _city_index.setdefault(key2, c)

    # normalized index for fuzzy matching
    nkey = (_normalize(name), country, admin)
    _city_index_norm[nkey] = c
    nkey2 = (_normalize(name), country, '')
    _city_index_norm.setdefault(nkey2, c)

# Build per-country normalized name list for close-match lookups and find largest city per country
_country_city_names = {}
_largest_city_by_country = {}
for c in _cities.values():
    country = c['countrycode']
    nname = _normalize(c['name'] or '')
    if country not in _country_city_names:
        _country_city_names[country] = {}
    _country_city_names[country][nname] = c
    # track largest by population if available
    try:
        pop = int(c.get('population') or 0)
    except Exception:
        pop = 0
    if country not in _largest_city_by_country or pop > _largest_city_by_country[country].get('population', 0):
        # store population as int for later comparisons
        _largest_city_by_country[country] = dict(c)
        _largest_city_by_country[country]['population'] = pop
def _map_country(name: str):
    """Map various country name representations to ISO alpha-2 code."""
    if not name:
        return None
    lower = name.strip().lower()
    if lower in {
        'unspecified', 'international waters', 'internatonal waters',
        'atlantic ocean', 'puerto rico/burmuda (between)', 'unknown'
    }:
        return None
    # direct code
    if name in _countries:
        return name
    # match by official name
    for code, data in _countries.items():
        if name.lower() == data['name'].lower():
            return code
        if name.upper() == data.get('iso3', '').upper():
            return code
    # common mappings
    common = {
        'usa': 'US', 'us': 'US', 'u.s.': 'US', 'united states': 'US', 'united states of america': 'US',
        'uk': 'GB', 'united kingdom': 'GB', 'england': 'GB', 'scotland': 'GB', 'wales': 'GB',
        'south korea': 'KR', 'north korea': 'KP'
    }
    if lower in common:
        return common[lower]
    return None

def _find_coords(city: str, state: str, country_name: str):
    iso = _map_country(country_name)
    if not iso:
        # try to fall back by checking if country_name looks like a code
        iso = _map_country((country_name or '').upper())
    if not iso:
        return '', ''

    admin = ''
    if state:
        admin = state.strip()
        # common: if state seems like abbreviation, use upper; else normalize
        if len(admin) <= 3:
            admin = admin.upper()
        else:
            admin = admin

    # 1) Exact match by raw city, country, admin
    key = (city.lower() if city else '', iso, admin)
    c = _city_index.get(key)
    # 2) city + country only
    if not c and city:
        key2 = (city.lower(), iso, '')
        c = _city_index.get(key2)
    # 3) normalized city match
    if not c and city:
        nkey = (_normalize(city), iso, admin)
        c = _city_index_norm.get(nkey)
    if not c and city:
        nkey2 = (_normalize(city), iso, '')
        c = _city_index_norm.get(nkey2)
    # 4) fuzzy contains: search cities in same country whose normalized name contains the normalized city
    if not c and city:
        ncity = _normalize(city)
        for k, v in _city_index_norm.items():
            kname, kcountry, kadmin = k
            if kcountry != iso:
                continue
            if ncity and (kname == ncity or ncity in kname or kname in ncity):
                c = v
                break

    # 5) close-string match using difflib on normalized city names within the country
    if not c and city and iso in _country_city_names:
        ncity = _normalize(city)
        candidates = list(_country_city_names[iso].keys())
        matches = difflib.get_close_matches(ncity, candidates, n=1, cutoff=0.78)
        if matches:
            c = _country_city_names[iso].get(matches[0])

    # 6) fallback to country's largest city (approximate)
    if not c:
        largest = _largest_city_by_country.get(iso)
        if largest:
            c = largest

    if not c:
        return str(c['latitude']), str(c['longitude'])
    return str(c['latitude']), str(c['longitude'])
# Read reports
with zipfile.ZipFile(ZIP_PATH) as z:
    with z.open(CSV_INSIDE_ZIP) as f:
        reader = csv.DictReader((line.decode('utf-8') for line in f))
        rows = list(reader)

# Geocode with fuzzy matching and collect stats
total = len(rows)
already_had = 0
filled = 0
for row in rows:
    existing_lat = (row.get('lat') or '').strip()
    existing_lon = (row.get('lon') or '').strip()
    if existing_lat and existing_lon:
        already_had += 1
        continue
    lat, lon = _find_coords(row.get('column-city'), row.get('column-state'), row.get('column-country'))
    if lat and lon:
        row['lat'], row['lon'] = lat, lon
        filled += 1
    else:
        # leave empty
        row['lat'], row['lon'] = existing_lat, existing_lon

print(f"Geocoding complete: {total} rows, already had coords: {already_had}, newly filled: {filled}")

# Remaining rows: try Nominatim (OpenStreetMap) as a fallback for remaining empty coords
def _nominatim_query(q):
    url = 'https://nominatim.openstreetmap.org/search'
    params = {'q': q, 'format': 'json', 'limit': 1, 'addressdetails': 0}
    headers = {'User-Agent': 'FreeWorld-Geocoder/1.0 (your-email@example.com)'}
    try:
        r = requests.get(url, params=params, headers=headers, timeout=10)
        r.raise_for_status()
        data = r.json()
        if data and isinstance(data, list) and len(data) > 0:
            return data[0].get('lat'), data[0].get('lon')
    except Exception as e:
        print('Nominatim error for query', q, e)
    return None, None

nominatim_filled = 0
if filled < total:
    print('Attempting Nominatim fallback for remaining rows (rate-limited)')
    for idx, row in enumerate(rows):
        lat = (row.get('lat') or '').strip()
        lon = (row.get('lon') or '').strip()
        if lat and lon:
            continue
        # build a query from city, state, country
        parts = []
        if row.get('column-city'):
            parts.append(row.get('column-city'))
        if row.get('column-state'):
            parts.append(row.get('column-state'))
        if row.get('column-country'):
            parts.append(row.get('column-country'))
        q = ', '.join(parts)
        if not q:
            continue
        nlat, nlon = _nominatim_query(q)
        if nlat and nlon:
            row['lat'], row['lon'] = nlat, nlon
            nominatim_filled += 1
        # polite rate limit: 1 request per second
        time.sleep(1.1)

    print(f'Nominatim filled: {nominatim_filled} additional rows')

# Write CSV
OUTPUT_CSV.parent.mkdir(parents=True, exist_ok=True)
with OUTPUT_CSV.open('w', newline='', encoding='utf-8') as f:
    fieldnames = list(rows[0].keys())
    writer = csv.DictWriter(f, fieldnames=fieldnames)
    writer.writeheader()
    for row in rows:
        writer.writerow(row)

# Write JS
with OUTPUT_JS.open('w', encoding='utf-8') as f:
    f.write('var nuforcData = ')
    json.dump(rows, f, indent=2)
    f.write(';\n')