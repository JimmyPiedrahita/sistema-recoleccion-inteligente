// Global Variables
let map = null;
let directionsService = null;
let directionsRenderer = null;

// The "Vertedero" (Fixed Base Location)
// Let's use a generic point (e.g. coordinates in a real city, say Bogota or just some coordinate)
const VERTEDERO_POS = { lat: 4.60971, lng: -74.08175 }; 

// State
let reports = []; // Array to store objects: { id, location: {lat, lng}, type, marker }
let currentRole = null; // 'citizen' or 'driver'
let tempMarker = null; // Used when citizen clicks the map
let activeRouteType = null; // The type of waste currently being routed

// Color Mapping for Markers
const markerColors = {
    'Reciclable': 'http://maps.google.com/mapfiles/ms/icons/blue-dot.png',
    'Orgánica': 'http://maps.google.com/mapfiles/ms/icons/green-dot.png',
    'Ordinaria': 'http://maps.google.com/mapfiles/ms/icons/grey-dot.png'
};

// UI Elements
const setupScreen = document.getElementById('setup-screen');
const roleScreen = document.getElementById('role-screen');
const mainScreen = document.getElementById('main-screen');
const errorMsg = document.getElementById('setup-error');
const inputApiKey = document.getElementById('api-key-input');

const citizenPanel = document.getElementById('citizen-panel');
const driverPanel = document.getElementById('driver-panel');
const locationInput = document.getElementById('report-location');
const btnReportWaste = document.getElementById('btn-report-waste');
const wasteTypeSelect = document.getElementById('waste-type');
const driverStatus = document.getElementById('driver-status');
const btnFinishRoute = document.getElementById('btn-finish-route');

// Event Listeners for Setup
document.getElementById('btn-load-map').addEventListener('click', () => {
    const apiKey = inputApiKey.value.trim();
    if (apiKey.length < 10) {
        errorMsg.classList.remove('hidden');
        return;
    }
    errorMsg.classList.add('hidden');
    loadGoogleMaps(apiKey);
});

// Event Listeners for Role Switch
document.getElementById('btn-role-citizen').addEventListener('click', () => setRole('citizen'));
document.getElementById('btn-role-driver').addEventListener('click', () => setRole('driver'));
document.getElementById('btn-switch-role').addEventListener('click', () => {
    mainScreen.classList.add('hidden');
    roleScreen.classList.remove('hidden');
    // Clear route if we change role
    if(directionsRenderer) directionsRenderer.setDirections({routes: []});
    activeRouteType = null;
    btnFinishRoute.classList.add('hidden');
    driverStatus.textContent = 'Camión en espera (Vertedero)';
});

// Load Google Maps API Script
function loadGoogleMaps(apiKey) {
    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&callback=initMap`;
    script.async = true;
    script.defer = true;
    script.onerror = () => {
        errorMsg.textContent = "Error al cargar Google Maps. Revisa la API Key o tu conexión.";
        errorMsg.classList.remove('hidden');
    };
    document.head.appendChild(script);
}

// Map Initialization
window.initMap = function() {
    setupScreen.classList.add('hidden');
    roleScreen.classList.remove('hidden');

    map = new google.maps.Map(document.getElementById('map'), {
        center: VERTEDERO_POS,
        zoom: 13,
        mapTypeControl: false,
        streetViewControl: false
    });

    directionsService = new google.maps.DirectionsService();
    directionsRenderer = new google.maps.DirectionsRenderer({
        map: map,
        suppressMarkers: true // We'll manage our own markers primarily, but Google handles route lines
    });

    // Add fixed marker for Vertedero
    new google.maps.Marker({
        position: VERTEDERO_POS,
        map: map,
        title: 'Vertedero Principal',
        icon: 'http://maps.google.com/mapfiles/ms/icons/red-dot.png'
    });

    // Add map click listener
    map.addListener('click', (e) => {
        if (currentRole === 'citizen') {
            handleMapClick(e.latLng);
        }
    });

    // Sub-events
    btnReportWaste.addEventListener('click', submitReport);
    
    document.querySelectorAll('.collect-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            calculateRoute(e.target.getAttribute('data-type'));
        });
    });

    btnFinishRoute.addEventListener('click', completeRoute);
};

function setRole(role) {
    currentRole = role;
    roleScreen.classList.add('hidden');
    mainScreen.classList.remove('hidden');

    if (role === 'citizen') {
        citizenPanel.classList.remove('hidden');
        driverPanel.classList.add('hidden');
        if(tempMarker) tempMarker.setMap(map);
    } else {
        citizenPanel.classList.add('hidden');
        driverPanel.classList.remove('hidden');
        if(tempMarker) {
            tempMarker.setMap(null);
            locationInput.value = '';
            btnReportWaste.disabled = true;
        }
    }
}

// CITIZEN LOGIC
function handleMapClick(latLng) {
    if (tempMarker) {
        tempMarker.setPosition(latLng);
    } else {
        tempMarker = new google.maps.Marker({
            position: latLng,
            map: map,
            animation: google.maps.Animation.DROP
        });
    }
    locationInput.value = `${latLng.lat().toFixed(5)}, ${latLng.lng().toFixed(5)}`;
    btnReportWaste.disabled = false;
}

function submitReport() {
    if (!tempMarker) return;
    
    const type = wasteTypeSelect.value;
    const location = tempMarker.getPosition();
    
    // Create new persistent marker
    const newMarker = new google.maps.Marker({
        position: location,
        map: map,
        icon: markerColors[type],
        title: `Residuo ${type}`
    });

    reports.push({
        id: Date.now(),
        location: location,
        type: type,
        marker: newMarker
    });

    // Reset temp
    tempMarker.setMap(null);
    tempMarker = null;
    locationInput.value = '';
    btnReportWaste.disabled = true;

    alert(`Residuo ${type} reportado exitosamente.`);
}

// DRIVER LOGIC
function calculateRoute(type) {
    // Find matching reports
    const targetReports = reports.filter(r => r.type === type);
    
    if (targetReports.length === 0) {
        alert(`No hay reportes activos para residuos de tipo: ${type}`);
        return;
    }

    driverStatus.textContent = `Calculando ruta para: ${type}...`;
    
    // Build Waypoints
    const waypoints = targetReports.map(r => ({
        location: r.location,
        stopover: true
    }));

    const request = {
        origin: VERTEDERO_POS,
        destination: VERTEDERO_POS, // Loop back
        waypoints: waypoints,
        optimizeWaypoints: true, // TSP Optimization!
        travelMode: google.maps.TravelMode.DRIVING
    };

    directionsService.route(request, (result, status) => {
        if (status === google.maps.DirectionsStatus.OK) {
            directionsRenderer.setDirections(result);
            activeRouteType = type;
            btnFinishRoute.classList.remove('hidden');
            driverStatus.textContent = `Ruta trazada. Paradas: ${waypoints.length}`;
        } else {
            alert("No se pudo calcular la ruta: " + status);
            driverStatus.textContent = 'Error al calcular ruta';
        }
    });
}

function completeRoute() {
    if (!activeRouteType) return;

    // Filter out picked up waste
    const remainingReports = [];
    reports.forEach(r => {
        if (r.type === activeRouteType) {
            // Remove marker from map
            r.marker.setMap(null);
        } else {
            remainingReports.push(r);
        }
    });
    
    reports = remainingReports;
    
    // Reset Route
    directionsRenderer.setDirections({routes: []});
    activeRouteType = null;
    btnFinishRoute.classList.add('hidden');
    driverStatus.textContent = 'Camión regresó (Vertedero)';
    
    alert('Ruta completada. Se han recogido los residuos del mapa.');
}