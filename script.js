// Initialize responsive map
var map = L.map('map', {
    zoomControl: false // We'll add custom controls
}).setView([28.6139, 77.2090], 6);

// Add zoom control to top right
L.control.zoom({
    position: 'topright'
}).addTo(map);

// Add responsive tile layer
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; OpenStreetMap contributors',
    maxZoom: 18,
    tileSize: 256,
    zoomOffset: 0
}).addTo(map);

var disasterZones = null;
var currentMarker = null;

// UI Elements
const sidebar = document.getElementById('sidebar');
const sidebarToggle = document.getElementById('sidebar-toggle');
const infoContent = document.getElementById('info-content');
const disasterTypeSelect = document.getElementById('disaster-type');
const locateBtn = document.getElementById('locate-btn');
const statusText = document.getElementById('status-text');

// Mobile sidebar toggle
sidebarToggle.addEventListener('click', function() {
    sidebar.classList.toggle('open');
    const icon = this.querySelector('i');
    icon.classList.toggle('fa-bars');
    icon.classList.toggle('fa-times');
});

// Sample disaster data (replace with your GeoJSON loading)
const sampleDisasterZones = {
    "type": "FeatureCollection",
    "features": [
        {
            "type": "Feature",
            "properties": {
                "name": "Uttarakhand Landslide Zone",
                "type": "landslide",
                "risk_level": "high",
                "description": "High risk area for landslides during monsoon season"
            },
            "geometry": {
                "type": "Polygon",
                "coordinates": [[[78.5, 30.5], [79.5, 30.5], [79.5, 31.5], [78.5, 31.5], [78.5, 30.5]]]
            }
        },
        {
            "type": "Feature", 
            "properties": {
                "name": "Gujarat Flood Zone",
                "type": "flood",
                "risk_level": "medium",
                "description": "Moderate flood risk during heavy rainfall"
            },
            "geometry": {
                "type": "Polygon",
                "coordinates": [[[72.0, 22.0], [73.0, 22.0], [73.0, 23.0], [72.0, 23.0], [72.0, 22.0]]]
            }
        }
    ]
};

// Load disaster zones
function loadDisasterZones(data) {
    if (disasterZones) {
        map.removeLayer(disasterZones);
    }

    disasterZones = L.geoJSON(data, {
        style: function(feature) {
            const riskColors = {
                'high': '#e74c3c',
                'medium': '#f39c12', 
                'low': '#27ae60'
            };
            
            return {
                color: riskColors[feature.properties.risk_level] || '#667eea',
                weight: 2,
                fillOpacity: 0.4,
                fillColor: riskColors[feature.properties.risk_level] || '#667eea'
            };
        },
        onEachFeature: function(feature, layer) {
            const popup = `
                <div class="custom-popup">
                    <h4><i class="fas fa-exclamation-triangle"></i> ${feature.properties.name || "Unknown Area"}</h4>
                    <p><strong>Type:</strong> ${feature.properties.type || "Unknown"}</p>
                    <p><strong>Description:</strong> ${feature.properties.description || "No description available"}</p>
                    <span class="risk-level ${feature.properties.risk_level || 'medium'}">
                        ${(feature.properties.risk_level || 'medium').toUpperCase()} RISK
                    </span>
                </div>
            `;
            layer.bindPopup(popup);
        }
    }).addTo(map);
}

// Initialize with sample data
loadDisasterZones(sampleDisasterZones);

// Disaster type filter
disasterTypeSelect.addEventListener('change', function() {
    const selectedType = this.value;
    
    if (disasterZones) {
        disasterZones.eachLayer(function(layer) {
            if (selectedType === 'all' || layer.feature.properties.type === selectedType) {
                layer.setStyle({ opacity: 1, fillOpacity: 0.4 });
            } else {
                layer.setStyle({ opacity: 0.2, fillOpacity: 0.1 });
            }
        });
    }
});

// Geolocation
locateBtn.addEventListener('click', function() {
    const btn = this;
    const originalHTML = btn.innerHTML;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Locating...';
    btn.disabled = true;

    map.locate({ setView: true, maxZoom: 12 });
    
    setTimeout(() => {
        btn.innerHTML = originalHTML;
        btn.disabled = false;
    }, 3000);
});

map.on('locationfound', function(e) {
    if (currentMarker) {
        map.removeLayer(currentMarker);
    }
    
    currentMarker = L.marker(e.latlng).addTo(map)
        .bindPopup('<strong>Your Location</strong><br>Lat: ' + e.latlng.lat.toFixed(4) + '<br>Lng: ' + e.latlng.lng.toFixed(4))
        .openPopup();
});

map.on('locationerror', function(e) {
    updateStatus('Location access denied', 'offline');
});

// Improved point-in-polygon check
function checkDisasterRisk(latlng) {
    if (!disasterZones) return [];
    
    let riskAreas = [];
    disasterZones.eachLayer(function(layer) {
        // Simple bounds check first
        if (layer.getBounds().contains(latlng)) {
            // For more accurate point-in-polygon, you could use turf.js
            riskAreas.push({
                ...layer.feature.properties,
                bounds: layer.getBounds()
            });
        }
    });
    return riskAreas;
}

