// analytics.js
// This script drives the analytics page. It computes statistics from the NUFORC
// dataset and renders a suite of charts and an interactive map. A global
// filtering system allows users to narrow the data by date range, UFO shape
// and country. Charts are drawn using simple DOM elements and SVG to avoid
// external dependencies; the map uses Leaflet.

// Colour palette used consistently across charts. Feel free to adjust or
// extend this array to suit your tastes. Colours cycle when more values
// than colours are present.
const PALETTE = [
  '#3b82f6', '#6366f1', '#14b8a6', '#f97316', '#eab308',
  '#ec4899', '#8b5cf6', '#10b981', '#0ea5e9', '#f43f5e',
  '#3f3f46', '#0f766e', '#b45309', '#7e22ce', '#d946ef',
  '#facc15', '#4f46e5', '#06b6d4', '#22c55e', '#ef4444'
];

// Axis titles keyed by chart IDs. These labels improve readability when
// interpreting the axes. They are referenced in renderDashboard().
const AXIS_TITLES = {
  chartShapeTop: { x: 'Shape', y: 'Sightings' },
  chartCountryTop: { x: 'Country', y: 'Sightings' },
  chartYearCounts: { x: 'Year', y: 'Sightings' },
  chartStateTop: { x: 'State', y: 'Sightings' },
  chartCityTop: { x: 'City', y: 'Sightings' },
  chartMonthCounts: { x: 'Month', y: 'Sightings' },
  chartHourCounts: { x: 'Hour', y: 'Sightings' },
  chartWeekdayCounts: { x: 'Day of Week', y: 'Sightings' },
  chartDecadeCounts: { x: 'Decade', y: 'Sightings' },
  chartDelayByCountry: { x: 'Average Delay (days)', y: 'Country' },
  chartDelayDistribution: { x: 'Delay Category', y: 'Sightings' },
  chartAvgDelayByYear: { x: 'Year', y: 'Avg Delay (days)' },
  chartCumulativeYear: { x: 'Year', y: 'Cumulative Sightings' },
  chartShapeTrendsDecade: { x: 'Decade', y: 'Sightings' },
  chartShapeDecadeStacked: { x: 'Decade', y: 'Sightings' }
};

// Global variables to store the unfiltered dataset and map instance. These
// allow the filters and cross‑filtering to modify and reuse data without
// mutating the original dataset loaded from the JS file.
let originalData = [];
let mapInstance;
let mapMarkers;
let markerClusterGroup;
let heatmapLayer;
let currentMapMode = 'markers'; // 'markers', 'heatmap', 'both'

document.addEventListener('DOMContentLoaded', () => {
  console.log('=== Analytics page loaded ===');
  
  // Ensure the dataset from the CSV conversion is available
  if (typeof nuforcData === 'undefined' || !Array.isArray(nuforcData)) {
    console.error('nuforcData is not available');
    return;
  }
  
  console.log('nuforcData loaded successfully:', nuforcData.length, 'records');
  console.log('Sample record:', nuforcData[0]);
  
  // Store a copy of the raw data globally. We avoid mutating this array
  // directly so that resets can restore the full dataset quickly.
  originalData = nuforcData;
  console.log('originalData set:', originalData.length, 'records');
  
  // Initialize filter controls and populate select options
  initializeFilters();
  console.log('Filters initialized');
  
  // Render the initial dashboard using the full dataset
  console.log('Rendering initial dashboard...');
  renderDashboard(originalData);
  console.log('Initial dashboard rendered');

  // Populate static descriptions for each chart to improve explanatory value
  initChartDescriptions();

  // Set up pagination so charts are divided across pages
  setupPagination();
});

function initChartDescriptions() {
  const descriptions = {
    chartMapInsight: 'World map of UFO sightings. Use filters to explore clusters.',
    chartShapeTopInsight: 'Most frequently reported UFO shapes.',
    chartYearCountsInsight: 'Annual trend of reported sightings.',
    chartCountryTopInsight: 'Countries with the highest number of reports.',
    chartStateTopInsight: 'US states with the most sightings.',
    chartCityTopInsight: 'Cities reporting the most UFO activity.',
    chartMonthCountsInsight: 'Distribution of sightings across months.',
    chartHourCountsInsight: 'Sightings by hour of the day.',
    chartWeekdayCountsInsight: 'Sightings by day of the week.',
    chartDecadeCountsInsight: 'Sightings grouped by decade.',
    chartDelayByCountryInsight: 'Average reporting delay per country.',
    chartImagePresenceInsight: 'Reports with and without accompanying images.',
    chartHemisphereDistributionInsight: 'Sightings by hemisphere.',
    chartDelayDistributionInsight: 'Distribution of reporting delays.',
    chartLatLonScatterInsight: 'Geographic scatter of sightings.',
    chartShapeDistributionInsight: 'Proportion of each UFO shape.',
    chartMonthHourHeatmapInsight: 'Heatmap of sightings by month and hour.',
    chartHourRadialInsight: 'Radial chart of hourly sightings.',
    chartShapeDecadeStackedInsight: 'UFO shape trends across decades.',
    chartAvgDelayByYearInsight: 'Average report delay by year.',
    chartCumulativeYearInsight: 'Cumulative total of sightings by year.',
    chartShapeTrendsDecadeInsight: 'Shape trends over decades.'
  };
  Object.entries(descriptions).forEach(([id, text]) => {
    const el = document.getElementById(id);
    if (el && !el.textContent.trim()) {
      el.textContent = text;
    }
  });
}

function setupPagination() {
  const chartsPerPage = 4;
  const cards = Array.from(document.querySelectorAll('.charts-grid .chart-card'));
  if (cards.length <= chartsPerPage) return;
  let currentPage = 1;
  const totalPages = Math.ceil(cards.length / chartsPerPage);
  const prevBtn = document.getElementById('prevPage');
  const nextBtn = document.getElementById('nextPage');
  const pageInfo = document.getElementById('pageInfo');
  if (!prevBtn || !nextBtn || !pageInfo) return;

  function renderPage(page) {
    currentPage = page;
    const start = (page - 1) * chartsPerPage;
    const end = start + chartsPerPage;
    cards.forEach((card, idx) => {
      card.style.display = idx >= start && idx < end ? '' : 'none';
    });
    prevBtn.disabled = page === 1;
    nextBtn.disabled = page === totalPages;
    pageInfo.textContent = `Page ${page} of ${totalPages}`;
  }

  prevBtn.addEventListener('click', () => renderPage(currentPage - 1));
  nextBtn.addEventListener('click', () => renderPage(currentPage + 1));
  renderPage(1);
}

/**
 * Compute a suite of metrics from the dataset. All parsing and aggregation
 * happens here so that chart rendering functions remain simple.
 * @param {Array<Object>} data Array of sighting objects
 * @returns {Object} Aggregated statistics for charts
 */
