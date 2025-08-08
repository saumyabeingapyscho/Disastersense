// Initialize map
var map = L.map('map').setView([28.6139, 77.2090], 5); // Default view: India

// Add OpenStreetMap base layer
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  attribution: '&copy; OpenStreetMap contributors'
}).addTo(map);

// Load GeoJSON (e.g., Landslide-prone zones)
fetch('data/landslide_zones.geojson')
  .then(response => response.json())
  .then(data => {
    L.geoJSON(data, {
      style: {
        color: 'red',
        weight: 1,
        fillOpacity: 0.4
      },
      onEachFeature: function (feature, layer) {
        if (feature.properties) {
          layer.bindPopup(`
            <strong>Risk Area:</strong> ${feature.properties.name || "Unknown"}<br/>
            <strong>Type:</strong> ${feature.properties.type || "Landslide"}
          `);
        }
      }
    }).addTo(map);
  })
  .catch(err => console.error('Error loading GeoJSON:', err));
