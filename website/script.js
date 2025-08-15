//
// script.js
//
// This file powers the dynamic portions of the Alien Encounters website.
// It loads the UFO sightings CSV, populates the interactive data table,
// computes aggregate statistics and renders charts using lightweight
// DOM elements. When modifying this file, take care to keep functions
// modular and avoid polluting the global namespace.

document.addEventListener('DOMContentLoaded', () => {
  // Mobile menu functionality
  const menuToggle = document.querySelector('.menu-toggle');
  const navLinks = document.querySelector('.nav-links');
  
  if (menuToggle && navLinks) {
    menuToggle.addEventListener('click', () => {
      navLinks.classList.toggle('active');
    });
    
    // Close menu when clicking on a link
    navLinks.addEventListener('click', (e) => {
      if (e.target.tagName === 'A') {
        navLinks.classList.remove('active');
      }
    });
    
    // Close menu when clicking outside
    document.addEventListener('click', (e) => {
      if (!menuToggle.contains(e.target) && !navLinks.contains(e.target)) {
        navLinks.classList.remove('active');
      }
    });
  }
  
  // Use the globally defined nuforcData array provided by nuforc-2025-07-02.js
  if (typeof nuforcData !== 'undefined') {
    initializeTable(nuforcData);
    computeCharts(nuforcData);
  } else {
    console.error('nuforcData is not defined');
  }
  // Create a reusable tooltip element for charts and tables
  const tooltip = document.createElement('div');
  tooltip.className = 'tooltip';
  document.body.appendChild(tooltip);
  window.globalTooltip = tooltip;
});

/**
 * Initialise the DataTable with parsed data.
 * @param {Array<Object>} data Array of sighting objects parsed from the CSV
 */