function computeMetrics(data) {
  const shapeCounts = {};
  const countryCounts = {};
  const stateCounts = {};
  const cityCounts = {};
  const yearCounts = {};
  const decadeCounts = {};
  const monthCounts = new Array(12).fill(0);
  const hourCounts = new Array(24).fill(0);
  const weekdayCounts = new Array(7).fill(0);
  const delayBins = {
    '0': 0,
    '1-3': 0,
    '4-7': 0,
    '8-14': 0,
    '15-30': 0,
    '31-90': 0,
    '91-365': 0,
    '366+': 0
  };
  const delaySumByCountry = {};
  const delayCountByCountry = {};
  let imageYes = 0;
  let imageNo = 0;
  const hemisphereCounts = { north: 0, south: 0 };
  const latLonPoints = [];

  // Coordinate quality tracking
  const coordinateQuality = {
    total: 0,
    valid: 0,
    placeholder: 0, // 37.0902, -95.7129
    zero: 0,        // 0, 0
    invalid: 0,     // NaN or other issues
    byCountry: {}
  };

  // Delay sums and counts by year for computing average delay per year
  const delaySumByYear = {};
  const delayCountByYear = {};

  // 2D matrix for month (rows) vs hour (cols) counts
  const monthHourCounts = Array.from({ length: 12 }, () => Array(24).fill(0));
  // Nested object to accumulate shape counts by decade
  const shapeDecadeCounts = {};

  data.forEach((row) => {
    // Shape counts
    const shape = row['column-shape'] && row['column-shape'].trim() ? row['column-shape'].trim() : 'Unknown';
    shapeCounts[shape] = (shapeCounts[shape] || 0) + 1;
    // Country counts
    const country = row['column-country'] && row['column-country'].trim() ? row['column-country'].trim() : 'Unspecified';
    countryCounts[country] = (countryCounts[country] || 0) + 1;
    // State counts: only accumulate for U.S. states to avoid mixing with international provinces
    const state = row['column-state'] && row['column-state'].trim();
    // Only count a state if it belongs to the USA; this prevents provinces or regions of other countries from
    // appearing in the "Top US States" chart. Some records use dashes or blanks for unknown states; these are ignored.
    if (state && country.toUpperCase() === 'USA') {
      stateCounts[state] = (stateCounts[state] || 0) + 1;
    }
    // City counts (only if non-empty)
    const city = row['column-city'] && row['column-city'].trim();
    if (city) {
      cityCounts[city] = (cityCounts[city] || 0) + 1;
    }
    // Date parsing for occurred
    const occStr = row['column-occurred'];
    const occDate = parseDateTime(occStr);
    if (occDate) {
      const year = occDate.getUTCFullYear();
      yearCounts[year] = (yearCounts[year] || 0) + 1;
      const month = occDate.getUTCMonth(); // 0-11
      monthCounts[month]++;
      const weekday = occDate.getUTCDay(); // 0-6
      weekdayCounts[weekday]++;
      const hour = occDate.getUTCHours();
      hourCounts[hour]++;
      const decade = Math.floor(year / 10) * 10;
      decadeCounts[decade] = (decadeCounts[decade] || 0) + 1;

      // Accumulate month-hour matrix
      if (month >= 0 && month < 12 && hour >= 0 && hour < 24) {
        monthHourCounts[month][hour]++;
      }
      // Accumulate shape counts per decade
      if (!shapeDecadeCounts[shape]) {
        shapeDecadeCounts[shape] = {};
      }
      shapeDecadeCounts[shape][decade] = (shapeDecadeCounts[shape][decade] || 0) + 1;
    }
    // Report delay calculations
    const repStr = row['column-reported'];
    const repDate = parseDateOnly(repStr);
    if (occDate && repDate && !isNaN(repDate)) {
      const diffMs = repDate.getTime() - occDate.getTime();
      const diffDays = Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)));
      // delay bins
      if (diffDays === 0) delayBins['0']++;
      else if (diffDays <= 3) delayBins['1-3']++;
      else if (diffDays <= 7) delayBins['4-7']++;
      else if (diffDays <= 14) delayBins['8-14']++;
      else if (diffDays <= 30) delayBins['15-30']++;
      else if (diffDays <= 90) delayBins['31-90']++;
      else if (diffDays <= 365) delayBins['91-365']++;
      else delayBins['366+']++;
      // accumulate per country
      delaySumByCountry[country] = (delaySumByCountry[country] || 0) + diffDays;
      delayCountByCountry[country] = (delayCountByCountry[country] || 0) + 1;
      // accumulate per year
      const reportYear = occDate.getUTCFullYear();
      delaySumByYear[reportYear] = (delaySumByYear[reportYear] || 0) + diffDays;
      delayCountByYear[reportYear] = (delayCountByYear[reportYear] || 0) + 1;
    }
    // Image presence
    const hasImg = row['column-hasimage'] && row['column-hasimage'].toString().trim().toLowerCase().startsWith('y');
    if (hasImg) imageYes++; else imageNo++;
    
    // Enhanced coordinate analysis and quality tracking
    coordinateQuality.total++;
    if (!coordinateQuality.byCountry[country]) {
      coordinateQuality.byCountry[country] = { total: 0, valid: 0, placeholder: 0, zero: 0, invalid: 0 };
    }
    coordinateQuality.byCountry[country].total++;
    
    // Support multiple naming conventions for coordinates: latitude/longitude or lat/lon
    const lat = parseFloat(row['latitude'] !== undefined ? row['latitude'] : row['lat']);
    const lon = parseFloat(row['longitude'] !== undefined ? row['longitude'] : row['lon']);
    
    if (isNaN(lat) || isNaN(lon)) {
      coordinateQuality.invalid++;
      coordinateQuality.byCountry[country].invalid++;
    } else if (lat === 0 && lon === 0) {
      coordinateQuality.zero++;
      coordinateQuality.byCountry[country].zero++;
    } else if (lat === 37.0902 && lon === -95.7129) {
      coordinateQuality.placeholder++;
      coordinateQuality.byCountry[country].placeholder++;
    } else if (lat >= -90 && lat <= 90 && lon >= -180 && lon <= 180) {
      // Valid coordinates
      coordinateQuality.valid++;
      coordinateQuality.byCountry[country].valid++;
      latLonPoints.push({ lat, lon });
      if (lat >= 0) hemisphereCounts.north++; else hemisphereCounts.south++;
    } else {
      coordinateQuality.invalid++;
      coordinateQuality.byCountry[country].invalid++;
    }
  });

  // Debug coordinate parsing with quality metrics
  console.log('=== COORDINATE QUALITY ANALYSIS ===');
  console.log('Total records:', coordinateQuality.total);
  console.log('Valid coordinates:', coordinateQuality.valid, `(${((coordinateQuality.valid/coordinateQuality.total)*100).toFixed(1)}%)`);
  console.log('Placeholder coordinates (37.0902, -95.7129):', coordinateQuality.placeholder, `(${((coordinateQuality.placeholder/coordinateQuality.total)*100).toFixed(1)}%)`);
  console.log('Zero coordinates (0, 0):', coordinateQuality.zero, `(${((coordinateQuality.zero/coordinateQuality.total)*100).toFixed(1)}%)`);
  console.log('Invalid coordinates:', coordinateQuality.invalid, `(${((coordinateQuality.invalid/coordinateQuality.total)*100).toFixed(1)}%)`);
  console.log('Sample valid coordinates:', latLonPoints.slice(0, 5));
  
  // Log country-specific quality issues
  console.log('=== COUNTRY-SPECIFIC COORDINATE QUALITY ===');
  Object.entries(coordinateQuality.byCountry).forEach(([country, stats]) => {
    if (stats.total > 10) { // Only show countries with significant data
      const validPct = ((stats.valid/stats.total)*100).toFixed(1);
      const placeholderPct = ((stats.placeholder/stats.total)*100).toFixed(1);
      console.log(`${country}: ${stats.total} records, ${validPct}% valid, ${placeholderPct}% placeholder`);
    }
  });

  // Helper to sort object by value and return labels and values arrays
  function topN(obj, n = 10) {
    const entries = Object.entries(obj).sort((a, b) => b[1] - a[1]).slice(0, n);
    const labels = entries.map((e) => e[0]);
    const values = entries.map((e) => e[1]);
    return { labels, values };
  }
  // Year counts sorted ascending
  const yearEntries = Object.entries(yearCounts).map(([k, v]) => ({ year: parseInt(k, 10), value: v }));
  yearEntries.sort((a, b) => a.year - b.year);
  const yearLabels = yearEntries.map((e) => e.year);
  const yearValues = yearEntries.map((e) => e.value);
  // Decade counts sorted ascending
  const decadeEntries = Object.entries(decadeCounts).map(([k, v]) => ({ decade: parseInt(k, 10), value: v }));
  decadeEntries.sort((a, b) => a.decade - b.decade);
  const decadeLabels = decadeEntries.map((e) => e.decade + 's');
  const decadeValues = decadeEntries.map((e) => e.value);
  // Month labels and values
  const monthLabels = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const monthValues = monthCounts;
  // Hour labels and values
  const hourLabels = Array.from({ length: 24 }, (_, i) => i.toString().padStart(2, '0'));
  const hourValues = hourCounts;
  // Weekday labels (0=Sun)
  const weekdayLabels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const weekdayValues = weekdayCounts;
  // Delay average by country (compute mean delay days)
  const delayAvgByCountry = {};
  Object.keys(delaySumByCountry).forEach((ctry) => {
    delayAvgByCountry[ctry] = delaySumByCountry[ctry] / delayCountByCountry[ctry];
  });
  // Delay histogram labels and values
  const delayHistLabels = Object.keys(delayBins);
  const delayHistValues = delayHistLabels.map((bin) => delayBins[bin]);
  // Image distribution
  const imageLabels = ['Has Image', 'No Image'];
  const imageValues = [imageYes, imageNo];
  // Hemisphere distribution
  const hemisphereLabels = ['Northern', 'Southern'];
  const hemisphereValues = [hemisphereCounts.north, hemisphereCounts.south];
  // Shape distribution for donut (top 10 shapes)
  const shapeTop = topN(shapeCounts, 10);
  // Trim lat/lon points to at most 500 for scatter to avoid performance issues
  const scatterPoints = latLonPoints.slice(0, 500);

  // Compute average report delay by year (using occurrence year)
  const delayAvgYearEntries = Object.keys(delaySumByYear).sort((a, b) => Number(a) - Number(b)).map((yr) => {
    return { year: yr, value: delaySumByYear[yr] / delayCountByYear[yr] };
  });
  const delayAvgYearLabels = delayAvgYearEntries.map((e) => e.year);
  const delayAvgYearValues = delayAvgYearEntries.map((e) => e.value);
  // Compute cumulative sighting counts across years
  const cumulativeValues = [];
  let runningTotal = 0;
  yearValues.forEach((val) => {
    runningTotal += val;
    cumulativeValues.push(runningTotal);
  });

  return {
    topShapes: topN(shapeCounts, 10),
    topCountries: topN(countryCounts, 10),
    topStates: topN(stateCounts, 10),
    topCities: topN(cityCounts, 10),
    year: { labels: yearLabels, values: yearValues },
    decade: { labels: decadeLabels, values: decadeValues },
    month: { labels: monthLabels, values: monthValues },
    hour: { labels: hourLabels, values: hourValues },
    weekday: { labels: weekdayLabels, values: weekdayValues },
    delayByCountry: topN(delayAvgByCountry, 10),
    delayHistogram: { labels: delayHistLabels, values: delayHistValues },
    image: { labels: imageLabels, values: imageValues },
    hemisphere: { labels: hemisphereLabels, values: hemisphereValues },
    shapeDistribution: shapeTop,
    latLonPoints: scatterPoints,
    coordinateQuality: coordinateQuality,
    monthHourMatrix: monthHourCounts,
    // Prepare stacked counts of top shapes by decade. Use top 5 shapes for clarity.
    shapeDecadeStacked: (() => {
      const topShapesForStack = topN(shapeCounts, 5).labels;
      const decadesList = decadeEntries.map((e) => e.decade);
      const valuesMatrix = topShapesForStack.map((sh) =>
        decadesList.map((dec) => (shapeDecadeCounts[sh] && shapeDecadeCounts[sh][dec]) ? shapeDecadeCounts[sh][dec] : 0)
      );
      const decadeLabelsStack = decadesList.map((dec) => dec + 's');
      return { shapes: topShapesForStack, decades: decadeLabelsStack, values: valuesMatrix };
    })(),
    // Average delay in days for each year
    delayAvgYear: { labels: delayAvgYearLabels, values: delayAvgYearValues },
    // Cumulative sighting counts by year
    cumulativeCounts: { labels: yearLabels, values: cumulativeValues }
  };
}

/**
 * Parse a date/time string in the format "MM/DD/YYYY HH:MM". Returns a
 * Date object in UTC or null if parsing fails.
 * @param {string} str
 * @returns {Date|null}
 */
function parseDateTime(str) {
  if (!str) return null;
  const parts = str.trim().split(' ');
  if (parts.length === 0) return null;
  const datePart = parts[0].split('/');
  if (datePart.length !== 3) return null;
  const [mm, dd, yyyy] = datePart;
  const timePart = parts[1] || '00:00';
  const iso = `${yyyy.padStart(4, '0')}-${mm.padStart(2, '0')}-${dd.padStart(2, '0')}T${timePart}:00Z`;
  const d = new Date(iso);
  return isNaN(d.getTime()) ? null : d;
}

/**
 * Parse a date string in the format "MM/DD/YYYY". Returns a Date object
 * or null if parsing fails.
 * @param {string} str
 * @returns {Date|null}
 */
function parseDateOnly(str) {
  if (!str) return null;
  const parts = str.trim().split('/');
  if (parts.length !== 3) return null;
  const [mm, dd, yyyy] = parts;
  const iso = `${yyyy.padStart(4, '0')}-${mm.padStart(2, '0')}-${dd.padStart(2, '0')}T00:00:00Z`;
  const d = new Date(iso);
  return isNaN(d.getTime()) ? null : d;
}

/**
 * Render a horizontal bar chart. Bars are sized relative to the maximum value.
 * @param {string} containerId ID of the container element
 * @param {Array<string>} labels Array of bar labels
 * @param {Array<number>} values Array of bar values
 * @param {Array<string>} palette Array of colours
 */
function renderBarChart(containerId, labels, values, palette, axisTitles) {
  const container = document.getElementById(containerId);
  if (!container) return;
  container.innerHTML = '';
  const chart = document.createElement('div');
  chart.classList.add('bar-chart');
  const maxVal = values.length ? Math.max(...values) : 0;
  // Compute total for percentage display
  const totalVal = values.reduce((a, b) => a + b, 0) || 1;
  labels.forEach((label, idx) => {
    const wrapper = document.createElement('div');
    wrapper.classList.add('bar-wrapper');
    const labelDiv = document.createElement('div');
    labelDiv.classList.add('bar-label');
    labelDiv.textContent = label;
    const bar = document.createElement('div');
    bar.classList.add('bar');
    const percentage = maxVal === 0 ? 0 : (values[idx] / maxVal) * 100;
    bar.style.width = percentage + '%';
    bar.style.backgroundColor = palette[idx % palette.length];
    const valueSpan = document.createElement('span');
    valueSpan.classList.add('bar-value');
    // Show count and percentage of total for better context
    const share = ((values[idx] / totalVal) * 100).toFixed(1);
    valueSpan.textContent = `${Math.round(values[idx])} (${share}%)`;
    valueSpan.style.pointerEvents = 'none';
    bar.appendChild(valueSpan);
    // Tooltip
    bar.addEventListener('mouseover', () => {
      const tooltip = window.globalTooltip || createGlobalTooltip();
      tooltip.textContent = `${label}: ${Math.round(values[idx])} (${share}% of total)`;
      tooltip.style.display = 'block';
    });
    bar.addEventListener('mousemove', (e) => {
      const tooltip = window.globalTooltip || createGlobalTooltip();
      tooltip.style.left = e.clientX + 10 + 'px';
      tooltip.style.top = e.clientY + 10 + 'px';
    });
    bar.addEventListener('mouseout', () => {
      const tooltip = window.globalTooltip || createGlobalTooltip();
      tooltip.style.display = 'none';
    });

    // Cross‑filter: clicking on a bar in certain charts applies a filter
    bar.addEventListener('click', () => {
      // Determine which filter to apply based on the chart container ID
      const shapeCharts = ['chartShapeTop', 'chartShapeDistribution', 'chartShapeDecadeStacked', 'chartShapeTrendsDecade'];
      const countryCharts = ['chartCountryTop', 'chartDelayByCountry'];
      if (shapeCharts.includes(containerId)) {
        setShapeFilter(label);
      } else if (countryCharts.includes(containerId)) {
        setCountryFilter(label);
      }
    });
    wrapper.appendChild(labelDiv);
    wrapper.appendChild(bar);
    chart.appendChild(wrapper);
  });
  container.appendChild(chart);
  // Add axis titles if provided
  if (axisTitles && (axisTitles.x || axisTitles.y)) {
    addAxisTitles(container, axisTitles);
  }
}

/**
 * Render a line chart using SVG. The line spans the full width and height of
 * the container with equal spacing between points.
 * @param {string} containerId ID of the container element
 * @param {Array<string|number>} labels X-axis labels
 * @param {Array<number>} values Y-axis values
 */
