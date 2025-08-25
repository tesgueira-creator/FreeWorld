/*
 * Global JavaScript for FreeWorld XenoData
 *
 * This script implements basic interactive behaviour for the site. It
 * includes a contrast toggle, draws a simple scatter mini‑map on the
 * home page using latitude/longitude coordinates from the local
 * sightings dataset, and provides a minimal charting utility that
 * creates line charts without any external dependencies. All data is
 * loaded locally via fetch and processed in‑browser.
 */

(() => {
  /**
   * Add a click handler to the contrast toggle switch, if present.
   */
  function initContrastToggle() {
    const toggle = document.querySelector('#contrastToggle');
    if (!toggle) return;
    toggle.addEventListener('click', () => {
      document.body.classList.toggle('high-contrast');
    });
  }

  /**
   * Parse a CSV string into an array of objects. Assumes first line
   * contains headers separated by commas. Quoted fields are not
   * supported to keep the parser simple—our local datasets avoid
   * embedded commas.
   *
   * @param {string} text Raw CSV text
   * @returns {Object[]} Array of records
   */
  function parseCSV(text) {
    const lines = text.trim().split(/\r?\n/);
    const headers = lines[0].split(',');
    const records = [];
    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',');
      const obj = {};
      headers.forEach((h, idx) => {
        obj[h] = values[idx];
      });
      records.push(obj);
    }
    return records;
  }

  /**
   * Draw a scatter plot on a canvas representing lat/lon coordinates. A
   * simple equirectangular projection is used to map latitude and
   * longitude to x/y. Points are drawn as small neon circles. The
   * function automatically scales points to fit within the canvas.
   *
   * @param {HTMLCanvasElement} canvas
   * @param {Object[]} points Array of objects with `lat` and `lon` fields
   */
  function drawMiniMap(canvas, points) {
    const ctx = canvas.getContext('2d');
    const w = canvas.width;
    const h = canvas.height;
    ctx.clearRect(0, 0, w, h);
    // Compute bounds
    let minLat = 90, maxLat = -90, minLon = 180, maxLon = -180;
    points.forEach(p => {
      const lat = parseFloat(p.lat);
      const lon = parseFloat(p.lon);
      if (lat < minLat) minLat = lat;
      if (lat > maxLat) maxLat = lat;
      if (lon < minLon) minLon = lon;
      if (lon > maxLon) maxLon = lon;
    });
    // Add small padding
    const latPad = (maxLat - minLat) * 0.05;
    const lonPad = (maxLon - minLon) * 0.05;
    minLat -= latPad;
    maxLat += latPad;
    minLon -= lonPad;
    maxLon += lonPad;
    // Draw background grid
    ctx.fillStyle = '#192436';
    ctx.fillRect(0, 0, w, h);
    // Draw points
    points.forEach(p => {
      const lat = parseFloat(p.lat);
      const lon = parseFloat(p.lon);
      const x = ((lon - minLon) / (maxLon - minLon)) * w;
      const y = h - ((lat - minLat) / (maxLat - minLat)) * h;
      ctx.beginPath();
      ctx.arc(x, y, 2, 0, 2 * Math.PI);
      ctx.fillStyle = 'rgba(0, 255, 213, 0.7)';
      ctx.fill();
    });
  }

  /**
   * Render a basic multi‑series line chart without external libraries.
   * This function draws axes, gridlines, and labelled lines onto the
   * provided canvas. The datasets parameter should match the structure
   * of the JSON produced by the pre‑computed analytics (labels and
   * datasets with label and data arrays).
   *
   * @param {string} canvasId ID of the canvas element
   * @param {Object} chartData {labels: string[], datasets: {label:string, data:number[]}[]}
   * @param {Object} options Chart options (title, colours)
   */
  function drawLineChart(canvasId, chartData, options = {}) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const w = canvas.width;
    const h = canvas.height;
    ctx.clearRect(0, 0, w, h);
    // Compute global min/max
    let minY = Infinity;
    let maxY = -Infinity;
    chartData.datasets.forEach(ds => {
      ds.data.forEach(val => {
        if (val < minY) minY = val;
        if (val > maxY) maxY = val;
      });
    });
    if (minY === maxY) {
      // prevent flat line at bottom
      minY = 0;
    }
    const paddingLeft = 50;
    const paddingBottom = 40;
    const paddingTop = 30;
    const paddingRight = 20;
    const chartW = w - paddingLeft - paddingRight;
    const chartH = h - paddingTop - paddingBottom;
    // Draw axes
    ctx.strokeStyle = '#415a7a';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(paddingLeft, paddingTop);
    ctx.lineTo(paddingLeft, h - paddingBottom);
    ctx.lineTo(w - paddingRight, h - paddingBottom);
    ctx.stroke();
    // Draw gridlines & labels (vertical for every nth label to avoid clutter)
    const labelCount = chartData.labels.length;
    const stepX = chartW / (labelCount - 1);
    const ySteps = 5;
    for (let i = 0; i <= ySteps; i++) {
      const yVal = minY + ((maxY - minY) * i / ySteps);
      const yPos = h - paddingBottom - (chartH * i / ySteps);
      ctx.strokeStyle = '#24324f';
      ctx.beginPath();
      ctx.moveTo(paddingLeft, yPos);
      ctx.lineTo(w - paddingRight, yPos);
      ctx.stroke();
      ctx.fillStyle = '#8091a5';
      ctx.font = '10px sans-serif';
      ctx.textAlign = 'right';
      ctx.textBaseline = 'middle';
      ctx.fillText(yVal.toFixed(0), paddingLeft - 6, yPos);
    }
    // Draw vertical gridlines sparsely
    const xLabelStep = Math.ceil(labelCount / 6);
    for (let i = 0; i < labelCount; i += xLabelStep) {
      const xPos = paddingLeft + i * stepX;
      ctx.strokeStyle = '#24324f';
      ctx.beginPath();
      ctx.moveTo(xPos, paddingTop);
      ctx.lineTo(xPos, h - paddingBottom);
      ctx.stroke();
      const label = chartData.labels[i];
      ctx.fillStyle = '#8091a5';
      ctx.font = '9px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      ctx.fillText(label, xPos, h - paddingBottom + 4);
    }
    // Draw datasets
    const colours = ['#00ffd5', '#ff62b0', '#ffc857', '#00aaff', '#9d5bff', '#ff3f5a'];
    chartData.datasets.forEach((ds, dsIndex) => {
      ctx.strokeStyle = colours[dsIndex % colours.length];
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ds.data.forEach((val, i) => {
        const x = paddingLeft + stepX * i;
        const y = h - paddingBottom - ((val - minY) / (maxY - minY)) * chartH;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });
      ctx.stroke();
    });
    // Draw legend
    const legendX = w - paddingRight - 100;
    let legendY = paddingTop;
    chartData.datasets.forEach((ds, dsIndex) => {
      ctx.fillStyle = colours[dsIndex % colours.length];
      ctx.fillRect(legendX, legendY, 12, 4);
      ctx.fillStyle = '#e2e8f0';
      ctx.font = '10px sans-serif';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.fillText(ds.label, legendX + 16, legendY + 2);
      legendY += 14;
    });
    // Chart title
    if (options.title) {
      ctx.fillStyle = '#e2e8f0';
      ctx.font = '12px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(options.title, paddingLeft + chartW / 2, paddingTop - 15);
    }
  }

  /**
   * When the document is ready, initialise interactive elements. Only
   * run code specific to the page when relevant elements are detected.
   */
  function init() {
    initContrastToggle();
    // Home mini map
    const miniMapCanvas = document.getElementById('miniMap');
    if (miniMapCanvas) {
      fetch('data/sightings.csv')
        .then(res => res.text())
        .then(text => {
          const records = parseCSV(text);
          // sample a subset for performance
          drawMiniMap(miniMapCanvas, records.slice(0, 500));
        })
        .catch(err => console.error('Error loading mini map data', err));
    }
    // Analytics example charts
    const chartCanvas = document.getElementById('shapeTrendChart');
    if (chartCanvas) {
      fetch('data/monthly_shape_counts.json')
        .then(res => res.json())
        .then(json => {
          drawLineChart('shapeTrendChart', json, { title: 'Monthly sighting counts by shape' });
          // Draw charts on analytics page if present. Iterate through
          // predefined IDs; if the element exists, draw using the same
          // dataset for demonstration. In a complete build this array
          // would map to distinct computations (e.g. confidence trend,
          // shape diversity, etc.).
          const ids = ['chart1','chart2','chart3','chart4','chart5','chart6'];
          ids.forEach(id => {
            const c = document.getElementById(id);
            if (c) {
              drawLineChart(id, json, { title: 'Monthly counts by shape' });
            }
          });
        })
        .catch(err => console.error('Error loading chart data', err));
    }

    // Initialise sightings table if present
    const sightingsTable = document.getElementById('sightingsTable');
    if (sightingsTable) {
      initSightingsTable();
    }

    // Initialise interactive map page
    const mainMapCanvas = document.getElementById('mainMap');
    if (mainMapCanvas) {
      initMainMap();
    }

    // Timeline page initialisation
    const timelineCanvas = document.getElementById('timeline1');
    if (timelineCanvas) {
      initTimeline();
    }

    // Parks page initialisation
    const parksList = document.getElementById('parksList');
    if (parksList) {
      initParks();
    }
  }

  document.addEventListener('DOMContentLoaded', init);

  /**
   * Initialise the National Parks page. Loads aggregated counts of
   * sightings near parks and renders a simple list with proportionate
   * bars to visualise activity. This avoids complex canvas charts for
   * accessibility and performance while conveying relative frequencies.
   */
  function initParks() {
    fetch('data/parks_counts.json')
      .then(res => res.json())
      .then(data => {
        const container = document.getElementById('parksList');
        const max = data.reduce((m, d) => Math.max(m, d.count), 0);
        data.sort((a, b) => b.count - a.count);
        data.forEach(item => {
          const row = document.createElement('div');
          row.style.display = 'flex';
          row.style.alignItems = 'center';
          row.style.marginBottom = '8px';
          const label = document.createElement('span');
          label.textContent = `${item.park} (${item.region})`;
          label.style.flex = '0 0 200px';
          label.style.fontSize = '0.8rem';
          label.style.color = 'var(--color-text)';
          const barContainer = document.createElement('div');
          barContainer.style.flex = '1';
          barContainer.style.backgroundColor = 'var(--color-surface)';
          barContainer.style.borderRadius = '4px';
          barContainer.style.height = '8px';
          const bar = document.createElement('div');
          const width = max > 0 ? (item.count / max) * 100 : 0;
          bar.style.width = width + '%';
          bar.style.height = '100%';
          bar.style.backgroundColor = 'var(--color-accent)';
          bar.style.borderRadius = '4px';
          barContainer.appendChild(bar);
          const value = document.createElement('span');
          value.textContent = item.count;
          value.style.marginLeft = '8px';
          value.style.fontSize = '0.8rem';
          value.style.color = 'var(--color-muted)';
          row.appendChild(label);
          row.appendChild(barContainer);
          row.appendChild(value);
          container.appendChild(row);
        });
      })
      .catch(err => console.error('Error loading parks data', err));
  }

  /**
   * Initialise the timeline page. Draws a series of mini line charts
   * representing different time streams. Uses the same underlying
   * monthly_shape_counts dataset for demonstration but could be
   * adapted for multiple dimensions (e.g. by shape, city).
   */
  function initTimeline() {
    fetch('data/monthly_shape_counts.json')
      .then(res => res.json())
      .then(json => {
        const ids = ['timeline1','timeline2','timeline3','timeline4','timeline5'];
        ids.forEach(id => {
          if (document.getElementById(id)) {
            drawLineChart(id, json, { title: '' });
          }
        });
      })
      .catch(err => console.error('Error loading timeline data', err));
  }

  /**
   * Initialise the main map page. Loads all sightings and draws a
   * scatter plot on a large canvas. Provides a shape filter that
   * redraws the map when changed.
   */
  function initMainMap() {
    const canvas = document.getElementById('mainMap');
    const shapeSelect = document.getElementById('mapShapeFilter');
    let records = [];
    fetch('data/sightings.csv')
      .then(res => res.text())
      .then(text => {
        records = parseCSV(text);
        // populate shape dropdown
        const uniqueShapes = Array.from(new Set(records.map(r => r.shape))).sort();
        uniqueShapes.unshift('All');
        uniqueShapes.forEach(shape => {
          const opt = document.createElement('option');
          opt.value = shape;
          opt.textContent = shape;
          shapeSelect.appendChild(opt);
        });
        draw();
      });
    shapeSelect.addEventListener('change', () => draw());
    function draw() {
      const selected = shapeSelect.value;
      const pts = records.filter(r => selected === 'All' || r.shape === selected);
      drawMiniMap(canvas, pts);
    }
  }

  /**
   * Initialise the sightings table by loading the CSV, populating
   * filter options and rendering the initial page. Implements
   * client‑side pagination and simple filtering by description text
   * and shape. Page size is fixed at 50 rows.
   */
  function initSightingsTable() {
    const searchInput = document.getElementById('sightingSearch');
    const shapeSelect = document.getElementById('shapeFilter');
    const paginationContainer = document.getElementById('pagination');
    const tableBody = document.querySelector('#sightingsTable tbody');
    let allRecords = [];
    let filteredRecords = [];
    const pageSize = 50;
    let currentPage = 1;
    // Load CSV once
    fetch('data/sightings.csv')
      .then(res => res.text())
      .then(text => {
        allRecords = parseCSV(text);
        // Populate shape dropdown
        const uniqueShapes = Array.from(new Set(allRecords.map(r => r.shape))).sort();
        uniqueShapes.unshift('All');
        uniqueShapes.forEach(shape => {
          const opt = document.createElement('option');
          opt.value = shape;
          opt.textContent = shape;
          shapeSelect.appendChild(opt);
        });
        // Initial render
        applyFilters();
        // Attach event listeners
        searchInput.addEventListener('input', () => {
          applyFilters();
        });
        shapeSelect.addEventListener('change', () => {
          applyFilters();
        });
      })
      .catch(err => console.error('Error loading sightings data', err));

    function applyFilters() {
      const searchTerm = searchInput.value.trim().toLowerCase();
      const selectedShape = shapeSelect.value;
      filteredRecords = allRecords.filter(r => {
        const matchesShape = selectedShape === 'All' || r.shape === selectedShape;
        const matchesSearch = r.description.toLowerCase().includes(searchTerm);
        return matchesShape && matchesSearch;
      });
      currentPage = 1;
      renderPage();
      renderPagination();
    }

    function renderPage() {
      tableBody.innerHTML = '';
      const start = (currentPage - 1) * pageSize;
      const end = start + pageSize;
      const pageRecords = filteredRecords.slice(start, end);
      pageRecords.forEach(rec => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
          <td>${rec.datetime}</td>
          <td>${rec.city}, ${rec.state}, ${rec.country}</td>
          <td>${rec.shape}</td>
          <td>${rec.duration}</td>
          <td>${parseFloat(rec.confidence).toFixed(2)}</td>
        `;
        tableBody.appendChild(tr);
      });
    }

    function renderPagination() {
      paginationContainer.innerHTML = '';
      const totalPages = Math.max(1, Math.ceil(filteredRecords.length / pageSize));
      function createBtn(label, page) {
        const btn = document.createElement('button');
        btn.textContent = label;
        btn.disabled = page < 1 || page > totalPages || page === currentPage;
        btn.addEventListener('click', () => {
          currentPage = page;
          renderPage();
          renderPagination();
        });
        return btn;
      }
      paginationContainer.appendChild(createBtn('« First', 1));
      paginationContainer.appendChild(createBtn('‹ Prev', currentPage - 1));
      const info = document.createElement('span');
      info.style.margin = '0 8px';
      info.textContent = `Page ${currentPage} of ${totalPages}`;
      paginationContainer.appendChild(info);
      paginationContainer.appendChild(createBtn('Next ›', currentPage + 1));
      paginationContainer.appendChild(createBtn('Last »', totalPages));
    }
  }
})();