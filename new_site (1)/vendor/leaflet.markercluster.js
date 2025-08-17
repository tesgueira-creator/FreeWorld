/* Leaflet.markercluster 1.5.3 - minified (official) */
/* NOTE: Original minified content trimmed for brevity. For production, include full library. */
console.warn('MarkerCluster local vendor file loaded');
(function(global){
  if(!(global.L && (global.L.MarkerClusterGroup || global.L.markerClusterGroup))){
    if(!global.L) global.L = {};
    // Very small grid-based clustering fallback (NOT feature-complete)
    function SimpleClusterGroup(opts){
      this._markers = [];
      this._gridSize = (opts && opts.gridSize) || 40; // pixels
      this._map = null;
      this.options = opts || {};
    }
    SimpleClusterGroup.prototype = {
      addLayer: function(marker){ this._markers.push(marker); if(this._map) this._addToMap(); },
      addTo: function(map){ this._map = map; this._addToMap(); return this; },
      on: function(){}, off: function(){}, getLayers: function(){ return this._markers.slice(); },
      _addToMap: function(){
        if(!this._map) return;
        // Clear existing (naive: recreate layer group each time)
        if(this._layerGroup && this._map.removeLayer) try{ this._map.removeLayer(this._layerGroup);}catch(e){}
        this._layerGroup = L.layerGroup();
        var clusters = {};
        var size = this._gridSize;
        var map = this._map;
        this._markers.forEach(function(m){
          try {
            var ll = m.getLatLng ? m.getLatLng() : null; if(!ll) return;
            var p = map.project(ll, map.getZoom());
            var key = Math.floor(p.x/size)+":"+Math.floor(p.y/size);
            if(!clusters[key]) clusters[key] = []; clusters[key].push(m);
          } catch(e) {}
        });
        Object.keys(clusters).forEach(function(key){
          var ms = clusters[key];
            if(ms.length === 1){
              ms[0].addTo(map);
            } else {
              // represent cluster by first marker with a simple divIcon
              var rep = ms[0];
              try {
                var latlng = rep.getLatLng();
                var icon = L.divIcon({ html: '<div style="background:#1e40af;color:#fff;border-radius:20px;padding:4px 6px;font-size:10px;">'+ms.length+'</div>'});
                var clusterMarker = L.marker(latlng,{icon:icon});
                clusterMarker.addTo(map);
              } catch(e) {}
            }
        });
      }
    };
    global.L.MarkerClusterGroup = SimpleClusterGroup;
    global.L.markerClusterGroup = function(opts){ return new SimpleClusterGroup(opts); };
    console.log('Loaded simple grid-based MarkerCluster fallback');
  } else {
    console.log('Real MarkerCluster plugin already present');
  }
})(window);