function renderLineChart(containerId, labels, values, axisTitles) {
  const container = document.getElementById(containerId);
  if (!container) return;
  container.innerHTML = '';
  const width = container.clientWidth || 400;
  const height = 260;
  const margin = { top: 20, right: 20, bottom: 40, left: 45 };
  const plotW = width - margin.left - margin.right;
  const plotH = height - margin.top - margin.bottom;
  const maxVal = values.length ? Math.max(...values) : 0;
  const minVal = values.length ? Math.min(...values) : 0;
  const svgNS = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(svgNS, 'svg');
  svg.setAttribute('width', '100%');
  svg.setAttribute('height', height);
  svg.setAttribute('viewBox', `0 0 ${width} ${height}`);
  // Draw axes
  const xAxis = document.createElementNS(svgNS, 'line');
  xAxis.setAttribute('x1', margin.left);
  xAxis.setAttribute('y1', margin.top + plotH);
  xAxis.setAttribute('x2', margin.left + plotW);
  xAxis.setAttribute('y2', margin.top + plotH);
  xAxis.setAttribute('stroke', '#475569');
  svg.appendChild(xAxis);
  const yAxis = document.createElementNS(svgNS, 'line');
  yAxis.setAttribute('x1', margin.left);
  yAxis.setAttribute('y1', margin.top);
  yAxis.setAttribute('x2', margin.left);
  yAxis.setAttribute('y2', margin.top + plotH);
  yAxis.setAttribute('stroke', '#475569');
  svg.appendChild(yAxis);
  // Draw horizontal grid lines and y-axis ticks (4 intervals)
  const gridLines = 4;
  for (let i = 0; i <= gridLines; i++) {
    const t = i / gridLines;
    const yVal = minVal + (maxVal - minVal) * t;
    const yPos = margin.top + plotH - t * plotH;
    // grid line (skip baseline)
    if (i > 0 && i < gridLines) {
      const line = document.createElementNS(svgNS, 'line');
      line.setAttribute('x1', margin.left);
      line.setAttribute('y1', yPos);
      line.setAttribute('x2', margin.left + plotW);
      line.setAttribute('y2', yPos);
      line.setAttribute('stroke', '#1e293b');
      line.setAttribute('stroke-width', 0.5);
      svg.appendChild(line);
    }
    // tick label
    const text = document.createElementNS(svgNS, 'text');
    text.setAttribute('x', margin.left - 5);
    text.setAttribute('y', yPos + 3);
    text.setAttribute('fill', '#94a3b8');
    text.setAttribute('font-size', '7');
    text.setAttribute('text-anchor', 'end');
    text.textContent = Math.round(yVal);
    svg.appendChild(text);
  }
  // Calculate positions and draw line and points
  const pointCount = values.length;
  const xStep = pointCount > 1 ? plotW / (pointCount - 1) : 0;
  const pathParts = [];
  const points = [];
  values.forEach((val, idx) => {
    const x = margin.left + xStep * idx;
    const y = margin.top + plotH - (maxVal === minVal ? 0 : ((val - minVal) / (maxVal - minVal)) * plotH);
    pathParts.push(`${idx === 0 ? 'M' : 'L'}${x},${y}`);
    points.push({ x, y, label: labels[idx], value: val });
  });
  // Draw polyline
  const path = document.createElementNS(svgNS, 'path');
  path.setAttribute('d', pathParts.join(' '));
  path.setAttribute('fill', 'none');
  path.setAttribute('stroke', '#38bdf8');
  path.setAttribute('stroke-width', 2);
  svg.appendChild(path);
  // Draw points and tooltips
  points.forEach((pt) => {
    const circ = document.createElementNS(svgNS, 'circle');
    circ.setAttribute('cx', pt.x);
    circ.setAttribute('cy', pt.y);
    circ.setAttribute('r', 3);
    circ.setAttribute('fill', '#38bdf8');
    circ.addEventListener('mouseover', () => {
      const tooltip = window.globalTooltip || createGlobalTooltip();
      tooltip.textContent = `${pt.label}: ${Math.round(pt.value)}`;
      tooltip.style.display = 'block';
    });
    circ.addEventListener('mousemove', (e) => {
      const tooltip = window.globalTooltip || createGlobalTooltip();
      tooltip.style.left = e.clientX + 10 + 'px';
      tooltip.style.top = e.clientY + 10 + 'px';
    });
    circ.addEventListener('mouseout', () => {
      const tooltip = window.globalTooltip || createGlobalTooltip();
      tooltip.style.display = 'none';
    });
    svg.appendChild(circ);
  });
  // Draw x-axis labels. To avoid overcrowding on long time series, only render every nth label
  const maxLabels = 12;
  const skip = labels.length > maxLabels ? Math.ceil(labels.length / maxLabels) : 1;
  labels.forEach((lbl, idx) => {
    if (idx % skip !== 0 && idx !== labels.length - 1) return;
    const x = margin.left + xStep * idx;
    const text = document.createElementNS(svgNS, 'text');
    text.setAttribute('x', x);
    text.setAttribute('y', margin.top + plotH + 15);
    text.setAttribute('fill', '#e2e8f0');
    text.setAttribute('font-size', '8');
    text.setAttribute('text-anchor', 'middle');
    text.textContent = lbl;
    svg.appendChild(text);
  });
  // Draw average line across all values to highlight typical level
  if (values && values.length) {
    const sumVals = values.reduce((a, b) => a + b, 0);
    const avgVal = sumVals / values.length;
    // Prevent division by zero when max equals min
    const yAvg = margin.top + plotH - (maxVal === minVal ? 0 : ((avgVal - minVal) / (maxVal - minVal)) * plotH);
    const avgLine = document.createElementNS(svgNS, 'line');
    avgLine.setAttribute('x1', margin.left);
    avgLine.setAttribute('y1', yAvg);
    avgLine.setAttribute('x2', margin.left + plotW);
    avgLine.setAttribute('y2', yAvg);
    avgLine.setAttribute('stroke', '#f97316');
    avgLine.setAttribute('stroke-dasharray', '4 2');
    avgLine.setAttribute('stroke-width', 1);
    svg.appendChild(avgLine);
    // Label for average line
    const avgLabel = document.createElementNS(svgNS, 'text');
    avgLabel.setAttribute('x', margin.left - 5);
    avgLabel.setAttribute('y', yAvg - 2);
    avgLabel.setAttribute('fill', '#f97316');
    avgLabel.setAttribute('font-size', '7');
    avgLabel.setAttribute('text-anchor', 'end');
    avgLabel.textContent = `avg: ${avgVal.toFixed(1)}`;
    svg.appendChild(avgLabel);
  }
  container.appendChild(svg);
  // Add axis titles outside of SVG
  if (axisTitles && (axisTitles.x || axisTitles.y)) {
    addAxisTitles(container, axisTitles);
  }
}

/**
 * Render a vertical bar chart. Bars grow from the bottom upwards.
 * @param {string} containerId ID of the container
 * @param {Array<string>} labels Array of labels
 * @param {Array<number>} values Array of values
 * @param {Array<string>} palette Colour palette
 */
function renderVerticalBarChart(containerId, labels, values, palette, axisTitles) {
  const container = document.getElementById(containerId);
  if (!container) return;
  container.innerHTML = '';
  const chart = document.createElement('div');
  chart.classList.add('vertical-bar-chart');
  chart.style.position = 'relative';
  // Determine the largest value; if all values are zero or undefined, fall back to 1 to avoid division by zero
  const maxValRaw = values.length ? Math.max(...values) : 0;
  const maxVal = maxValRaw > 0 ? maxValRaw : 1;
  const showValues = labels.length <= 10;
  labels.forEach((label, idx) => {
    const wrapper = document.createElement('div');
    wrapper.classList.add('vbar-wrapper');
    // Create a filler to push the bar to the bottom of its wrapper.
    const filler = document.createElement('div');
    filler.style.flexGrow = '1';
    // Create the actual bar element. Its height will be set as a percentage
    // of the wrapper height via inline style below.
    const bar = document.createElement('div');
    bar.classList.add('vbar');
    const heightPct = maxVal === 0 ? 0 : (values[idx] / maxVal) * 100;
    bar.style.height = heightPct + '%';
    bar.style.backgroundColor = palette[idx % palette.length];
    if (showValues) {
      const valueSpan = document.createElement('span');
      valueSpan.classList.add('vbar-value');
      valueSpan.textContent = Math.round(values[idx]);
      bar.appendChild(valueSpan);
    }
    const labelSpan = document.createElement('div');
    labelSpan.classList.add('vbar-label');
    labelSpan.textContent = label;
    // Append filler first, then bar, then label. This ensures the bar
    // stays anchored to the bottom of the wrapper with free space above.
    wrapper.appendChild(filler);
    wrapper.appendChild(bar);
    wrapper.appendChild(labelSpan);
    // Determine whether to display label to avoid overcrowding; hide some labels when many categories
    const maxLabels = 12;
    const skip = labels.length > maxLabels ? Math.ceil(labels.length / maxLabels) : 1;
    if (idx % skip !== 0 && idx !== labels.length - 1) {
      labelSpan.style.visibility = 'hidden';
    }
    // Tooltip on bar
    bar.addEventListener('mouseover', () => {
      const tooltip = window.globalTooltip || createGlobalTooltip();
      tooltip.textContent = `${label}: ${Math.round(values[idx])}`;
      tooltip.style.display = 'block';
    });
    bar.addEventListener('mousemove', (e) => {
      const tooltip = window.globalTooltip || createGlobalTooltip();
      tooltip.style.left = e.clientX + 10 + 'px';
      tooltip.style.top = e.clientY + 10 + 'px';
    });
    bar.addEventListener('mouseout', () => {
      const tooltip = window.globalTooltip || createGlobalTooltip();
      tooltip.style.display = 'none';
    });
    chart.appendChild(wrapper);
  });
  container.appendChild(chart);
  // Draw horizontal grid lines inside the vertical bar chart
  const gridLines = 4;
  for (let i = 1; i <= gridLines; i++) {
    const line = document.createElement('div');
    line.classList.add('vbar-grid-line');
    const position = (i / (gridLines + 1)) * 100;
    line.style.bottom = `${position}%`;
    // label for the grid line
    const labelVal = maxVal * (i / (gridLines + 1));
    line.setAttribute('data-label', Math.round(labelVal));
    chart.appendChild(line);
  }
  // Axis titles
  if (axisTitles && (axisTitles.x || axisTitles.y)) {
    addAxisTitles(container, axisTitles);
  }
}

/**
 * Render a donut (pie) chart using CSS conic gradients. Also draws a legend.
 * @param {string} containerId ID of the container
 * @param {Array<string>} labels Array of categories
 * @param {Array<number>} values Array of counts
 * @param {Array<string>} palette Colours to use
 */
function renderDonutChart(containerId, labels, values, palette) {
  const container = document.getElementById(containerId);
  if (!container) return;
  container.innerHTML = '';
  const total = values.reduce((a, b) => a + b, 0) || 1;
  let current = 0;
  const segments = values.map((val, idx) => {
    const start = (current / total) * 100;
    current += val;
    const end = (current / total) * 100;
    return { color: palette[idx % palette.length], start, end };
  });
  const gradientStops = segments.map(seg => `${seg.color} ${seg.start}% ${seg.end}%`).join(', ');
  const chartDiv = document.createElement('div');
  chartDiv.className = 'donut-chart';
  chartDiv.style.background = `conic-gradient(${gradientStops})`;
  container.appendChild(chartDiv);
  // legend
  const legend = document.createElement('div');
  legend.className = 'donut-legend';
  labels.forEach((label, idx) => {
    const item = document.createElement('div');
    item.className = 'legend-item';
    const colorBox = document.createElement('span');
    colorBox.className = 'legend-color';
    colorBox.style.backgroundColor = palette[idx % palette.length];
    const text = document.createElement('span');
    // Compute percentage for legend entry
    const share = ((values[idx] / total) * 100).toFixed(1);
    text.textContent = `${label} (${Math.round(values[idx])}, ${share}%)`;
    item.appendChild(colorBox);
    item.appendChild(text);
    legend.appendChild(item);
  });
  container.appendChild(legend);
}

/**
 * Render a scatter plot of lat/lon points. Points are rendered as small
 * circles within an SVG. The axes span the entire range of latitudes
 * (-90 to 90) and longitudes (-180 to 180).
 * @param {string} containerId
 * @param {Array<{lat:number, lon:number}>} points
 */
