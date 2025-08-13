import csv
import json
import zipfile
from pathlib import Path
import geonamescache

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
for c in _cities.values():
    key = (c['name'].lower(), c['countrycode'], c.get('admin1code', ''))
    _city_index[key] = c
    key2 = (c['name'].lower(), c['countrycode'], '')
    _city_index.setdefault(key2, c)
def _map_country(name: str):
    """Map various country name representations to ISO alpha-2 code."""
    if not name or name.lower() in {
        'unspecified', 'international waters', 'internatonal waters',
        'atlantic ocean', 'puerto rico/burmuda (between)'
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
    return None

def _find_coords(city: str, state: str, country_name: str):
    iso = _map_country(country_name)
    if not iso:
        return '', ''
    admin = ''
    if iso == 'US' and state:
        admin = state.upper()
    key = (city.lower(), iso, admin)
    c = _city_index.get(key)
    if not c and admin:
        key = (city.lower(), iso, '')
        c = _city_index.get(key)
    if not c:
        return '', ''
    return str(c['latitude']), str(c['longitude'])
# Read reports
with zipfile.ZipFile(ZIP_PATH) as z:
    with z.open(CSV_INSIDE_ZIP) as f:
        reader = csv.DictReader((line.decode('utf-8') for line in f))
        rows = list(reader)

# Geocode
for row in rows:
    lat, lon = _find_coords(row['column-city'], row['column-state'], row['column-country'])
    row['lat'], row['lon'] = lat, lon

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