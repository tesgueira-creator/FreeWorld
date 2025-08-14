import { createChartCards, initChartDescriptions, setupPagination, renderDashboard } from './charts.js';
import { initializeFilters } from './filters.js';

let originalData = [];

async function fetchSightingsData() {
  const res = await fetch('database/nuforc-2025-07-02_with_coords.csv');
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
    originalData = await fetchSightingsData();
    initializeFilters(originalData, renderDashboard);
    createChartCards();
    await renderDashboard(originalData);
    initChartDescriptions();
    setupPagination();
  } catch (err) {
    console.error('Failed to load sightings data', err);
  }
});