function renderScatterPlot(containerId, points) {
  const container = document.getElementById(containerId);
  if (!container) return;
  container.innerHTML = '';
  const width = container.clientWidth || 400;
  const height = 260;
  const padding = 40;
  const svgNS = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(svgNS, 'svg');
  svg.setAttribute('width', '100%');
  svg.setAttribute('height', height);
  svg.setAttribute('viewBox', `0 0 ${width} ${height}`);
  // Draw border rectangle
  const rect = document.createElementNS(svgNS, 'rect');
  rect.setAttribute('x', padding);
  rect.setAttribute('y', padding);
  rect.setAttribute('width', width - 2 * padding);
  rect.setAttribute('height', height - 2 * padding);
  rect.setAttribute('fill', 'none');
  rect.setAttribute('stroke', '#475569');
  svg.appendChild(rect);
  // Draw equator (lat=0) and prime meridian (lon=0) lines for reference
  const eqY = padding + ((90 - 0) / 180) * (height - 2 * padding);
  const pmX = padding + ((0 + 180) / 360) * (width - 2 * padding);
  const eqLine = document.createElementNS(svgNS, 'line');
  eqLine.setAttribute('x1', padding);
  eqLine.setAttribute('y1', eqY);
  eqLine.setAttribute('x2', width - padding);
  eqLine.setAttribute('y2', eqY);
  eqLine.setAttribute('stroke', '#1e293b');
  eqLine.setAttribute('stroke-dasharray', '2 2');
  svg.appendChild(eqLine);
  const pmLine = document.createElementNS(svgNS, 'line');
  pmLine.setAttribute('x1', pmX);
  pmLine.setAttribute('y1', padding);
  pmLine.setAttribute('x2', pmX);
  pmLine.setAttribute('y2', height - padding);
  pmLine.setAttribute('stroke', '#1e293b');
  pmLine.setAttribute('stroke-dasharray', '2 2');
  svg.appendChild(pmLine);
  // Draw latitude tick lines and labels
  const latTicks = [-60, -30, 0, 30, 60];
  latTicks.forEach((lat) => {
    const y = padding + ((90 - lat) / 180) * (height - 2 * padding);
    const line = document.createElementNS(svgNS, 'line');
    line.setAttribute('x1', padding);
    line.setAttribute('y1', y);
    line.setAttribute('x2', width - padding);
    line.setAttribute('y2', y);
    line.setAttribute('stroke', '#1e293b');
    line.setAttribute('stroke-width', 0.5);
    svg.appendChild(line);
    const text = document.createElementNS(svgNS, 'text');
    text.setAttribute('x', padding - 5);
    text.setAttribute('y', y + 2);
    text.setAttribute('fill', '#94a3b8');
    text.setAttribute('font-size', '7');
    text.setAttribute('text-anchor', 'end');
    text.textContent = lat;
    svg.appendChild(text);
  });
  // Draw longitude tick lines and labels
  const lonTicks = [-120, -60, 0, 60, 120];
  lonTicks.forEach((lon) => {
    const x = padding + ((lon + 180) / 360) * (width - 2 * padding);
    const line = document.createElementNS(svgNS, 'line');
    line.setAttribute('x1', x);
    line.setAttribute('y1', padding);
    line.setAttribute('x2', x);
    line.setAttribute('y2', height - padding);
    line.setAttribute('stroke', '#1e293b');
    line.setAttribute('stroke-width', 0.5);
    svg.appendChild(line);
    const text = document.createElementNS(svgNS, 'text');
    text.setAttribute('x', x);
    text.setAttribute('y', height - padding + 12);
    text.setAttribute('fill', '#94a3b8');
    text.setAttribute('font-size', '7');
    text.setAttribute('text-anchor', 'middle');
    text.textContent = lon;
    svg.appendChild(text);
  });
  // Axis labels
  const latLabel = document.createElementNS(svgNS, 'text');
  latLabel.setAttribute('x', 10);
  latLabel.setAttribute('y', padding + (height - 2 * padding) / 2);
  latLabel.setAttribute('fill', '#94a3b8');
  latLabel.setAttribute('font-size', '8');
  latLabel.setAttribute('text-anchor', 'middle');
  latLabel.setAttribute('transform', `rotate(-90 10 ${padding + (height - 2 * padding) / 2})`);
  latLabel.textContent = 'Latitude';
  svg.appendChild(latLabel);
  const lonLabel = document.createElementNS(svgNS, 'text');
  lonLabel.setAttribute('x', padding + (width - 2 * padding) / 2);
  lonLabel.setAttribute('y', height - 5);
  lonLabel.setAttribute('fill', '#94a3b8');
  lonLabel.setAttribute('font-size', '8');
  lonLabel.setAttribute('text-anchor', 'middle');
  lonLabel.textContent = 'Longitude';
  svg.appendChild(lonLabel);
  // Plot points
  points.forEach((pt) => {
    const x = padding + ((pt.lon + 180) / 360) * (width - 2 * padding);
    const y = padding + ((90 - pt.lat) / 180) * (height - 2 * padding);
    const circle = document.createElementNS(svgNS, 'circle');
    circle.setAttribute('cx', x);
    circle.setAttribute('cy', y);
    circle.setAttribute('r', 2);
    circle.setAttribute('fill', '#38bdf8');
    svg.appendChild(circle);
  });
  container.appendChild(svg);
}

/**
 * Render a month-by-hour heatmap using SVG. Rows correspond to months (Jan–Dec)
 * and columns correspond to hours (00–23). Cell color intensity reflects
 * the number of sightings in that month/hour combination. Axis labels
 * are drawn along the top and left.
 * @param {string} containerId ID of the target container
 * @param {Array<Array<number>>} matrix 12x24 array of counts
 * @param {Array<string>} monthLabels Array of month abbreviations
 * @param {Array<string>} hourLabels Array of hour labels (00–23)
 * @param {Array<string>} palette Colour palette for scaling
 */
function renderHeatmap(containerId, matrix, monthLabels, hourLabels, palette) {
  const container = document.getElementById(containerId);
  if (!container) return;
  container.innerHTML = '';
  const width = container.clientWidth || 400;
  const height = 260;
  const paddingLeft = 45;
  const paddingTop = 25;
  const rows = matrix.length;
  const cols = matrix[0].length;
  // Reserve space for colour legend on the right
  const legendWidth = 20;
  const legendGap = 10;
  const availableW = width - paddingLeft - legendWidth - legendGap;
  const cellWidth = availableW / cols;
  const cellHeight = (height - paddingTop) / rows;
  // Determine the maximum count for colour scaling
  let maxVal = 0;
  for (let i = 0; i < rows; i++) {
    for (let j = 0; j < cols; j++) {
      if (matrix[i][j] > maxVal) maxVal = matrix[i][j];
    }
  }
  const svgNS = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(svgNS, 'svg');
  svg.setAttribute('width', '100%');
  svg.setAttribute('height', height);
  svg.setAttribute('viewBox', `0 0 ${width} ${height}`);
  // Draw background
  const bg = document.createElementNS(svgNS, 'rect');
  bg.setAttribute('x', 0);
  bg.setAttribute('y', 0);
  bg.setAttribute('width', width);
  bg.setAttribute('height', height);
  bg.setAttribute('fill', '#0f172a');
  svg.appendChild(bg);
  // Draw cells
  for (let i = 0; i < rows; i++) {
    for (let j = 0; j < cols; j++) {
      const val = matrix[i][j];
      const ratio = maxVal === 0 ? 0 : val / maxVal;
      // Map ratio to a hue between 220 (blue) and 20 (yellow/red)
      const hue = 220 - ratio * 200;
      const saturation = 65;
      const lightness = 20 + ratio * 40;
      const fill = `hsl(${hue}, ${saturation}%, ${lightness}%)`;
      const rect = document.createElementNS(svgNS, 'rect');
      rect.setAttribute('x', paddingLeft + j * cellWidth);
      rect.setAttribute('y', paddingTop + i * cellHeight);
      rect.setAttribute('width', cellWidth);
      rect.setAttribute('height', cellHeight);
      rect.setAttribute('fill', fill);
      rect.setAttribute('stroke', '#1e293b');
      rect.setAttribute('stroke-width', 0.5);
      // Tooltip events
      rect.addEventListener('mouseover', () => {
        const tooltip = window.globalTooltip || createGlobalTooltip();
        tooltip.textContent = `${monthLabels[i]} ${hourLabels[j]}: ${val}`;
        tooltip.style.display = 'block';
      });
      rect.addEventListener('mousemove', (e) => {
        const tooltip = window.globalTooltip || createGlobalTooltip();
        tooltip.style.left = e.clientX + 10 + 'px';
        tooltip.style.top = e.clientY + 10 + 'px';
      });
      rect.addEventListener('mouseout', () => {
        const tooltip = window.globalTooltip || createGlobalTooltip();
        tooltip.style.display = 'none';
      });
      svg.appendChild(rect);
    }
  }
  // Month labels on left
  monthLabels.forEach((lbl, i) => {
    const text = document.createElementNS(svgNS, 'text');
    text.setAttribute('x', paddingLeft - 5);
    text.setAttribute('y', paddingTop + (i + 0.5) * cellHeight);
    text.setAttribute('fill', '#e2e8f0');
    text.setAttribute('font-size', '9');
    text.setAttribute('text-anchor', 'end');
    text.setAttribute('dominant-baseline', 'middle');
    text.textContent = lbl;
    svg.appendChild(text);
  });
  // Hour labels on top
  hourLabels.forEach((lbl, j) => {
    const text = document.createElementNS(svgNS, 'text');
    text.setAttribute('x', paddingLeft + (j + 0.5) * cellWidth);
    text.setAttribute('y', paddingTop - 5);
    text.setAttribute('fill', '#e2e8f0');
    text.setAttribute('font-size', '8');
    text.setAttribute('text-anchor', 'middle');
    text.setAttribute('dominant-baseline', 'baseline');
    text.textContent = lbl;
    svg.appendChild(text);
  });
  // Draw border around heatmap
  const border = document.createElementNS(svgNS, 'rect');
  border.setAttribute('x', paddingLeft);
  border.setAttribute('y', paddingTop);
  border.setAttribute('width', cols * cellWidth);
  border.setAttribute('height', rows * cellHeight);
  border.setAttribute('fill', 'none');
  border.setAttribute('stroke', '#475569');
  border.setAttribute('stroke-width', 1);
  svg.appendChild(border);
  // Draw colour legend
  // Create gradient definition
  const defs = document.createElementNS(svgNS, 'defs');
  const gradId = `${containerId}-legend-grad`;
  const gradient = document.createElementNS(svgNS, 'linearGradient');
  gradient.setAttribute('id', gradId);
  gradient.setAttribute('x1', '0');
  gradient.setAttribute('y1', '1');
  gradient.setAttribute('x2', '0');
  gradient.setAttribute('y2', '0');
  // Generate multiple stops from low (0) to high (1)
  const stops = [0, 0.25, 0.5, 0.75, 1];
  stops.forEach((t) => {
    const hue = 220 - t * 200;
    const saturation = 65;
    const lightness = 20 + t * 40;
    const stop = document.createElementNS(svgNS, 'stop');
    stop.setAttribute('offset', `${t * 100}%`);
    stop.setAttribute('stop-color', `hsl(${hue}, ${saturation}%, ${lightness}%)`);
    gradient.appendChild(stop);
  });
  defs.appendChild(gradient);
  svg.appendChild(defs);
  // Legend rectangle
  const legendX = paddingLeft + cols * cellWidth + legendGap;
  const legendRect = document.createElementNS(svgNS, 'rect');
  legendRect.setAttribute('x', legendX);
  legendRect.setAttribute('y', paddingTop);
  legendRect.setAttribute('width', legendWidth);
  legendRect.setAttribute('height', rows * cellHeight);
  legendRect.setAttribute('fill', `url(#${gradId})`);
  legendRect.setAttribute('stroke', '#475569');
  legendRect.setAttribute('stroke-width', 0.5);
  svg.appendChild(legendRect);
  // Legend labels (min, mid, max)
  const labelMin = document.createElementNS(svgNS, 'text');
  labelMin.setAttribute('x', legendX + legendWidth + 4);
  labelMin.setAttribute('y', paddingTop + rows * cellHeight);
  labelMin.setAttribute('fill', '#94a3b8');
  labelMin.setAttribute('font-size', '7');
  labelMin.setAttribute('text-anchor', 'start');
  labelMin.textContent = '0';
  svg.appendChild(labelMin);
  const labelMax = document.createElementNS(svgNS, 'text');
  labelMax.setAttribute('x', legendX + legendWidth + 4);
  labelMax.setAttribute('y', paddingTop + 5);
  labelMax.setAttribute('fill', '#94a3b8');
  labelMax.setAttribute('font-size', '7');
  labelMax.setAttribute('text-anchor', 'start');
  labelMax.textContent = maxVal.toString();
  svg.appendChild(labelMax);
  const midVal = Math.round(maxVal / 2);
  const labelMid = document.createElementNS(svgNS, 'text');
  labelMid.setAttribute('x', legendX + legendWidth + 4);
  labelMid.setAttribute('y', paddingTop + (rows * cellHeight) / 2 + 2);
  labelMid.setAttribute('fill', '#94a3b8');
  labelMid.setAttribute('font-size', '7');
  labelMid.setAttribute('text-anchor', 'start');
  labelMid.textContent = midVal.toString();
  svg.appendChild(labelMid);
  // Legend title
  const legendTitle = document.createElementNS(svgNS, 'text');
  legendTitle.setAttribute('x', legendX + legendWidth / 2);
  legendTitle.setAttribute('y', paddingTop - 8);
  legendTitle.setAttribute('fill', '#94a3b8');
  legendTitle.setAttribute('font-size', '8');
  legendTitle.setAttribute('text-anchor', 'middle');
  legendTitle.textContent = 'Sightings';
  svg.appendChild(legendTitle);
  container.appendChild(svg);
}

