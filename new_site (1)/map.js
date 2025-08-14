let mapInstance;
let markerClusterGroup;
let heatmapLayer;
let currentMapMode = 'markers';

function loadScript(src) {
  return new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = src;
    s.onload = resolve;
    s.onerror = reject;
    document.head.appendChild(s);
  });
}

async function ensureLeaflet() {
  if (typeof L === 'undefined') {
    await loadScript('https://unpkg.com/leaflet@1.9.4/dist/leaflet.js');
    await loadScript('https://unpkg.com/leaflet.markercluster@1.4.1/dist/leaflet.markercluster.js');
    await loadScript('https://unpkg.com/leaflet.heat@0.2.0/dist/leaflet-heat.js');
  }
}

export async function renderLeafletMap(points, data) {
  await ensureLeaflet();
  const container = document.getElementById('chartMap');
  if (!container) return;

  if (!mapInstance) {
    mapInstance = L.map(container).setView([20, 0], 2);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors'
    }).addTo(mapInstance);
  }

  if (markerClusterGroup) {
    markerClusterGroup.clearLayers();
  } else {
    markerClusterGroup = L.markerClusterGroup();
    mapInstance.addLayer(markerClusterGroup);
  }

  const heatData = [];
  points.forEach(({ lat, lon }) => {
    const marker = L.marker([lat, lon]);
    markerClusterGroup.addLayer(marker);
    heatData.push([lat, lon, 1]);
  });

  if (heatmapLayer) {
    heatmapLayer.setLatLngs(heatData);
  } else {
    heatmapLayer = L.heatLayer(heatData, { radius: 25, blur: 15 });
    if (currentMapMode !== 'markers') heatmapLayer.addTo(mapInstance);
  }

  if (points.length) {
    mapInstance.fitBounds(markerClusterGroup.getBounds());
  }
}

export function setMapMode(mode) {
  currentMapMode = mode;
  if (!mapInstance) return;
  if (mode === 'markers') {
    mapInstance.addLayer(markerClusterGroup);
    mapInstance.removeLayer(heatmapLayer);
  } else if (mode === 'heatmap') {
    mapInstance.removeLayer(markerClusterGroup);
    mapInstance.addLayer(heatmapLayer);
  } else {
    mapInstance.addLayer(markerClusterGroup);
    mapInstance.addLayer(heatmapLayer);
  }
}
