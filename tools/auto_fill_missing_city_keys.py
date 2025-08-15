import csv
import difflib
import unicodedata
import re
from pathlib import Path

try:
    import geonamescache
except Exception as e:
    print('geonamescache not available:', e)
    raise

ROOT = Path(__file__).resolve().parents[1]
MISSING = ROOT / 'new_site (1)' / 'database' / 'missing_city_keys.csv'
BACKUP = ROOT / 'new_site (1)' / 'database' / 'missing_city_keys.backup.csv'
OUT = ROOT / 'new_site (1)' / 'database' / 'missing_city_keys_filled.csv'

if not MISSING.exists():
    print('Missing keys CSV not found:', MISSING)
    raise SystemExit(1)

# normalize helper

def normalize(s):
    if not s:
        return ''
    s = s.strip().lower()
    s = unicodedata.normalize('NFKD', s)
    s = ''.join(c for c in s if not unicodedata.combining(c))
    s = re.sub(r"[^a-z0-9 ]+", ' ', s)
    s = re.sub(r"\s+", ' ', s).strip()
    return s

# build geonamescache indexes
gc = geonamescache.GeonamesCache()
cities = gc.get_cities()
countries = gc.get_countries()
# map country name normalized -> countrycode
country_name_to_code = {}
for code, info in countries.items():
    name = normalize(info.get('name') or '')
    country_name_to_code[name] = code
    # also map common variants
    if info.get('iso3'):
        country_name_to_code[normalize(info.get('iso3'))] = code

# add some manual variants
country_name_to_code.update({
    'usa': 'US', 'united states': 'US', 'united states of america': 'US', 'us': 'US',
    'uk': 'GB', 'united kingdom': 'GB', 'england': 'GB',
    'south korea': 'KR', 'north korea': 'KP'
})

# city index: normalized name + countrycode -> (lat, lon)
city_index = {}
country_to_city_names = {}
largest_by_country = {}
for cid, info in cities.items():
    name = normalize(info.get('name') or '')
    cc = (info.get('countrycode') or '').upper()
    lat = info.get('latitude')
    lon = info.get('longitude')
    if not name or not cc:
        continue
    city_index[(name, cc)] = (lat, lon)
    country_to_city_names.setdefault(cc, {})[name] = (lat, lon)
    try:
        pop = int(info.get('population') or 0)
    except Exception:
        pop = 0
    if cc not in largest_by_country or pop > largest_by_country[cc].get('population', 0):
        largest_by_country[cc] = dict(info)
        largest_by_country[cc]['population'] = pop

# read missing CSV
with MISSING.open(encoding='utf-8', newline='') as fh:
    reader = csv.DictReader(fh)
    headers = reader.fieldnames
    rows = list(reader)

filled = 0
filled_keys = 0
for r in rows:
    lat = (r.get('lat') or '').strip()
    lon = (r.get('lon') or '').strip()
    if lat and lon:
        continue
    city = (r.get('column-city') or '').strip()
    state = (r.get('column-state') or '').strip()
    country = (r.get('column-country') or '').strip()
    ncity = normalize(city)
    ncountry = normalize(country)
    cc = None
    if not ncountry:
        cc = None
    else:
        # direct lookup
        cc = country_name_to_code.get(ncountry.upper()) or country_name_to_code.get(ncountry)
        if not cc:
            # try close match among country names
            candidates = list(country_name_to_code.keys())
            m = difflib.get_close_matches(ncountry, candidates, n=1, cutoff=0.8)
            if m:
                cc = country_name_to_code.get(m[0])
    found = None
    # guess country code for common 'USA' variants in uppercase raw country
    raw_country = (r.get('column-country') or '').strip()
    if not cc and raw_country:
        keyu = raw_country.upper()
        if keyu in ('USA','US','UNITED STATES','UNITED STATES OF AMERICA'):
            cc = 'US'
        elif keyu in ('UK','UNITED KINGDOM','ENGLAND'):
            cc = 'GB'
    # 1) exact normalized match with country
    if ncity and cc:
        latlon = city_index.get((ncity, cc))
        if latlon:
            found = latlon
    # 2) close match within country
    if not found and ncity and cc and cc in country_to_city_names:
        names = list(country_to_city_names[cc].keys())
        m = difflib.get_close_matches(ncity, names, n=1, cutoff=0.78)
        if m:
            found = country_to_city_names[cc].get(m[0])
    # 3) global close match
    if not found and ncity:
        allnames = list({k for (k,_) in city_index.keys()})
        m = difflib.get_close_matches(ncity, allnames, n=1, cutoff=0.9)
        if m:
            # pick first matching name from any country
            for (nm, cc2), latlon2 in city_index.items():
                if nm == m[0]:
                    found = latlon2
                    break
    # 4) fallback to largest city in country
    if not found and cc and cc in largest_by_country:
        info = largest_by_country[cc]
        found = (info.get('latitude'), info.get('longitude'))
    if found:
        r['lat'] = str(found[0])
        r['lon'] = str(found[1])
        filled += 1
        # count unique keys filled
        # we'll approximate unique by counting when lat/lon were previously empty

# write backup and filled file
MISSING.rename(BACKUP)
with OUT.open('w', encoding='utf-8', newline='') as fh:
    writer = csv.DictWriter(fh, fieldnames=headers)
    writer.writeheader()
    writer.writerows(rows)

# copy filled back to original filename
OUT.replace(MISSING)

print('Auto-fill completed. Filled approx', filled, 'rows. Wrote', MISSING)
print('Backup of original saved as', BACKUP)