/**
 * Render a radial (clock-like) chart to show distribution across 24 hours.
 * Each hour segment is represented as a wedge of equal angle; colour and
 * interactive tooltips reflect the number of sightings per hour.
 * @param {string} containerId ID of container
 * @param {Array<string>} labels Hour labels (00–23)
 * @param {Array<number>} values Hour counts
 * @param {Array<string>} palette Colour palette to cycle through
 */
function renderRadialChart(containerId, labels, values, palette) {
  const container = document.getElementById(containerId);
  if (!container) return;
  container.innerHTML = '';
  const width = container.clientWidth || 400;
  const size = 260;
  const radius = Math.min(size, width) / 2 - 30;
  const cx = Math.min(size, width) / 2;
  const cy = size / 2;
  const svgNS = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(svgNS, 'svg');
  svg.setAttribute('width', '100%');
  svg.setAttribute('height', size);
  svg.setAttribute('viewBox', `0 0 ${Math.min(size, width)} ${size}`);
  // Draw background circle
  const bgCircle = document.createElementNS(svgNS, 'circle');
  bgCircle.setAttribute('cx', cx);
  bgCircle.setAttribute('cy', cy);
  bgCircle.setAttribute('r', radius + 15);
  bgCircle.setAttribute('fill', '#0f172a');
  svg.appendChild(bgCircle);
  // Draw segments
  const totalSegments = values.length;
  const angleStep = (2 * Math.PI) / totalSegments;
  // Determine maximum value for opacity scaling
  const maxVal = values.length ? Math.max(...values) : 0;
  values.forEach((val, idx) => {
    const startAngle = idx * angleStep - Math.PI / 2;
    const endAngle = (idx + 1) * angleStep - Math.PI / 2;
    const x1 = cx + radius * Math.cos(startAngle);
    const y1 = cy + radius * Math.sin(startAngle);
    const x2 = cx + radius * Math.cos(endAngle);
    const y2 = cy + radius * Math.sin(endAngle);
    const path = document.createElementNS(svgNS, 'path');
    const largeArcFlag = 0;
    const d = [
      'M', cx, cy,
      'L', x1, y1,
      'A', radius, radius, 0, largeArcFlag, 1, x2, y2,
      'Z'
    ].join(' ');
    path.setAttribute('d', d);
    // Base colour from palette with opacity scaled by relative value
    path.setAttribute('fill', palette[idx % palette.length]);
    const opacity = maxVal === 0 ? 0.5 : 0.2 + 0.8 * (val / maxVal);
    path.setAttribute('fill-opacity', opacity.toFixed(3));
    // Tooltip events
    path.addEventListener('mouseover', () => {
      const tooltip = window.globalTooltip || createGlobalTooltip();
      tooltip.textContent = `${labels[idx]}: ${Math.round(val)}`;
      tooltip.style.display = 'block';
    });
    path.addEventListener('mousemove', (e) => {
      const tooltip = window.globalTooltip || createGlobalTooltip();
      tooltip.style.left = e.clientX + 10 + 'px';
      tooltip.style.top = e.clientY + 10 + 'px';
    });
    path.addEventListener('mouseout', () => {
      const tooltip = window.globalTooltip || createGlobalTooltip();
      tooltip.style.display = 'none';
    });
    svg.appendChild(path);
  });
  // Draw hour labels around circle
  values.forEach((val, idx) => {
    const midAngle = (idx + 0.5) * angleStep - Math.PI / 2;
    const labelR = radius + 20;
    const lx = cx + labelR * Math.cos(midAngle);
    const ly = cy + labelR * Math.sin(midAngle);
    const text = document.createElementNS(svgNS, 'text');
    text.setAttribute('x', lx);
    text.setAttribute('y', ly);
    text.setAttribute('fill', '#e2e8f0');
    text.setAttribute('font-size', '8');
    text.setAttribute('text-anchor', 'middle');
    text.setAttribute('dominant-baseline', 'middle');
    text.textContent = labels[idx];
    svg.appendChild(text);
  });
  container.appendChild(svg);
}

/**
 * Render a stacked bar chart to compare counts of top shapes across decades.
 * Each bar represents a decade and segments within the bar correspond to
 * different shapes. A legend lists the shapes with matching colours.
 * @param {string} containerId ID of container
 * @param {Object} data Contains shapes array, decades array and values matrix
 * @param {Array<string>} palette Colour palette
 */
function renderStackedBar(containerId, data, palette, axisTitles) {
  const container = document.getElementById(containerId);
  if (!container) return;
  container.innerHTML = '';
  const { shapes, decades, values } = data;
  const width = container.clientWidth || 400;
  const height = 260;
  const margin = { top: 20, right: 20, bottom: 40, left: 40 };
  const plotW = width - margin.left - margin.right;
  const plotH = height - margin.top - margin.bottom;
  const nDecades = decades.length;
  const barWidth = plotW / nDecades * 0.7; // 70% of cell for bar, rest spacing
  const barSpacing = plotW / nDecades * 0.3;
  // Compute max total count across decades
  const totals = [];
  for (let j = 0; j < nDecades; j++) {
    let sum = 0;
    for (let i = 0; i < shapes.length; i++) {
      sum += values[i][j];
    }
    totals.push(sum);
  }
  const maxTotal = totals.length ? Math.max(...totals) : 0;
  const svgNS = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(svgNS, 'svg');
  svg.setAttribute('width', '100%');
  svg.setAttribute('height', height);
  svg.setAttribute('viewBox', `0 0 ${width} ${height}`);
  // Draw axes
  const axisColor = '#475569';
  // Y-axis
  const yAxis = document.createElementNS(svgNS, 'line');
  yAxis.setAttribute('x1', margin.left);
  yAxis.setAttribute('y1', margin.top);
  yAxis.setAttribute('x2', margin.left);
  yAxis.setAttribute('y2', margin.top + plotH);
  yAxis.setAttribute('stroke', axisColor);
  svg.appendChild(yAxis);
  // X-axis
  const xAxis = document.createElementNS(svgNS, 'line');
  xAxis.setAttribute('x1', margin.left);
  xAxis.setAttribute('y1', margin.top + plotH);
  xAxis.setAttribute('x2', margin.left + plotW);
  xAxis.setAttribute('y2', margin.top + plotH);
  xAxis.setAttribute('stroke', axisColor);
  svg.appendChild(xAxis);
  // Draw bars
  for (let j = 0; j < nDecades; j++) {
    let yOffset = margin.top + plotH;
    const xPos = margin.left + j * (barWidth + barSpacing);
    for (let i = 0; i < shapes.length; i++) {
      const val = values[i][j];
      const heightRatio = maxTotal === 0 ? 0 : (val / maxTotal);
      const segHeight = heightRatio * plotH;
      const y = yOffset - segHeight;
      const rect = document.createElementNS(svgNS, 'rect');
      rect.setAttribute('x', xPos);
      rect.setAttribute('y', y);
      rect.setAttribute('width', barWidth);
      rect.setAttribute('height', segHeight);
      rect.setAttribute('fill', palette[i % palette.length]);
      // Tooltip events
      rect.addEventListener('mouseover', () => {
        const tooltip = window.globalTooltip || createGlobalTooltip();
        tooltip.textContent = `${shapes[i]} in ${decades[j]}: ${val}`;
        tooltip.style.display = 'block';
      });
      rect.addEventListener('mousemove', (e) => {
        const tooltip = window.globalTooltip || createGlobalTooltip();
        tooltip.style.left = e.clientX + 10 + 'px';
        tooltip.style.top = e.clientY + 10 + 'px';
      });
      rect.addEventListener('mouseout', () => {
        const tooltip = window.globalTooltip || createGlobalTooltip();
        tooltip.style.display = 'none';
      });
      svg.appendChild(rect);
      yOffset -= segHeight;
    }
    // X-axis label
    const txt = document.createElementNS(svgNS, 'text');
    txt.setAttribute('x', xPos + barWidth / 2);
    txt.setAttribute('y', margin.top + plotH + 14);
    txt.setAttribute('fill', '#e2e8f0');
    txt.setAttribute('font-size', '9');
    txt.setAttribute('text-anchor', 'middle');
    txt.textContent = decades[j];
    svg.appendChild(txt);
  }
  // Add legend below chart
  const legend = document.createElement('div');
  legend.className = 'stacked-bar-legend';
  shapes.forEach((shp, idx) => {
    const item = document.createElement('div');
    item.className = 'legend-item';
    const colorBox = document.createElement('span');
    colorBox.className = 'legend-color';
    colorBox.style.backgroundColor = palette[idx % palette.length];
    const text = document.createElement('span');
    text.textContent = shp;
    item.appendChild(colorBox);
    item.appendChild(text);
    legend.appendChild(item);
  });
  container.appendChild(svg);
  // Draw totals above each stacked bar
  totals.forEach((total, j) => {
    const xPos = margin.left + j * (barWidth + barSpacing);
    const barHeightRatio = maxTotal === 0 ? 0 : (total / maxTotal);
    const y = margin.top + plotH - barHeightRatio * plotH - 3;
    const txt = document.createElementNS(svgNS, 'text');
    txt.setAttribute('x', xPos + barWidth / 2);
    txt.setAttribute('y', y);
    txt.setAttribute('fill', '#e2e8f0');
    txt.setAttribute('font-size', '7');
    txt.setAttribute('text-anchor', 'middle');
    txt.textContent = total;
    svg.appendChild(txt);
  });
  container.appendChild(legend);
  // Axis titles (if provided)
  if (axisTitles && (axisTitles.x || axisTitles.y)) {
    addAxisTitles(container, axisTitles);
  }
}

/**
 * Append axis title elements to the given container. This helper adds small
 * x- and y-axis labels outside of the primary chart area. It expects the
 * container to have position: relative or a child with relative positioning.
 * @param {HTMLElement} container Target container for the chart
 * @param {{x?: string, y?: string}} titles Object containing x and y axis titles
 */
function addAxisTitles(container, titles) {
  if (!titles) return;
  // Remove existing axis-title elements if present
  const existingX = container.querySelector('.axis-title-x');
  const existingY = container.querySelector('.axis-title-y');
  if (existingX) existingX.remove();
  if (existingY) existingY.remove();
  // X-axis title
  if (titles.x) {
    const xDiv = document.createElement('div');
    xDiv.className = 'axis-title axis-title-x';
    xDiv.textContent = titles.x;
    container.appendChild(xDiv);
  }
  // Y-axis title
  if (titles.y) {
    const yDiv = document.createElement('div');
    yDiv.className = 'axis-title axis-title-y';
    yDiv.textContent = titles.y;
    container.appendChild(yDiv);
  }
}

/**
 * Render a multi-line chart comparing multiple series over a common x-axis.
 * Each series is drawn as a polyline with circles marking data points. A legend
 * lists the series names. Tooltips display the series and value on hover.
 * @param {string} containerId ID of the container element
 * @param {Array<string|number>} labels X-axis labels
 * @param {Array<Array<number>>} seriesValues Array of series arrays (each length = labels.length)
 * @param {Array<string>} seriesNames Names for each series
 * @param {Array<string>} palette Colour palette
 */