function initializeTable(data) {
  // Persist the raw data and state variables
  const tableHead = document.getElementById('tableHead');
  const tableBody = document.getElementById('tableBody');
  const searchInput = document.getElementById('searchInput');
  const rowsSelect = document.getElementById('rowsPerPage');
  const prevBtn = document.getElementById('prevPage');
  const nextBtn = document.getElementById('nextPage');
  const pageInfo = document.getElementById('pageInfo');
  // Grab filter elements and expose globally for chart interactions
  const shapeFilter = document.getElementById('shapeFilter');
  const countryFilter = document.getElementById('countryFilter');
  window.shapeFilterEl = shapeFilter;
  window.countryFilterEl = countryFilter;
  // Copy of data
  const original = data.slice();
  let filtered = original.slice();
  let currentPage = 1;
  let rowsPerPage = parseInt(rowsSelect.value, 10);
  let sortKey = null;
  let sortAsc = true;
  // Column keys and readable titles mapping
  const columns = [
    { key: 'expand href', title: 'Report' },
    { key: 'column-occurred', title: 'Occurred' },
    { key: 'column-city', title: 'City' },
    { key: 'column-state', title: 'State' },
    { key: 'column-country', title: 'Country' },
    { key: 'column-shape', title: 'Shape' },
    { key: 'column-summary', title: 'Summary' },
    { key: 'column-reported', title: 'Reported' },
    { key: 'column-hasimage', title: 'Image' },
    { key: 'column-explanation', title: 'Explanation' }
  ];
  // Define a colour palette for mapping shapes to colours
  const palette = [
    '#3b82f6',
    '#6366f1',
    '#14b8a6',
    '#f97316',
    '#eab308',
    '#ec4899',
    '#8b5cf6',
    '#10b981',
    '#0ea5e9',
    '#f43f5e',
    '#3f3f46',
    '#0f766e',
    '#b45309',
    '#7e22ce'
  ];
  // Compute unique shapes and countries to populate filters and build a colour map
  const shapeSet = new Set();
  const countrySet = new Set();
  original.forEach((row) => {
    const shp = row['column-shape'] && row['column-shape'].trim() ? row['column-shape'].trim() : 'Unknown';
    shapeSet.add(shp);
    const ctry = row['column-country'] && row['column-country'].trim() ? row['column-country'].trim() : 'Unspecified';
    countrySet.add(ctry);
  });
  const uniqueShapes = Array.from(shapeSet).sort();
  const uniqueCountries = Array.from(countrySet).sort();
  // Populate filters
  uniqueShapes.forEach((shp) => {
    const option = document.createElement('option');
    option.value = shp;
    option.textContent = shp;
    shapeFilter.appendChild(option);
  });
  uniqueCountries.forEach((ctry) => {
    const option = document.createElement('option');
    option.value = ctry;
    option.textContent = ctry;
    countryFilter.appendChild(option);
  });
  // Build a colour map for shapes
  window.shapeColorMap = {};
  uniqueShapes.forEach((shp, idx) => {
    window.shapeColorMap[shp] = palette[idx % palette.length];
  });
  // Build table header
  function buildHeader() {
    const tr = document.createElement('tr');
    columns.forEach((col) => {
      const th = document.createElement('th');
      th.textContent = col.title;
      th.dataset.key = col.key;
      th.addEventListener('click', () => {
        if (sortKey === col.key) {
          sortAsc = !sortAsc;
        } else {
          sortKey = col.key;
          sortAsc = true;
        }
        // Update sort indicators
        Array.from(tableHead.querySelectorAll('th')).forEach((header) => {
          header.classList.remove('sort-asc', 'sort-desc');
        });
        th.classList.add(sortAsc ? 'sort-asc' : 'sort-desc');
        applyFilters();
      });
      tr.appendChild(th);
    });
    tableHead.appendChild(tr);
  }
  // Render table body based on current page and filtered data
  function renderTable() {
    tableBody.innerHTML = '';
    const start = (currentPage - 1) * rowsPerPage;
    const end = start + rowsPerPage;
    const pageData = filtered.slice(start, end);
    pageData.forEach((row) => {
      const tr = document.createElement('tr');
      columns.forEach((col) => {
        const td = document.createElement('td');
        let cell = row[col.key] || '';
        if (col.key === 'expand href') {
          // Link to full report
          if (cell && cell.trim()) {
            const a = document.createElement('a');
            a.href = cell;
            a.innerHTML = 'View <i class="fa-solid fa-arrow-up-right-from-square"></i>';
            a.target = '_blank';
            a.rel = 'noopener noreferrer';
            td.appendChild(a);
          } else {
            td.textContent = '-';
          }
        } else if (col.key === 'column-shape') {
          // Show coloured tag for shape
          const span = document.createElement('span');
          span.className = 'tag';
          span.textContent = cell || 'Unknown';
          const colour = window.shapeColorMap && window.shapeColorMap[cell]
            ? window.shapeColorMap[cell]
            : '#6b7280';
          span.style.backgroundColor = colour;
          td.appendChild(span);
        } else if (col.key === 'column-hasimage') {
          // Indicate whether the report includes an image with an icon
          const hasImg = cell && cell.toString().toLowerCase().startsWith('y');
          const icon = document.createElement('i');
          icon.className = hasImg ? 'fa-solid fa-image' : 'fa-solid fa-ban';
          icon.style.color = hasImg ? '#22c55e' : '#ef4444';
          td.style.textAlign = 'center';
          td.appendChild(icon);
        } else if (col.key === 'column-explanation') {
          // Explanation field may be empty; if present, render as muted text
          td.textContent = cell || '-';
          td.style.fontStyle = 'italic';
          td.style.opacity = '0.8';
        } else {
          td.textContent = cell;
        }
        tr.appendChild(td);
      });
      tableBody.appendChild(tr);
    });
    // Update pagination info and button states
    const totalPages = Math.ceil(filtered.length / rowsPerPage) || 1;
    pageInfo.textContent = `Page ${currentPage} of ${totalPages}`;
    prevBtn.disabled = currentPage <= 1;
    nextBtn.disabled = currentPage >= totalPages;
  }
  // Apply search filter and sorting, then re-render
  function applyFilters() {
    const term = searchInput.value.toLowerCase().trim();
    const selectedShape = shapeFilter.value;
    const selectedCountry = countryFilter.value;
    // Filter
    filtered = original.filter((row) => {
      // Apply shape filter
      const shp = row['column-shape'] && row['column-shape'].trim() ? row['column-shape'].trim() : 'Unknown';
      if (selectedShape && shp !== selectedShape) return false;
      // Apply country filter
      const ctry = row['column-country'] && row['column-country'].trim() ? row['column-country'].trim() : 'Unspecified';
      if (selectedCountry && ctry !== selectedCountry) return false;
      // Apply search filter across all columns
      if (term) {
        return columns.some((col) => {
          const val = row[col.key];
          return val && val.toString().toLowerCase().includes(term);
        });
      }
      return true;
    });
    // Sort if sortKey defined
    if (sortKey) {
      filtered.sort((a, b) => {
        const aVal = a[sortKey] || '';
        const bVal = b[sortKey] || '';
        if (aVal < bVal) return sortAsc ? -1 : 1;
        if (aVal > bVal) return sortAsc ? 1 : -1;
        return 0;
      });
    }
    // Reset to first page if current page out of range
    currentPage = 1;
    renderTable();
    // Update charts with the filtered data
    computeCharts(filtered);
  }
  // Event listeners
  searchInput.addEventListener('input', () => {
    applyFilters();
  });
  rowsSelect.addEventListener('change', (e) => {
    rowsPerPage = parseInt(e.target.value, 10);
    currentPage = 1;
    renderTable();
  });
  // Shape and country filter listeners
  shapeFilter.addEventListener('change', () => {
    applyFilters();
  });
  countryFilter.addEventListener('change', () => {
    applyFilters();
  });
  prevBtn.addEventListener('click', () => {
    if (currentPage > 1) {
      currentPage--;
      renderTable();
    }
  });
  nextBtn.addEventListener('click', () => {
    const totalPages = Math.ceil(filtered.length / rowsPerPage);
    if (currentPage < totalPages) {
      currentPage++;
      renderTable();
    }
  });
  // Initial render
  buildHeader();
  applyFilters();
}

