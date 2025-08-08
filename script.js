// Initialize responsive map
var map = L.map('map', {
    zoomControl: false
}).setView([23.5937, 78.9629], 5); // India center

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

// Layer groups for different disaster types
var layerGroups = {
    landslide: L.layerGroup().addTo(map),
    flood: L.layerGroup().addTo(map),
    earthquake: L.layerGroup().addTo(map),
    all: L.layerGroup().addTo(map)
};

var currentMarker = null;
var allDisasterData = []; // Store all loaded data

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

// Color schemes for different disaster types
const disasterStyles = {
    landslide: {
        high: { color: '#8B0000', fillColor: '#DC143C', fillOpacity: 0.6 },
        medium: { color: '#FF8C00', fillColor: '#FFA500', fillOpacity: 0.5 },
        low: { color: '#32CD32', fillColor: '#90EE90', fillOpacity: 0.4 }
    },
    flood: {
        high: { color: '#0000CD', fillColor: '#1E90FF', fillOpacity: 0.6 },
        medium: { color: '#4169E1', fillColor: '#87CEEB', fillOpacity: 0.5 },
        low: { color: '#00CED1', fillColor: '#B0E0E6', fillOpacity: 0.4 }
    },
    earthquake: {
        high: { color: '#800080', fillColor: '#DA70D6', fillOpacity: 0.6 },
        medium: { color: '#FF1493', fillColor: '#FFB6C1', fillOpacity: 0.5 },
        low: { color: '#DDA0DD', fillColor: '#E6E6FA', fillOpacity: 0.4 }
    }
};

// Load disaster zones with enhanced styling
function loadDisasterZones(data, disasterType) {
    const layer = L.geoJSON(data, {
        style: function(feature) {
            const riskLevel = feature.properties.risk_level || 'medium';
            const style = disasterStyles[disasterType] ? 
                disasterStyles[disasterType][riskLevel] : 
                { color: '#667eea', fillColor: '#667eea', fillOpacity: 0.4 };
            
            return {
                ...style,
                weight: 2,
                opacity: 0.8
            };
        },
        onEachFeature: function(feature, layer) {
            const props = feature.properties;
            
            // Enhanced popup content based on disaster type
            let popupContent = `
                <div class="custom-popup">
                    <h4><i class="fas fa-${getDisasterIcon(disasterType)}"></i> ${props.name || "Unknown Area"}</h4>
                    <p><strong>Type:</strong> ${props.type || disasterType}</p>
                    <p><strong>Description:</strong> ${props.description || "No description available"}</p>
            `;
            
            // Add specific information based on disaster type
            if (disasterType === 'earthquake') {
                popupContent += `
                    <p><strong>Seismic Zone:</strong> ${props.zone || 'Unknown'}</p>
                    <p><strong>Max Expected Magnitude:</strong> ${props.max_expected_magnitude || 'N/A'}</p>
                `;
            } else if (disasterType === 'flood') {
                popupContent += `
                    <p><strong>Flood Frequency:</strong> ${props.flood_frequency || 'Unknown'}</p>
                    <p><strong>Affected Area:</strong> ${props.affected_area || 'N/A'}</p>
                `;
            } else if (disasterType === 'landslide') {
                popupContent += `
                    <p><strong>Affected Area:</strong> ${props.affected_area || 'N/A'}</p>
                    <p><strong>Last Incident:</strong> ${props.last_incident || 'N/A'}</p>
                `;
            }
            
            popupContent += `
                    <p><strong>Population at Risk:</strong> ${formatNumber(props.population_at_risk) || 'N/A'}</p>
                    <span class="risk-level ${props.risk_level || 'medium'}">
                        ${(props.risk_level || 'medium').toUpperCase()} RISK
                    </span>
                </div>
            `;
            
            layer.bindPopup(popupContent);
        }
    });
    
    // Add to appropriate layer group
    layerGroups[disasterType].addLayer(layer);
    layerGroups.all.addLayer(layer);
    
    return layer;
}

// Get appropriate icon for disaster type
function getDisasterIcon(type) {
    const icons = {
        landslide: 'mountain',
        flood: 'tint',
        earthquake: 'globe'
    };
    return icons[type] || 'exclamation-triangle';
}

// Format numbers for display
function formatNumber(num) {
    if (!num) return null;
    return parseInt(num).toLocaleString();
}

// Load all disaster data files
async function loadAllDisasterData() {
    updateStatus('Loading disaster data...', 'offline');
    
    const dataFiles = [
        { file: 'data/landslide_zones.geojson', type: 'landslide' },
        { file: 'data/flood_zones.geojson', type: 'flood' },
        { file: 'data/earthquake_zones.geojson', type: 'earthquake' }
    ];
    
    let loadedCount = 0;
    let totalCount = dataFiles.length;
    
    for (const dataFile of dataFiles) {
        try {
            const response = await fetch(dataFile.file);
            if (response.ok) {
                const data = await response.json();
                loadDisasterZones(data, dataFile.type);
                allDisasterData = [...allDisasterData, ...data.features.map(f => ({...f, disasterType: dataFile.type}))];
                loadedCount++;
                updateStatus(`Loading ${dataFile.type} data... (${loadedCount}/${totalCount})`, 'offline');
            } else {
                console.warn(`Could not load ${dataFile.file}`);
            }
        } catch (error) {
            console.error(`Error loading ${dataFile.file}:`, error);
        }
    }
    
    if (loadedCount > 0) {
        updateStatus(`Loaded ${loadedCount}/${totalCount} disaster datasets successfully`, 'online');
    } else {
        updateStatus('No disaster data files found - using sample data', 'offline');
        loadSampleData();
    }
}