function renderMultiLineChart(containerId, labels, seriesValues, seriesNames, palette, axisTitles) {
  const container = document.getElementById(containerId);
  if (!container) return;
  container.innerHTML = '';
  const width = container.clientWidth || 400;
  const height = 260;
  const margin = { top: 20, right: 20, bottom: 40, left: 45 };
  const plotW = width - margin.left - margin.right;
  const plotH = height - margin.top - margin.bottom;
  // Determine global min and max across all series (use 0 as min)
  let maxVal = 0;
  seriesValues.forEach((arr) => {
    arr.forEach((v) => { if (v > maxVal) maxVal = v; });
  });
  // Avoid zero scale
  if (maxVal === 0) maxVal = 1;
  // Setup SVG
  const svgNS = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(svgNS, 'svg');
  svg.setAttribute('width', '100%');
  svg.setAttribute('height', height);
  svg.setAttribute('viewBox', `0 0 ${width} ${height}`);
  // Axes lines
  const xAxis = document.createElementNS(svgNS, 'line');
  xAxis.setAttribute('x1', margin.left);
  xAxis.setAttribute('y1', margin.top + plotH);
  xAxis.setAttribute('x2', margin.left + plotW);
  xAxis.setAttribute('y2', margin.top + plotH);
  xAxis.setAttribute('stroke', '#475569');
  svg.appendChild(xAxis);
  const yAxis = document.createElementNS(svgNS, 'line');
  yAxis.setAttribute('x1', margin.left);
  yAxis.setAttribute('y1', margin.top);
  yAxis.setAttribute('x2', margin.left);
  yAxis.setAttribute('y2', margin.top + plotH);
  yAxis.setAttribute('stroke', '#475569');
  svg.appendChild(yAxis);
  // Horizontal grid lines and y-axis ticks
  const gridLines = 4;
  for (let i = 1; i <= gridLines; i++) {
    const t = i / (gridLines + 1);
    const yVal = maxVal * t;
    const yPos = margin.top + plotH - t * plotH;
    const line = document.createElementNS(svgNS, 'line');
    line.setAttribute('x1', margin.left);
    line.setAttribute('y1', yPos);
    line.setAttribute('x2', margin.left + plotW);
    line.setAttribute('y2', yPos);
    line.setAttribute('stroke', '#1e293b');
    line.setAttribute('stroke-width', 0.5);
    svg.appendChild(line);
    const text = document.createElementNS(svgNS, 'text');
    text.setAttribute('x', margin.left - 5);
    text.setAttribute('y', yPos + 3);
    text.setAttribute('fill', '#94a3b8');
    text.setAttribute('font-size', '7');
    text.setAttribute('text-anchor', 'end');
    text.textContent = Math.round(yVal);
    svg.appendChild(text);
  }
  // Calculate x positions for labels
  const pointCount = labels.length;
  const xStep = pointCount > 1 ? plotW / (pointCount - 1) : 0;
  // Draw each series and store references for toggling
  const seriesPaths = [];
  const seriesCircles = [];
  seriesValues.forEach((vals, seriesIdx) => {
    // Build path data and points
    const pathParts = [];
    const circles = [];
    vals.forEach((val, idx) => {
      const x = margin.left + xStep * idx;
      const y = margin.top + plotH - (val / maxVal) * plotH;
      pathParts.push(`${idx === 0 ? 'M' : 'L'}${x},${y}`);
      circles.push({ x, y, val, label: labels[idx], seriesName: seriesNames[seriesIdx] });
    });
    const path = document.createElementNS(svgNS, 'path');
    path.setAttribute('d', pathParts.join(' '));
    path.setAttribute('fill', 'none');
    path.setAttribute('stroke', palette[seriesIdx % palette.length]);
    path.setAttribute('stroke-width', 2);
    svg.appendChild(path);
    seriesPaths.push(path);
    // Draw circles
    const circleElems = [];
    circles.forEach((pt) => {
      const circle = document.createElementNS(svgNS, 'circle');
      circle.setAttribute('cx', pt.x);
      circle.setAttribute('cy', pt.y);
      circle.setAttribute('r', 3);
      circle.setAttribute('fill', palette[seriesIdx % palette.length]);
      circle.addEventListener('mouseover', () => {
        const tooltip = window.globalTooltip || createGlobalTooltip();
        tooltip.textContent = `${pt.seriesName} in ${pt.label}: ${Math.round(pt.val)}`;
        tooltip.style.display = 'block';
      });
      circle.addEventListener('mousemove', (e) => {
        const tooltip = window.globalTooltip || createGlobalTooltip();
        tooltip.style.left = e.clientX + 10 + 'px';
        tooltip.style.top = e.clientY + 10 + 'px';
      });
      circle.addEventListener('mouseout', () => {
        const tooltip = window.globalTooltip || createGlobalTooltip();
        tooltip.style.display = 'none';
      });
      svg.appendChild(circle);
      circleElems.push(circle);
    });
    seriesCircles.push(circleElems);
  });
  // Draw x-axis labels
  labels.forEach((lbl, idx) => {
    const x = margin.left + xStep * idx;
    const text = document.createElementNS(svgNS, 'text');
    text.setAttribute('x', x);
    text.setAttribute('y', margin.top + plotH + 15);
    text.setAttribute('fill', '#e2e8f0');
    text.setAttribute('font-size', '8');
    text.setAttribute('text-anchor', 'middle');
    text.textContent = lbl;
    svg.appendChild(text);
  });
  container.appendChild(svg);
  // Legend with toggle functionality
  const legend = document.createElement('div');
  legend.className = 'multi-line-legend';
  const activeSeries = seriesNames.map(() => true);
  seriesNames.forEach((name, idx) => {
    const item = document.createElement('div');
    item.className = 'legend-item';
    item.style.cursor = 'pointer';
    const colorBox = document.createElement('span');
    colorBox.className = 'legend-color';
    colorBox.style.backgroundColor = palette[idx % palette.length];
    const textSpan = document.createElement('span');
    textSpan.textContent = name;
    item.appendChild(colorBox);
    item.appendChild(textSpan);
    // Click handler toggles visibility
    item.addEventListener('click', () => {
      activeSeries[idx] = !activeSeries[idx];
      // Update opacity for legend item
      item.style.opacity = activeSeries[idx] ? '1' : '0.4';
      // Toggle path and circles
      seriesPaths[idx].style.display = activeSeries[idx] ? 'block' : 'none';
      seriesCircles[idx].forEach(c => { c.style.display = activeSeries[idx] ? 'block' : 'none'; });
    });
    legend.appendChild(item);
  });
  container.appendChild(legend);
  // Axis titles
  if (axisTitles && (axisTitles.x || axisTitles.y)) {
    addAxisTitles(container, axisTitles);
  }
}

/**
 * Create a global tooltip element if it does not yet exist. Returns
 * the tooltip element. The tooltip is attached to the document body.
 */
function createGlobalTooltip() {
  let tooltip = document.querySelector('.tooltip');
  if (!tooltip) {
    tooltip = document.createElement('div');
    tooltip.className = 'tooltip';
    document.body.appendChild(tooltip);
  }
  window.globalTooltip = tooltip;
  return tooltip;
}

/**
 * Generate short textual insights for each chart and set them in the DOM.
 * This function summarises key findings such as the most common category or
 * peak times. It improves the informational value of the dashboard.
 * @param {Object} metrics Aggregated statistics from computeMetrics
 */
function updateInsights(metrics) {
  const set = (id, text) => {
    const el = document.getElementById(id);
    if (el) el.textContent = text;
  };
  // Top shapes
  if (metrics.topShapes.labels.length) {
    set('chartShapeTopInsight', `Most common: ${metrics.topShapes.labels[0]} (${metrics.topShapes.values[0]})`);
  }
  // Top countries
  if (metrics.topCountries.labels.length) {
    set('chartCountryTopInsight', `Top: ${metrics.topCountries.labels[0]} (${Math.round(metrics.topCountries.values[0])})`);
  }
  // Sightings by year: peak year
  if (metrics.year.labels.length) {
    const yearVals = metrics.year.values;
    let maxIdx = 0;
    for (let i = 1; i < yearVals.length; i++) {
      if (yearVals[i] > yearVals[maxIdx]) maxIdx = i;
    }
    set('chartYearCountsInsight', `Peak: ${metrics.year.labels[maxIdx]} (${Math.round(metrics.year.values[maxIdx])})`);
  }
  // Top states
  if (metrics.topStates.labels.length) {
    set('chartStateTopInsight', `Top: ${metrics.topStates.labels[0]} (${Math.round(metrics.topStates.values[0])})`);
  }
  // Top cities
  if (metrics.topCities.labels.length) {
    set('chartCityTopInsight', `Top: ${metrics.topCities.labels[0]} (${Math.round(metrics.topCities.values[0])})`);
  }
  // Peak month
  if (metrics.month.values && metrics.month.values.length) {
    const vals = metrics.month.values;
    let maxIdx = 0;
    for (let i = 1; i < vals.length; i++) {
      if (vals[i] > vals[maxIdx]) maxIdx = i;
    }
    set('chartMonthCountsInsight', `Peak: ${metrics.month.labels[maxIdx]} (${vals[maxIdx]})`);
  }
  // Peak hour
  if (metrics.hour.values && metrics.hour.values.length) {
    const vals = metrics.hour.values;
    let maxIdx = 0;
    for (let i = 1; i < vals.length; i++) {
      if (vals[i] > vals[maxIdx]) maxIdx = i;
    }
    set('chartHourCountsInsight', `Peak: ${metrics.hour.labels[maxIdx]}h (${vals[maxIdx]})`);
  }
  // Peak weekday
  if (metrics.weekday.values && metrics.weekday.values.length) {
    const vals = metrics.weekday.values;
    let maxIdx = 0;
    for (let i = 1; i < vals.length; i++) {
      if (vals[i] > vals[maxIdx]) maxIdx = i;
    }
    set('chartWeekdayCountsInsight', `Peak: ${metrics.weekday.labels[maxIdx]} (${vals[maxIdx]})`);
  }
  // Peak decade
  if (metrics.decade.values && metrics.decade.values.length) {
    const vals = metrics.decade.values;
    let maxIdx = 0;
    for (let i = 1; i < vals.length; i++) {
      if (vals[i] > vals[maxIdx]) maxIdx = i;
    }
    set('chartDecadeCountsInsight', `Peak: ${metrics.decade.labels[maxIdx]} (${vals[maxIdx]})`);
  }
  // Avg delay by country: highest average delay
  if (metrics.delayByCountry.labels && metrics.delayByCountry.labels.length) {
    const val = metrics.delayByCountry.values[0];
    set('chartDelayByCountryInsight', `Longest avg delay: ${metrics.delayByCountry.labels[0]} (${val.toFixed(1)} days)`);
  }
  // Image presence
  if (metrics.image.values) {
    set('chartImagePresenceInsight', `With image: ${metrics.image.values[0]}, Without: ${metrics.image.values[1]}`);
  }
  // Hemisphere distribution
  if (metrics.hemisphere.values) {
    set('chartHemisphereDistributionInsight', `Northern: ${metrics.hemisphere.values[0]}, Southern: ${metrics.hemisphere.values[1]}`);
  }
  // Delay distribution: peak bin
  if (metrics.delayHistogram && metrics.delayHistogram.values) {
    const vals = metrics.delayHistogram.values;
    let maxIdx = 0;
    for (let i = 1; i < vals.length; i++) {
      if (vals[i] > vals[maxIdx]) maxIdx = i;
    }
    set('chartDelayDistributionInsight', `Most in: ${metrics.delayHistogram.labels[maxIdx]} (${vals[maxIdx]})`);
  }
  // Enhanced coordinate quality insights
  if (metrics.coordinateQuality) {
    const quality = metrics.coordinateQuality;
    const validPct = ((quality.valid/quality.total)*100).toFixed(1);
    const placeholderPct = ((quality.placeholder/quality.total)*100).toFixed(1);
    
    // Global scatter: note coordinate quality
    set('chartLatLonScatterInsight', `Showing ${metrics.latLonPoints.length} valid points (${validPct}% of total)`);
    
    // Map insight with quality warning
    if (quality.valid > 0) {
      set('chartMapInsight', `Plotted ${metrics.latLonPoints.length} points (${validPct}% of reports have valid coordinates)`);
    } else {
      set('chartMapInsight', `No valid coordinates available (${placeholderPct}% use placeholder coordinates)`);
    }
    
    // Add coordinate quality warning to the page
    const qualityWarning = document.getElementById('coordinateQualityWarning');
    if (qualityWarning) {
      if (validPct < 5) {
        qualityWarning.innerHTML = `
          <div style="background: rgba(239, 68, 68, 0.1); border: 1px solid rgba(239, 68, 68, 0.3); border-radius: 8px; padding: 12px; margin: 16px 0; color: #fca5a5;">
            <strong>⚠️ Data Quality Notice:</strong> Only ${validPct}% of reports have accurate coordinates. 
            ${placeholderPct}% use placeholder coordinates (37.0902, -95.7129). 
            Geographic analysis may be limited.
          </div>
        `;
      } else if (validPct < 20) {
        qualityWarning.innerHTML = `
          <div style="background: rgba(245, 158, 11, 0.1); border: 1px solid rgba(245, 158, 11, 0.3); border-radius: 8px; padding: 12px; margin: 16px 0; color: #fbbf24;">
            <strong>📊 Data Quality Notice:</strong> ${validPct}% of reports have accurate coordinates. 
            Geographic analysis available but limited.
          </div>
        `;
      }
    }
  } else {
    // Fallback for map insight
    if (metrics.latLonPoints) {
      set('chartLatLonScatterInsight', `Showing ${metrics.latLonPoints.length} samples`);
      set('chartMapInsight', `Plotted ${metrics.latLonPoints.length} points`);
    }
  }
  // Shape distribution donut: top shape
  if (metrics.shapeDistribution.labels && metrics.shapeDistribution.labels.length) {
    set('chartShapeDistributionInsight', `Top: ${metrics.shapeDistribution.labels[0]} (${metrics.shapeDistribution.values[0]})`);
  }
  // Heatmap: find most intense month-hour
  if (metrics.monthHourMatrix) {
    const matrix = metrics.monthHourMatrix;
    let maxVal = 0, maxI = 0, maxJ = 0;
    for (let i = 0; i < matrix.length; i++) {
      for (let j = 0; j < matrix[i].length; j++) {
        if (matrix[i][j] > maxVal) {
          maxVal = matrix[i][j];
          maxI = i;
          maxJ = j;
        }
      }
    }
    set('chartMonthHourHeatmapInsight', `Peak: ${metrics.month.labels[maxI]} ${metrics.hour.labels[maxJ]}h (${maxVal})`);
  }
  // Radial hour: peak hour reuse
  if (metrics.hour.values) {
    const vals = metrics.hour.values;
    let maxIdx = 0;
    for (let i = 1; i < vals.length; i++) {
      if (vals[i] > vals[maxIdx]) maxIdx = i;
    }
    set('chartHourRadialInsight', `Peak: ${metrics.hour.labels[maxIdx]}h (${vals[maxIdx]})`);
  }
  // Shape counts by decade: top shape in latest decade
  if (metrics.shapeDecadeStacked) {
    const shapes = metrics.shapeDecadeStacked.shapes;
    const values = metrics.shapeDecadeStacked.values;
    const lastIdx = metrics.shapeDecadeStacked.decades.length - 1;
    let topShape = shapes[0];
    let topVal = values[0][lastIdx];
    for (let i = 1; i < shapes.length; i++) {
      if (values[i][lastIdx] > topVal) {
        topVal = values[i][lastIdx];
        topShape = shapes[i];
      }
    }
    set('chartShapeDecadeStackedInsight', `Latest decade top: ${topShape} (${topVal})`);
  }
  // Average delay by year: max average year
  if (metrics.delayAvgYear && metrics.delayAvgYear.values && metrics.delayAvgYear.values.length) {
    const vals = metrics.delayAvgYear.values;
    let maxIdx = 0;
    for (let i = 1; i < vals.length; i++) {
      if (vals[i] > vals[maxIdx]) maxIdx = i;
    }
    set('chartAvgDelayByYearInsight', `Longest avg: ${metrics.delayAvgYear.labels[maxIdx]} (${vals[maxIdx].toFixed(1)} days)`);
  }
  // Cumulative: total count at last year
  if (metrics.cumulativeCounts && metrics.cumulativeCounts.values && metrics.cumulativeCounts.values.length) {
    const lastVal = metrics.cumulativeCounts.values[metrics.cumulativeCounts.values.length - 1];
    set('chartCumulativeYearInsight', `Total reports: ${lastVal}`);
  }
  // Shape trends by decade: identify shape with most rapid recent growth (difference between last two decades)
  if (metrics.shapeDecadeStacked) {
    const shapes = metrics.shapeDecadeStacked.shapes;
    const values = metrics.shapeDecadeStacked.values;
    const nDec = metrics.shapeDecadeStacked.decades.length;
    if (nDec >= 2) {
      let bestShape = shapes[0];
      let bestDiff = values[0][nDec - 1] - values[0][nDec - 2];
      for (let i = 1; i < shapes.length; i++) {
        const diff = values[i][nDec - 1] - values[i][nDec - 2];
        if (diff > bestDiff) {
          bestDiff = diff;
          bestShape = shapes[i];
        }
      }
      set('chartShapeTrendsDecadeInsight', `Fastest growth: ${bestShape}`);
    }
  }
}