/**
 * Compute aggregate statistics and render charts.
 * @param {Array<Object>} data Array of sighting objects parsed from the CSV
 */
function computeCharts(data) {
  const shapeCounts = {};
  const countryCounts = {};
  const yearCounts = {};
  data.forEach((d) => {
    // Shape counts
    const shape = d['column-shape'] && d['column-shape'].trim() ? d['column-shape'].trim() : 'Unknown';
    shapeCounts[shape] = (shapeCounts[shape] || 0) + 1;
    // Country counts
    const country = d['column-country'] && d['column-country'].trim() ? d['column-country'].trim() : 'Unspecified';
    countryCounts[country] = (countryCounts[country] || 0) + 1;
    // Year counts from occurred date
    const occurred = d['column-occurred'];
    if (occurred) {
      const parsed = new Date(occurred);
      if (!isNaN(parsed.getTime())) {
        const year = parsed.getFullYear();
        yearCounts[year] = (yearCounts[year] || 0) + 1;
      }
    }
  });
  // Prepare shape data (top 10)
  const shapeEntries = Object.entries(shapeCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10);
  const shapeLabels = shapeEntries.map((e) => e[0]);
  const shapeValues = shapeEntries.map((e) => e[1]);
  // Prepare country data (top 10)
  const countryEntries = Object.entries(countryCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10);
  const countryLabels = countryEntries.map((e) => e[0]);
  const countryValues = countryEntries.map((e) => e[1]);
  // Prepare year data (all years sorted ascending)
  const yearLabels = Object.keys(yearCounts)
    .map((y) => parseInt(y))
    .sort((a, b) => a - b);
  const yearValues = yearLabels.map((y) => yearCounts[y]);
  // Define a colour palette for bar charts
  const palette = [
    '#3b82f6',
    '#6366f1',
    '#14b8a6',
    '#f97316',
    '#eab308',
    '#ec4899',
    '#8b5cf6',
    '#10b981',
    '#0ea5e9',
    '#f43f5e'
  ];
  // Render custom bar charts and line chart
  renderBarChart('shapeChartContainer', shapeLabels, shapeValues, palette);
  renderBarChart('countryChartContainer', countryLabels, countryValues, palette);
  renderLineChart('yearChartContainer', yearLabels, yearValues);
}

/**
 * Render a horizontal bar chart inside a given container.
 * Each bar's width is proportional to its value relative to the maximum.
 * @param {string} containerId The ID of the element where the chart will be rendered
 * @param {Array<string>} labels Labels corresponding to each bar
 * @param {Array<number>} values Numerical values for each bar
 * @param {Array<string>} palette Array of hex colour strings
 */
