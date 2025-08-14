import { parseDateTime } from './utils.js';

let originalData = [];
let renderCallback = () => {};

export function initializeFilters(data, onApply) {
  originalData = data;
  renderCallback = onApply;

  const startInput = document.getElementById('startDate');
  const endInput = document.getElementById('endDate');
  const shapeSelect = document.getElementById('shapeSelect');
  const countrySelect = document.getElementById('countrySelect');
  const applyBtn = document.getElementById('applyFilters');
  const resetBtn = document.getElementById('resetFilters');
  if (!startInput || !endInput || !shapeSelect || !countrySelect) return;

  // Find min and max dates in the dataset
  let minDate = null;
  let maxDate = null;
  originalData.forEach((row) => {
    const occDate = parseDateTime(row['column-occurred']);
    if (occDate) {
      const iso = occDate.toISOString().substring(0, 10);
      if (!minDate || iso < minDate) minDate = iso;
      if (!maxDate || iso > maxDate) maxDate = iso;
    }
  });
  if (minDate) startInput.min = minDate;
  if (maxDate) endInput.max = maxDate;

  // Populate shapes (unique, sorted)
  const shapeSet = new Set();
  originalData.forEach((row) => {
    const shape = row['column-shape'] && row['column-shape'].trim() ? row['column-shape'].trim() : 'Unknown';
    shapeSet.add(shape);
  });
  const shapes = Array.from(shapeSet).sort((a, b) => a.localeCompare(b));
  shapes.forEach((shape) => {
    const option = document.createElement('option');
    option.value = shape;
    option.textContent = shape;
    shapeSelect.appendChild(option);
  });

  // Populate countries (unique, sorted). Add default blank option for "All".
  const countrySet = new Set();
  originalData.forEach((row) => {
    const country = row['column-country'] && row['column-country'].trim() ? row['column-country'].trim() : 'Unspecified';
    countrySet.add(country);
  });
  const countries = Array.from(countrySet).sort((a, b) => a.localeCompare(b));
  const defaultOpt = document.createElement('option');
  defaultOpt.value = '';
  defaultOpt.textContent = 'All';
  countrySelect.appendChild(defaultOpt);
  countries.forEach((country) => {
    const option = document.createElement('option');
    option.value = country;
    option.textContent = country;
    countrySelect.appendChild(option);
  });

  // Apply filters when clicking the apply button
  applyBtn.addEventListener('click', () => {
    applyFilters();
  });
  // Reset filters to defaults
  resetBtn.addEventListener('click', () => {
    // Clear all inputs
    startInput.value = '';
    endInput.value = '';
    Array.from(shapeSelect.options).forEach((opt) => (opt.selected = false));
    countrySelect.value = '';
    applyFilters();
  });
}

/**
 * Retrieve the currently filtered subset of data based on the selections in
 * the filter controls. Filters by date range, selected shapes and single
 * country. If no filters are applied for a given dimension, all values
 * pass through.
 * @returns {Array<Object>} The filtered dataset
 */
function getFilteredData() {
  const startInput = document.getElementById('startDate');
  const endInput = document.getElementById('endDate');
  const shapeSelect = document.getElementById('shapeSelect');
  const countrySelect = document.getElementById('countrySelect');
  const startVal = startInput && startInput.value ? startInput.value : null;
  const endVal = endInput && endInput.value ? endInput.value : null;
  const selectedShapes = shapeSelect ? Array.from(shapeSelect.selectedOptions).map((opt) => opt.value) : [];
  const selectedCountry = countrySelect ? countrySelect.value : '';

  return originalData.filter((row) => {
    // Date filter: occurred date must be within range if specified
    if (startVal || endVal) {
      const occDate = parseDateTime(row['column-occurred']);
      if (!occDate) return false;
      const iso = occDate.toISOString().substring(0, 10);
      if (startVal && iso < startVal) return false;
      if (endVal && iso > endVal) return false;
    }
    // Shape filter: if any selected shapes, row.shape must be in list
    if (selectedShapes && selectedShapes.length) {
      const shape = row['column-shape'] && row['column-shape'].trim() ? row['column-shape'].trim() : 'Unknown';
      if (!selectedShapes.includes(shape)) return false;
    }
    // Country filter: if specified and non-empty, row.country must match
    if (selectedCountry) {
      const country = row['column-country'] && row['column-country'].trim() ? row['column-country'].trim() : 'Unspecified';
      if (country !== selectedCountry) return false;
    }
    return true;
  });
}

/**
 * Apply the current filter selections and re-render the entire dashboard
 * based on the filtered dataset. Called when the user clicks the apply
 * button or when a cross‑filter is triggered via bar chart clicks.
 */
function applyFilters() {
  const filtered = getFilteredData();
  renderCallback(filtered);
}

/**
 * Set the selected shape programmatically and apply filters. Clears any
 * previous shape selections before applying. Called when a bar in the
 * shape charts is clicked.
 * @param {string} shape The shape to filter by
 */
export function setShapeFilter(shape) {
  const shapeSelect = document.getElementById('shapeSelect');
  if (!shapeSelect) return;
  Array.from(shapeSelect.options).forEach((opt) => {
    opt.selected = (opt.value === shape);
  });
  applyFilters();
}

/**
 * Set the selected country programmatically and apply filters. Called when
 * a bar in the country charts is clicked.
 * @param {string} country The country to filter by
 */
export function setCountryFilter(country) {
  const countrySelect = document.getElementById('countrySelect');
  if (!countrySelect) return;
  countrySelect.value = country;
  applyFilters();
}