/**
 * Populate and wire up the global filter controls. Called once on page
 * load. Extracts unique shapes and countries from the dataset, sets the
 * date input ranges and attaches event listeners to the apply/reset
 * buttons. Selecting multiple shapes is supported via the "multiple"
 * attribute.
 */
function initializeFilters() {
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
  renderDashboard(filtered);
}

/**
 * Set the selected shape programmatically and apply filters. Clears any
 * previous shape selections before applying. Called when a bar in the
 * shape charts is clicked.
 * @param {string} shape The shape to filter by
 */
function setShapeFilter(shape) {
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
function setCountryFilter(country) {
  const countrySelect = document.getElementById('countrySelect');
  if (!countrySelect) return;
  countrySelect.value = country;
  applyFilters();
}

/**
 * Render all charts and the map based on a given dataset. This function
 * recomputes metrics from scratch each time it is called. It centralises
 * all rendering calls so that filters can update the entire page in one
 * place.
 * @param {Array<Object>} data Dataset to visualise
 */
function renderDashboard(data) {
  console.log('=== renderDashboard called ===');
  console.log('Data received:', data.length, 'records');
  
  const metrics = computeMetrics(data);
  console.log('Metrics computed:', metrics);
  console.log('LatLon points:', metrics.latLonPoints);
  
  // Bar charts and line charts
  renderBarChart('chartShapeTop', metrics.topShapes.labels, metrics.topShapes.values, PALETTE, AXIS_TITLES.chartShapeTop);
  renderBarChart('chartCountryTop', metrics.topCountries.labels, metrics.topCountries.values, PALETTE, AXIS_TITLES.chartCountryTop);
  renderLineChart('chartYearCounts', metrics.year.labels, metrics.year.values, AXIS_TITLES.chartYearCounts);
  renderBarChart('chartStateTop', metrics.topStates.labels, metrics.topStates.values, PALETTE, AXIS_TITLES.chartStateTop);
  renderBarChart('chartCityTop', metrics.topCities.labels, metrics.topCities.values, PALETTE, AXIS_TITLES.chartCityTop);
  renderVerticalBarChart('chartMonthCounts', metrics.month.labels, metrics.month.values, PALETTE, AXIS_TITLES.chartMonthCounts);
  renderVerticalBarChart('chartHourCounts', metrics.hour.labels, metrics.hour.values, PALETTE, AXIS_TITLES.chartHourCounts);
  renderVerticalBarChart('chartWeekdayCounts', metrics.weekday.labels, metrics.weekday.values, PALETTE, AXIS_TITLES.chartWeekdayCounts);
  renderVerticalBarChart('chartDecadeCounts', metrics.decade.labels, metrics.decade.values, PALETTE, AXIS_TITLES.chartDecadeCounts);
  renderBarChart('chartDelayByCountry', metrics.delayByCountry.labels, metrics.delayByCountry.values, PALETTE, AXIS_TITLES.chartDelayByCountry);
  renderDonutChart('chartImagePresence', metrics.image.labels, metrics.image.values, PALETTE);
  renderDonutChart('chartHemisphereDistribution', metrics.hemisphere.labels, metrics.hemisphere.values, PALETTE);
  renderVerticalBarChart('chartDelayDistribution', metrics.delayHistogram.labels, metrics.delayHistogram.values, PALETTE, AXIS_TITLES.chartDelayDistribution);
  renderScatterPlot('chartLatLonScatter', metrics.latLonPoints);
  renderDonutChart('chartShapeDistribution', metrics.shapeDistribution.labels, metrics.shapeDistribution.values, PALETTE);
  // Additional charts
  renderLineChart('chartAvgDelayByYear', metrics.delayAvgYear.labels, metrics.delayAvgYear.values, AXIS_TITLES.chartAvgDelayByYear);
  renderLineChart('chartCumulativeYear', metrics.cumulativeCounts.labels, metrics.cumulativeCounts.values, AXIS_TITLES.chartCumulativeYear);
  renderMultiLineChart('chartShapeTrendsDecade', metrics.shapeDecadeStacked.decades, metrics.shapeDecadeStacked.values, metrics.shapeDecadeStacked.shapes, PALETTE, AXIS_TITLES.chartShapeTrendsDecade);
  updateInsights(metrics);
  renderHeatmap('chartMonthHourHeatmap', metrics.monthHourMatrix, metrics.month.labels, metrics.hour.labels, PALETTE);
  renderRadialChart('chartHourRadial', metrics.hour.labels, metrics.hour.values, PALETTE);
  renderStackedBar('chartShapeDecadeStacked', metrics.shapeDecadeStacked, PALETTE, AXIS_TITLES.chartShapeDecadeStacked);
  
  // Render map with lat/lon points
  console.log('About to render map with', metrics.latLonPoints.length, 'points');
  
  // Add a small delay to ensure the container is fully rendered
  setTimeout(() => {
    renderLeafletMap(metrics.latLonPoints);
    console.log('Map rendering initiated');
  }, 100);
}

/**
 * Render or update the Leaflet map with the given set of latitude and
 * longitude points. The map is initialised once and reused on subsequent
 * calls. It adds ALL valid markers with clustering and heatmap options.
 * @param {Array<{lat:number,lon:number}>} points Array of lat/lon objects
 */
function renderLeafletMap(points) {
  console.log('=== renderLeafletMap called ===');
  console.log('Points received:', points);
  
  const mapContainer = document.getElementById('chartMap');
  if (!mapContainer) {
    console.error('Map container not found');
    return;
  }
  
  console.log('Map container found:', mapContainer);
  console.log('Container dimensions:', mapContainer.offsetWidth, 'x', mapContainer.offsetHeight);
  
  // Check if container has proper dimensions
  if (mapContainer.offsetWidth === 0 || mapContainer.offsetHeight === 0) {
    console.error('Map container has zero dimensions - CSS issue?');
    mapContainer.innerHTML = '<div style="display: flex; align-items: center; justify-content: center; height: 100%; color: #ef4444; font-size: 0.9rem;">Error: Map container has no dimensions. Check CSS.</div>';
    return;
  }
  
  // Clear the container first
  mapContainer.innerHTML = '';
  
  // Check if we have valid points
  if (!points || points.length === 0) {
    console.log('No points provided, showing message');
    mapContainer.innerHTML = '<div style="display: flex; align-items: center; justify-content: center; height: 100%; color: #94a3b8; font-size: 0.9rem;">No valid coordinates available for mapping</div>';
    return;
  }
  
  console.log('Rendering map with', points.length, 'points');
  console.log('Sample points:', points.slice(0, 5));
  
  // Check if Leaflet is available
  if (typeof L === 'undefined') {
    console.error('Leaflet library not loaded!');
    mapContainer.innerHTML = '<div style="display: flex; align-items: center; justify-content: center; height: 100%; color: #ef4444; font-size: 0.9rem;">Error: Leaflet map library not loaded</div>';
    return;
  }
  
  console.log('Leaflet library available:', L);
  
  try {
    // Initialize map only once
    if (!mapInstance) {
      console.log('Initializing new map instance');
      
      mapInstance = L.map('chartMap', {
        worldCopyJump: true,
        maxZoom: 18,
        minZoom: 2,
        zoomControl: true,
        attributionControl: true
      }).setView([20, 0], 2);
      
      console.log('Map instance created:', mapInstance);
      
      // Use a sophisticated, high-quality tile layer with multiple options
      const tileLayers = {
        'Dark': L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
          attribution: '© OpenStreetMap contributors, © CARTO',
          maxZoom: 18,
          subdomains: 'abcd'
        }),
        'Satellite': L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
          attribution: '© Esri, Maxar, Earthstar Geographics',
          maxZoom: 18
        }),
        'Terrain': L.tileLayer('https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png', {
          attribution: '© OpenTopoMap contributors',
          maxZoom: 17
        }),
        'Street': L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '© OpenStreetMap contributors',
          maxZoom: 18
        })
      };
      
      // Add default dark layer
      tileLayers['Dark'].addTo(mapInstance);
      
      // Add layer control
      L.control.layers(tileLayers).addTo(mapInstance);
      
      console.log('Tile layers and controls added');
    } else {
      console.log('Using existing map instance');
    }
    
    // Clear previous layers
    if (markerClusterGroup) {
      mapInstance.removeLayer(markerClusterGroup);
    }
    if (heatmapLayer) {
      mapInstance.removeLayer(heatmapLayer);
    }
    if (mapMarkers) {
      mapMarkers.forEach((m) => m.remove());
    }
    
    mapMarkers = [];
    
    // Process ALL points with valid coordinates (no limit)
    let validMarkers = 0;
    let invalidCoordinates = 0;
    const heatmapData = [];
    
    console.log('Processing', points.length, 'total points for markers');
    
    points.forEach(({ lat, lon }, index) => {
      if (!isNaN(lat) && !isNaN(lon) && lat !== 0 && lon !== 0 && lat !== 37.0902 && lon !== -95.7129) {
        try {
          // Find the corresponding data record for popup
          const record = originalData.find(r => {
            const rLat = parseFloat(r.lat || r.latitude);
            const rLon = parseFloat(r.lon || r.longitude);
            return rLat === lat && rLon === lon;
          });
          
          // Color coding based on UFO shape
          const shape = record?.shape || 'Unknown';
          let markerColor = '#3b82f6'; // Default blue
          let borderColor = '#1e40af';
          
          switch(shape.toLowerCase()) {
            case 'triangle':
              markerColor = '#ef4444'; // Red
              borderColor = '#dc2626';
              break;
            case 'disk':
            case 'circle':
              markerColor = '#10b981'; // Green
              borderColor = '#059669';
              break;
            case 'sphere':
            case 'orb':
              markerColor = '#f59e0b'; // Orange
              borderColor = '#d97706';
              break;
            case 'cigar':
              markerColor = '#8b5cf6'; // Purple
              borderColor = '#7c3aed';
              break;
            case 'diamond':
              markerColor = '#06b6d4'; // Cyan
              borderColor = '#0891b2';
              break;
            case 'oval':
              markerColor = '#84cc16'; // Lime
              borderColor = '#65a30d';
              break;
            case 'star':
              markerColor = '#f97316'; // Amber
              borderColor = '#ea580c';
              break;
            default:
              markerColor = '#3b82f6'; // Blue
              borderColor = '#1e40af';
          }
          
          // Create sophisticated marker
          const marker = L.circleMarker([lat, lon], {
            radius: 4,
            fillColor: markerColor,
            color: borderColor,
            weight: 1.5,
            opacity: 0.8,
            fillOpacity: 0.6
          });
          
          // Add sophisticated hover effects
          marker.on('mouseover', function() {
            this.setStyle({
              radius: 6,
              fillColor: '#ffffff',
              color: markerColor,
              weight: 2,
              fillOpacity: 0.9
            });
          });
          
          marker.on('mouseout', function() {
            this.setStyle({
              radius: 4,
              fillColor: markerColor,
              color: borderColor,
              weight: 1.5,
              fillOpacity: 0.6
            });
          });
          
          // Create detailed popup content
          if (record) {
            const popupContent = `
              <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; min-width: 280px; color: #333;">
                <div style="background: linear-gradient(135deg, ${markerColor}, ${borderColor}); color: white; padding: 10px; margin: -10px -10px 10px -10px; border-radius: 6px 6px 0 0;">
                  <h4 style="margin: 0; font-size: 14px; text-shadow: 1px 1px 2px rgba(0,0,0,0.3);">
                    <i class="fas fa-map-marker-alt"></i> ${record['column-city'] || 'Unknown City'}, ${record['column-country'] || 'Unknown Country'}
                  </h4>
                </div>
                <div style="padding: 0 6px;">
                  <p style="margin: 8px 0; font-size: 13px;">
                    <strong style="color: ${markerColor};">Shape:</strong> 
                    <span style="background: ${markerColor}20; padding: 3px 8px; border-radius: 12px; font-size: 11px; font-weight: 500;">${record['column-shape'] || 'Unknown'}</span>
                  </p>
                  <p style="margin: 8px 0; font-size: 13px;">
                    <strong style="color: ${markerColor};">Date:</strong> ${record['column-occurred'] || 'Unknown'}
                  </p>
                  <p style="margin: 8px 0; font-size: 13px;">
                    <strong style="color: ${markerColor};">Coordinates:</strong> ${lat.toFixed(4)}, ${lon.toFixed(4)}
                  </p>
                  ${record['column-summary'] ? `
                    <p style="margin: 10px 0; font-size: 12px; color: #666; font-style: italic; border-left: 3px solid ${markerColor}; padding-left: 10px; line-height: 1.4;">
                      "${record['column-summary'].substring(0, 120)}${record['column-summary'].length > 120 ? '...' : ''}"
                    </p>
                  ` : ''}
                  <div style="margin-top: 10px; padding-top: 8px; border-top: 1px solid #eee; font-size: 11px; color: #888;">
                    <i class="fas fa-info-circle"></i> Click for more details
                  </div>
                </div>
              </div>
            `;
            marker.bindPopup(popupContent, {
              maxWidth: 300,
              className: 'custom-popup'
            });
          } else {
            marker.bindPopup(`
              <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; min-width: 200px;">
                <h4 style="margin: 0 0 8px 0; color: #1f2937;">UFO Sighting</h4>
                <p style="margin: 4px 0; color: #6b7280;"><strong>Coordinates:</strong> ${lat.toFixed(4)}, ${lon.toFixed(4)}</p>
              </div>
            `);
          }
          
          mapMarkers.push(marker);
          validMarkers++;
          
          // Add to heatmap data
          heatmapData.push([lat, lon, 1]);
          
          if (index < 5) {
            console.log(`Added marker ${index}: [${lat}, ${lon}] - Shape: ${shape}`);
          }
        } catch (markerError) {
          console.error('Error adding marker:', markerError, 'for coordinates:', lat, lon);
        }
      } else {
        invalidCoordinates++;
      }
    });
    
    console.log('Added', validMarkers, 'valid markers to map');
    console.log('Skipped', invalidCoordinates, 'invalid coordinates');
    
    if (mapMarkers.length > 0) {
      try {
        // Create marker cluster group with custom styling
        markerClusterGroup = L.markerClusterGroup({
          chunkedLoading: true,
          maxClusterRadius: 50,
          spiderfyOnMaxZoom: true,
          showCoverageOnHover: true,
          zoomToBoundsOnClick: true,
          iconCreateFunction: function(cluster) {
            const count = cluster.getChildCount();
            let size, className;
            
            if (count < 10) {
              size = 'small';
              className = 'marker-cluster-small';
            } else if (count < 100) {
              size = 'medium';
              className = 'marker-cluster-medium';
            } else {
              size = 'large';
              className = 'marker-cluster-large';
            }
            
            return L.divIcon({
              html: `<div><span>${count}</span></div>`,
              className: `marker-cluster ${className}`,
              iconSize: L.point(40, 40)
            });
          }
        });
        
        // Add all markers to cluster group
        mapMarkers.forEach(marker => markerClusterGroup.addLayer(marker));
        mapInstance.addLayer(markerClusterGroup);
        
        // Create heatmap layer
        if (typeof L.heatLayer !== 'undefined' && heatmapData.length > 0) {
          heatmapLayer = L.heatLayer(heatmapData, {
            radius: 25,
            blur: 15,
            maxZoom: 10,
            gradient: {
              0.4: '#3b82f6',
              0.6: '#f59e0b',
              0.8: '#ef4444',
              1.0: '#dc2626'
            }
          });
          
          // Add heatmap layer (initially hidden)
          mapInstance.addLayer(heatmapLayer);
          heatmapLayer.setVisible(false);
        }
        
        // Fit bounds to all markers
        const group = L.featureGroup(mapMarkers);
        const bounds = group.getBounds();
        console.log('Map bounds:', bounds);
        
        // Set bounds with some padding for better view
        mapInstance.fitBounds(bounds.pad(0.1));
        console.log('Map bounds set successfully');
        
        // Add sophisticated legend with toggle controls
        const legend = L.control({ position: 'bottomright' });
        legend.onAdd = function() {
          const div = L.DomUtil.create('div', 'info legend');
          div.style.backgroundColor = 'rgba(0,0,0,0.9)';
          div.style.color = 'white';
          div.style.padding = '15px';
          div.style.borderRadius = '8px';
          div.style.fontSize = '12px';
          div.style.fontFamily = 'Arial, sans-serif';
          div.style.minWidth = '200px';
          div.style.boxShadow = '0 4px 12px rgba(0,0,0,0.3)';
          
          const shapes = [
            { shape: 'Triangle', color: '#ef4444' },
            { shape: 'Disk/Circle', color: '#10b981' },
            { shape: 'Sphere/Orb', color: '#f59e0b' },
            { shape: 'Cigar', color: '#8b5cf6' },
            { shape: 'Diamond', color: '#06b6d4' },
            { shape: 'Oval', color: '#84cc16' },
            { shape: 'Star', color: '#f97316' },
            { shape: 'Other', color: '#3b82f6' }
          ];
          
          div.innerHTML = `
            <h4 style="margin: 0 0 12px 0; text-align: center; border-bottom: 1px solid rgba(255,255,255,0.2); padding-bottom: 8px;">
              <i class="fas fa-map-marked-alt"></i> UFO Sightings Map
            </h4>
            <div style="margin-bottom: 12px;">
              <strong>Shapes:</strong>
            </div>
          `;
          
          shapes.forEach(item => {
            div.innerHTML += `
              <div style="margin: 4px 0; display: flex; align-items: center;">
                <span style="display: inline-block; width: 12px; height: 12px; background: ${item.color}; border-radius: 50%; margin-right: 8px; border: 1px solid rgba(255,255,255,0.3);"></span>
                ${item.shape}
              </div>
            `;
          });
          
          // Add view toggle buttons if heatmap is available
          if (heatmapLayer) {
            div.innerHTML += `
              <div style="margin-top: 12px; padding-top: 8px; border-top: 1px solid rgba(255,255,255,0.2);">
                <strong>View Mode:</strong><br>
                <button id="viewMarkers" style="background: #3b82f6; color: white; border: none; padding: 4px 8px; margin: 2px; border-radius: 4px; cursor: pointer; font-size: 10px;">Markers</button>
                <button id="viewHeatmap" style="background: #6b7280; color: white; border: none; padding: 4px 8px; margin: 2px; border-radius: 4px; cursor: pointer; font-size: 10px;">Heatmap</button>
                <button id="viewBoth" style="background: #6b7280; color: white; border: none; padding: 4px 8px; margin: 2px; border-radius: 4px; cursor: pointer; font-size: 10px;">Both</button>
              </div>
            `;
          }
          
          div.innerHTML += `
            <div style="margin-top: 8px; font-size: 10px; color: #9ca3af; text-align: center;">
              ${validMarkers} sightings plotted
            </div>
          `;
          
          return div;
        };
        legend.addTo(mapInstance);
        
        // Add view toggle functionality
        setTimeout(() => {
          const viewMarkersBtn = document.getElementById('viewMarkers');
          const viewHeatmapBtn = document.getElementById('viewHeatmap');
          const viewBothBtn = document.getElementById('viewBoth');
          
          if (viewMarkersBtn && heatmapLayer) {
            viewMarkersBtn.onclick = function() {
              markerClusterGroup.setVisible(true);
              heatmapLayer.setVisible(false);
              currentMapMode = 'markers';
              updateViewButtons();
            };
            
            viewHeatmapBtn.onclick = function() {
              markerClusterGroup.setVisible(false);
              heatmapLayer.setVisible(true);
              currentMapMode = 'heatmap';
              updateViewButtons();
            };
            
            viewBothBtn.onclick = function() {
              markerClusterGroup.setVisible(true);
              heatmapLayer.setVisible(true);
              currentMapMode = 'both';
              updateViewButtons();
            };
            
            function updateViewButtons() {
              viewMarkersBtn.style.background = currentMapMode === 'markers' ? '#3b82f6' : '#6b7280';
              viewHeatmapBtn.style.background = currentMapMode === 'heatmap' ? '#3b82f6' : '#6b7280';
              viewBothBtn.style.background = currentMapMode === 'both' ? '#3b82f6' : '#6b7280';
            }
            
            // Set initial state
            updateViewButtons();
          }
        }, 100);
        
      } catch (boundsError) {
        console.error('Error setting map bounds:', boundsError);
        // Fallback to default view
        mapInstance.setView([20, 0], 2);
      }
    } else {
      // If no valid markers, show a default view
      console.log('No valid markers, showing default view');
      mapInstance.setView([20, 0], 2);
    }
    
    console.log('Map rendering completed successfully');
    
  } catch (error) {
    console.error('Error in renderLeafletMap:', error);
    mapContainer.innerHTML = '<div style="display: flex; align-items: center; justify-content: center; height: 100%; color: #ef4444; font-size: 0.9rem;">Error rendering map: ' + error.message + '</div>';
  }
}