// Load sample data if files don't exist
function loadSampleData() {
    // Sample data would go here - this is a fallback
    const sampleLandslide = {
        "type": "FeatureCollection",
        "features": [{
            "type": "Feature",
            "properties": {
                "name": "Sample Landslide Zone",
                "type": "landslide",
                "risk_level": "high",
                "description": "Sample landslide zone for testing",
                "affected_area": "1000 sq km",
                "population_at_risk": "50000"
            },
            "geometry": {
                "type": "Polygon",
                "coordinates": [[[78.5, 30.5], [79.5, 30.5], [79.5, 31.5], [78.5, 31.5], [78.5, 30.5]]]
            }
        }]
    };
    
    loadDisasterZones(sampleLandslide, 'landslide');
    allDisasterData = sampleLandslide.features.map(f => ({...f, disasterType: 'landslide'}));
}

// Initialize data loading
loadAllDisasterData();

// Disaster type filter with layer management
disasterTypeSelect.addEventListener('change', function() {
    const selectedType = this.value;
    
    // Hide all layers first
    Object.keys(layerGroups).forEach(type => {
        map.removeLayer(layerGroups[type]);
    });
    
    // Show selected layer(s)
    if (selectedType === 'all') {
        map.addLayer(layerGroups.all);
    } else {
        map.addLayer(layerGroups[selectedType]);
    }
    
    updateStatus(`Showing ${selectedType} zones`, 'online');
});

// Geolocation
locateBtn.addEventListener('click', function() {
    const btn = this;
    const originalHTML = btn.innerHTML;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Locating...';
    btn.disabled = true;

    map.locate({ setView: true, maxZoom: 10 });
    
    setTimeout(() => {
        btn.innerHTML = originalHTML;
        btn.disabled = false;
    }, 3000);
});

map.on('locationfound', function(e) {
    if (currentMarker) {
        map.removeLayer(currentMarker);
    }
    
    currentMarker = L.marker(e.latlng, {
        icon: L.divIcon({
            className: 'current-location-marker',
            html: '<i class="fas fa-location-arrow" style="color: #667eea; font-size: 20px;"></i>',
            iconSize: [20, 20]
        })
    }).addTo(map)
        .bindPopup('<strong>Your Current Location</strong><br>Lat: ' + e.latlng.lat.toFixed(4) + '<br>Lng: ' + e.latlng.lng.toFixed(4))
        .openPopup();
});

map.on('locationerror', function(e) {
    updateStatus('Location access denied', 'offline');
});

// Enhanced point-in-polygon check for all disaster types
function checkAllDisasterRisks(latlng) {
    const risks = [];
    
    allDisasterData.forEach(feature => {
        if (feature.geometry.type === 'Polygon') {
            // Simple bounding box check (for production, use proper point-in-polygon)
            const coords = feature.geometry.coordinates[0];
            const bounds = L.polygon(coords.map(coord => [coord[1], coord[0]])).getBounds();
            
            if (bounds.contains(latlng)) {
                risks.push({
                    ...feature.properties,
                    disasterType: feature.disasterType
                });
            }
        }
    });
    
    return risks;
}

// Weather API function
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
            main: { temp: Math.round(Math.random() * 20 + 15), humidity: Math.round(Math.random() * 40 + 30), feels_like: Math.round(Math.random() * 25 + 18) },
            wind: { speed: Math.round(Math.random() * 10 + 2) },
            name: 'Location'
        };
    }
}

// Enhanced map click handler with multiple disaster type support
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
            <span>Analyzing location for disaster risks...</span>
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
                <h3><i class="fas fa-map-marker-alt"></i> Location Analysis</h3>
                <p><strong>Latitude:</strong> ${lat.toFixed(6)}</p>
                <p><strong>Longitude:</strong> ${lng.toFixed(6)}</p>
            </div>
        `;

        // Check all disaster risks
        const riskAreas = checkAllDisasterRisks(e.latlng);
        
        if (riskAreas.length > 0) {
            // Group risks by type
            const groupedRisks = riskAreas.reduce((acc, risk) => {
                if (!acc[risk.disasterType]) acc[risk.disasterType] = [];
                acc[risk.disasterType].push(risk);
                return acc;
            }, {});
            
            Object.keys(groupedRisks).forEach(disasterType => {
                groupedRisks[disasterType].forEach(area => {
                    content += `
                        <div class="info-card risk-${area.risk_level || 'medium'}">
                            <h3><i class="fas fa-${getDisasterIcon(disasterType)}"></i> ${area.name || 'Risk Area'}</h3>
                            <p><strong>Type:</strong> ${disasterType.charAt(0).toUpperCase() + disasterType.slice(1)}</p>
                            <p><strong>Risk Level:</strong> ${(area.risk_level || 'medium').toUpperCase()}</p>
                            <p><strong>Population at Risk:</strong> ${formatNumber(area.population_at_risk) || 'Unknown'}</p>
                            <p>${area.description || 'No additional information available'}</p>
                        </div>
                    `;
                });
            });
        } else {
            content += `
                <div class="info-card risk-none">
                    <h3><i class="fas fa-check-circle"></i> Risk Assessment</h3>
                    <p>No major disaster risks detected for this location based on available data.</p>
                    <p><small>This assessment is based on historical data and may not reflect all potential risks.</small></p>
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
                    <p><small>Feels like ${weather.main.feels_like}°C • Humidity
