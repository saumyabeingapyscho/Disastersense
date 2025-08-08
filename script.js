// Initialize map
var map = L.map('map').setView([28.6139, 77.2090], 6); // India center

// Add OpenStreetMap base layer
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  attribution: '&copy; OpenStreetMap contributors'
}).addTo(map);

var disasterZones = []; // store polygons here

// Load GeoJSON (example landslide zones)
fetch('data/landslide_zones.geojson')
  .then(res => res.json())
  .then(data => {
    disasterZones = L.geoJSON(data, {
      style: {
        color: 'red',
        weight: 2,
        fillOpacity: 0.4
      },
      onEachFeature: function(feature, layer) {
        layer.bindPopup(`
          <strong>Risk Area:</strong> ${feature.properties.name || "Unknown"}<br/>
          <strong>Type:</strong> ${feature.properties.type || "Landslide"}
        `);
      }
    }).addTo(map);
  })
  .catch(err => console.error('Error loading GeoJSON:', err));

// Sidebar element
var infoContent = document.getElementById('info-content');

// Helper: Check if point is inside any disaster polygon
function checkDisasterRisk(latlng) {
  if (!disasterZones) return null;
  let riskAreas = [];

  disasterZones.eachLayer(function(layer) {
    if (layer.getBounds().contains(latlng)) {
      // For polygons, use leaflet-pip or turf.js for exact point-in-polygon if needed
      // Here, simple bounding box check (fast but rough)
      riskAreas.push(layer.feature.properties);
    }
  });

  return riskAreas;
}

// OpenWeatherMap API setup (replace YOUR_API_KEY)
const WEATHER_API_KEY = 'YOUR_API_KEY';
const WEATHER_API_URL = 'https://api.openweathermap.org/data/2.5/weather';

// Fetch weather data by lat/lon
async function fetchWeather(lat, lon) {
  const url = `${WEATHER_API_URL}?lat=${lat}&lon=${lon}&units=metric&appid=${WEATHER_API_KEY}`;
  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error('Weather data fetch failed');
    const data = await response.json();
    return data;
  } catch (err) {
    console.error(err);
    return null;
  }
}

// On map click event
map.on('click', async function(e) {
  const { lat, lng } = e.latlng;

  infoContent.innerHTML = `<p><strong>Coordinates:</strong> ${lat.toFixed(4)}, ${lng.toFixed(4)}</p>`;
  infoContent.innerHTML += `<p>Fetching weather and risk info...</p>`;

  // Check disaster risk
  const riskAreas = checkDisasterRisk(e.latlng);
  if (riskAreas.length > 0) {
    infoContent.innerHTML += `<p style="color:red"><strong>Disaster Risk Areas:</strong></p>`;
    riskAreas.forEach(area => {
      infoContent.innerHTML += `<p>Type: ${area.type || "Unknown"}, Name: ${area.name || "Unnamed"}</p>`;
    });
  } else {
    infoContent.innerHTML += `<p>No known disaster risk in this location.</p>`;
  }

  // Fetch weather
  const weather = await fetchWeather(lat, lng);
  if (weather) {
    infoContent.innerHTML += `
      <p><strong>Weather:</strong> ${weather.weather[0].description}, Temp: ${weather.main.temp}°C, Humidity: ${weather.main.humidity}%</p>
      <p><strong>Wind Speed:</strong> ${weather.wind.speed} m/s</p>
    `;
  } else {
    infoContent.innerHTML += `<p>Weather data unavailable.</p>`;
  }
});