function renderBarChart(containerId, labels, values, palette) {
  const container = document.getElementById(containerId);
  if (!container) {
    // Container doesn't exist, skip rendering (e.g., charts not needed on this page)
    return;
  }
  // Clear any existing content
  container.innerHTML = '';
  const chart = document.createElement('div');
  chart.classList.add('bar-chart');
  const maxVal = Math.max(...values);
  // Determine the type of chart based on the containerId to support filtering
  const type = containerId.includes('shape')
    ? 'shape'
    : containerId.includes('country')
    ? 'country'
    : null;
  labels.forEach((label, idx) => {
    const wrapper = document.createElement('div');
    wrapper.classList.add('bar-wrapper');
    const labelDiv = document.createElement('div');
    labelDiv.classList.add('bar-label');
    labelDiv.textContent = label;
    const bar = document.createElement('div');
    bar.classList.add('bar');
    // assign dataset for later selection
    bar.dataset.label = label;
    bar.dataset.type = type;
    const percentage = maxVal === 0 ? 0 : (values[idx] / maxVal) * 100;
    bar.style.width = percentage + '%';
    bar.style.backgroundColor = palette[idx % palette.length];
    const valueSpan = document.createElement('span');
    valueSpan.classList.add('bar-value');
    valueSpan.textContent = values[idx];
    // Prevent the value span from intercepting click events so the bar click handler fires reliably
    valueSpan.style.pointerEvents = 'none';
    bar.appendChild(valueSpan);
    // If a filter is already applied externally, mark this bar as selected
    if ((type === 'shape' && window.shapeFilterEl && window.shapeFilterEl.value === label) ||
        (type === 'country' && window.countryFilterEl && window.countryFilterEl.value === label)) {
      bar.classList.add('selected');
    }
    // Hover tooltip
    bar.addEventListener('mouseover', (e) => {
      const tooltip = window.globalTooltip;
      tooltip.style.display = 'block';
      tooltip.textContent = `${label}: ${values[idx]}`;
    });
    bar.addEventListener('mousemove', (e) => {
      const tooltip = window.globalTooltip;
      tooltip.style.left = e.clientX + 10 + 'px';
      tooltip.style.top = e.clientY + 10 + 'px';
    });
    bar.addEventListener('mouseout', () => {
      const tooltip = window.globalTooltip;
      tooltip.style.display = 'none';
    });
    // Define a reusable click handler for both the bar and its wrapper
    function handleBarClick(ev) {
      ev.preventDefault();
      ev.stopPropagation();
      if (!type) return;
      if (type === 'shape') {
        if (window.shapeFilterEl.value === label) {
          window.shapeFilterEl.value = '';
        } else {
          window.shapeFilterEl.value = label;
        }
        window.shapeFilterEl.dispatchEvent(new Event('change'));
      } else if (type === 'country') {
        if (window.countryFilterEl.value === label) {
          window.countryFilterEl.value = '';
        } else {
          window.countryFilterEl.value = label;
        }
        window.countryFilterEl.dispatchEvent(new Event('change'));
      }
      // Remove highlight from all bars in this chart
      const siblings = container.querySelectorAll('.bar');
      siblings.forEach((s) => {
        s.classList.remove('selected');
      });
      // Apply highlight if the filter was applied
      if ((type === 'shape' && window.shapeFilterEl.value === label) || (type === 'country' && window.countryFilterEl.value === label)) {
        bar.classList.add('selected');
      }
    }
    // Attach click handler to bar and wrapper so clicking anywhere triggers the filter
    bar.addEventListener('click', handleBarClick);
    wrapper.addEventListener('click', handleBarClick);
    // Indicate clickable bars with a pointer cursor
    bar.style.cursor = 'pointer';
    wrapper.style.cursor = 'pointer';
    wrapper.appendChild(labelDiv);
    wrapper.appendChild(bar);
    chart.appendChild(wrapper);
  });
  container.appendChild(chart);
}

/**
 * Render a simple line chart using SVG. Points are plotted relative to the maximum value.
 * @param {string} containerId The ID of the element where the chart will be rendered
 * @param {Array<string|number>} labels X-axis labels (years)
 * @param {Array<number>} values Y-axis values
 */