// Weather API function (replace YOUR_API_KEY with actual key)
async function fetchWeather(lat, lon) {
    const WEATHER_API_KEY = 'YOUR_API_KEY'; // Replace with your OpenWeatherMap API key
    const WEATHER_API_URL = 'https://api.openweathermap.org/data/2.5/weather';
    const url = `${WEATHER_API_URL}?lat=${lat}&lon=${lon}&units=metric&appid=${WEATHER_API_KEY}`;
    
    try {
        const response = await fetch(url);
        if (!response.ok) throw new Error('Weather data fetch failed');
        const data = await response.json();
        return data;
    } catch (err) {
        console.error('Weather fetch error:', err);
        // Return mock data if API fails
        return {
            weather: [{ description: 'partly cloudy', icon: '02d' }],
            main: { temp: 28, humidity: 65, feels_like: 32 },
            wind: { speed: 3.2 },
            name: 'Location'
        };
    }
}

// Enhanced map click handler
map.on('click', async function(e) {
    const { lat, lng } = e.latlng;
    
    // Close mobile sidebar
    sidebar.classList.remove('open');
    sidebarToggle.querySelector('i').classList.add('fa-bars');
    sidebarToggle.querySelector('i').classList.remove('fa-times');

    // Show loading state
    infoContent.innerHTML = `
        <div class="loading">
            <div class="spinner"></div>
            <span>Loading location data...</span>
        </div>
    `;

    try {
        // Add/update marker
        if (currentMarker) {
            map.removeLayer(currentMarker);
        }
        currentMarker = L.marker(e.latlng).addTo(map);

        // Build info content
        let content = `
            <div class="info-card">
                <h3><i class="fas fa-map-marker-alt"></i> Coordinates</h3>
                <p><strong>Latitude:</strong> ${lat.toFixed(6)}</p>
                <p><strong>Longitude:</strong> ${lng.toFixed(6)}</p>
            </div>
        `;

        // Check disaster risk
        const riskAreas = checkDisasterRisk(e.latlng);
        if (riskAreas.length > 0) {
            riskAreas.forEach(area => {
                content += `
                    <div class="info-card risk-${area.risk_level || 'medium'}">
                        <h3><i class="fas fa-exclamation-triangle"></i> ${area.name || 'Disaster Risk Area'}</h3>
                        <p><strong>Type:</strong> ${area.type || 'Unknown'}</p>
                        <p><strong>Risk Level:</strong> ${(area.risk_level || 'medium').toUpperCase()}</p>
                        <p>${area.description || 'No additional information available'}</p>
                    </div>
                `;
            });
        } else {
            content += `
                <div class="info-card risk-none">
                    <h3><i class="fas fa-check-circle"></i> Risk Assessment</h3>
                    <p>No known disaster risks detected for this location based on available data.</p>
                </div>
            `;
        }

        // Fetch weather
        const weather = await fetchWeather(lat, lng);
        if (weather) {
            content += `
                <div class="weather-widget">
                    <div class="weather-icon">
                        <i class="fas fa-cloud-sun"></i>
                    </div>
                    <div class="weather-temp">${weather.main.temp}°C</div>
                    <p>${weather.weather[0].description}</p>
                    <p><small>Feels like ${weather.main.feels_like}°C • Humidity ${weather.main.humidity}% • Wind ${weather.wind.speed} m/s</small></p>
                </div>
            `;
        }

        infoContent.innerHTML = content;
        updateStatus('Data loaded successfully', 'online');

    } catch (error) {
        console.error('Error loading location data:', error);
        infoContent.innerHTML = `
            <div class="info-card">
                <h3><i class="fas fa-exclamation-circle"></i> Error</h3>
                <p>Unable to load complete location data. Please try again.</p>
            </div>
        `;
        updateStatus('Error loading data', 'offline');
    }
});

// Status update function
function updateStatus(message, status) {
    statusText.textContent = message;
    const indicator = document.querySelector('.status-indicator i');
    indicator.className = `fas fa-circle status-${status}`;
}

// Handle window resize for map responsiveness
window.addEventListener('resize', function() {
    setTimeout(() => {
        map.invalidateSize();
    }, 100);
});

// Initialize status
updateStatus('System ready - Click on map to explore', 'online');

// Auto-close sidebar on map interaction (mobile)
map.on('drag zoom', function() {
    if (window.innerWidth <= 768 && sidebar.classList.contains('open')) {
        sidebar.classList.remove('open');
        sidebarToggle.querySelector('i').classList.add('fa-bars');
        sidebarToggle.querySelector('i').classList.remove('fa-times');
    }
});

// Function to load your actual GeoJSON data (replace the sample data)
function loadActualDisasterData() {
    // Replace this with your actual GeoJSON file loading
    fetch('data/landslide_zones.geojson')
        .then(res => res.json())
        .then(data => {
            loadDisasterZones(data);
            updateStatus('Disaster zones loaded successfully', 'online');
        })
        .catch(err => {
            console.error('Error loading GeoJSON:', err);
            updateStatus('Error loading disaster data', 'offline');
            // Fallback to sample data
            loadDisasterZones(sampleDisasterZones);
        });
}

// Uncomment this line to load your actual data instead of sample data
// loadActualDisasterData();
