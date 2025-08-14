let originalData = [];

async function fetchSightingsData() {
  const url = new URL('./database/nuforc-2025-07-02_with_coords.csv', import.meta.url);
  const res = await fetch(url);
  const text = await res.text();
  return parseCsv(text);
}

function parseCsv(text) {
  const lines = text.trim().split(/\r?\n/);
  const headers = lines[0].split(',');
  return lines.slice(1).filter(Boolean).map((line) => {
    const values = [];
    let current = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        if (inQuotes && line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === ',' && !inQuotes) {
        values.push(current);
        current = '';
      } else {
        current += char;
      }
    }
    values.push(current);
    const obj = {};
    headers.forEach((h, idx) => {
      obj[h] = values[idx] !== undefined ? values[idx] : '';
    });
    return obj;
  });
}

document.addEventListener('DOMContentLoaded', async () => {
  try {
    const [charts, filters] = await Promise.all([
      import('./charts.js'),
      import('./filters.js')
    ]);

    originalData = await fetchSightingsData();
    filters.initializeFilters(originalData, charts.renderDashboard);
    charts.createChartCards();
    await charts.renderDashboard(originalData);
    charts.initChartDescriptions();
    charts.setupPagination();
  } catch (err) {
    console.error('Failed to load sightings data', err);
  }
});