function renderLineChart(containerId, labels, values) {
  const container = document.getElementById(containerId);
  if (!container) {
    // Container doesn't exist, skip rendering (e.g., charts not needed on this page)
    return;
  }
  container.innerHTML = '';
  const width = container.clientWidth || 400;
  const height = 300;
  const padding = 40;
  const maxVal = Math.max(...values);
  const minVal = Math.min(...values);
  const svgNS = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(svgNS, 'svg');
  svg.setAttribute('width', '100%');
  svg.setAttribute('height', height);
  svg.setAttribute('viewBox', `0 0 ${width} ${height}`);
  // Draw axes
  const axis = document.createElementNS(svgNS, 'line');
  axis.setAttribute('x1', padding);
  axis.setAttribute('y1', height - padding);
  axis.setAttribute('x2', width - padding);
  axis.setAttribute('y2', height - padding);
  axis.setAttribute('stroke', '#334155');
  axis.setAttribute('stroke-width', '1');
  svg.appendChild(axis);
  // Y-axis line
  const yAxis = document.createElementNS(svgNS, 'line');
  yAxis.setAttribute('x1', padding);
  yAxis.setAttribute('y1', padding);
  yAxis.setAttribute('x2', padding);
  yAxis.setAttribute('y2', height - padding);
  yAxis.setAttribute('stroke', '#334155');
  yAxis.setAttribute('stroke-width', '1');
  svg.appendChild(yAxis);
  // Plot points and lines
  const points = [];
  const xStep = (width - 2 * padding) / (labels.length - 1);
  values.forEach((val, i) => {
    const x = padding + i * xStep;
    const yRange = maxVal - minVal || 1;
    const y = height - padding - ((val - minVal) / yRange) * (height - 2 * padding);
    points.push({ x, y });
  });
  // Polyline for the line
  const polyline = document.createElementNS(svgNS, 'polyline');
  polyline.setAttribute(
    'points',
    points.map((p) => `${p.x},${p.y}`).join(' ')
  );
  polyline.setAttribute('fill', 'none');
  polyline.setAttribute('stroke', '#3b82f6');
  polyline.setAttribute('stroke-width', '2');
  svg.appendChild(polyline);
  // Draw circles at points and text labels
  points.forEach((p, idx) => {
    const circle = document.createElementNS(svgNS, 'circle');
    circle.setAttribute('cx', p.x);
    circle.setAttribute('cy', p.y);
    circle.setAttribute('r', 4);
    circle.setAttribute('fill', '#6366f1');
    circle.style.cursor = 'pointer';
    // Tooltip events on the circle
    circle.addEventListener('mouseover', () => {
      const tooltip = window.globalTooltip;
      tooltip.style.display = 'block';
      tooltip.textContent = `${labels[idx]}: ${values[idx]}`;
    });
    circle.addEventListener('mousemove', (e) => {
      const tooltip = window.globalTooltip;
      tooltip.style.left = e.clientX + 10 + 'px';
      tooltip.style.top = e.clientY + 10 + 'px';
    });
    circle.addEventListener('mouseout', () => {
      const tooltip = window.globalTooltip;
      tooltip.style.display = 'none';
    });
    svg.appendChild(circle);
    // Value label above point
    const valText = document.createElementNS(svgNS, 'text');
    valText.setAttribute('x', p.x);
    valText.setAttribute('y', p.y - 8);
    valText.setAttribute('text-anchor', 'middle');
    valText.setAttribute('font-size', '10');
    valText.setAttribute('fill', '#94a3b8');
    valText.textContent = values[idx];
    svg.appendChild(valText);
    // X-axis tick label
    const xLabel = document.createElementNS(svgNS, 'text');
    xLabel.setAttribute('x', p.x);
    xLabel.setAttribute('y', height - padding + 15);
    xLabel.setAttribute('text-anchor', 'middle');
    xLabel.setAttribute('font-size', '10');
    xLabel.setAttribute('fill', '#94a3b8');
    xLabel.textContent = labels[idx];
    svg.appendChild(xLabel);
  });
  // Y-axis tick marks (max and min only for simplicity)
  [minVal, maxVal].forEach((val) => {
    const y = height - padding - ((val - minVal) / (maxVal - minVal || 1)) * (height - 2 * padding);
    const tick = document.createElementNS(svgNS, 'line');
    tick.setAttribute('x1', padding - 4);
    tick.setAttribute('y1', y);
    tick.setAttribute('x2', padding);
    tick.setAttribute('y2', y);
    tick.setAttribute('stroke', '#334155');
    tick.setAttribute('stroke-width', '1');
    svg.appendChild(tick);
    const label = document.createElementNS(svgNS, 'text');
    label.setAttribute('x', padding - 6);
    label.setAttribute('y', y + 4);
    label.setAttribute('text-anchor', 'end');
    label.setAttribute('font-size', '10');
    label.setAttribute('fill', '#94a3b8');
    label.textContent = val;
    svg.appendChild(label);
  });
  container.appendChild(svg);
}