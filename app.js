// Global Variables
let map = null;
let routingControl = null;

// The "Vertedero" (Fixed Base Location)
// Let's use a generic point (e.g. coordinates in a real city, say Bogota)
const VERTEDERO_POS = [4.60971, -74.08175]; // Lat, Lng

// State
let reports = []; // Array to store objects: { id, location: [lat, lng], type, marker }
let currentRole = null; // 'citizen' or 'driver'
let tempMarker = null; // Used when citizen clicks the map
let activeRouteType = null; // The type of waste currently being routed

// UI Elements
const roleScreen = document.getElementById('role-screen');
const mainScreen = document.getElementById('main-screen');

const citizenPanel = document.getElementById('citizen-panel');
const driverPanel = document.getElementById('driver-panel');
const locationInput = document.getElementById('report-location');
const btnReportWaste = document.getElementById('btn-report-waste');
const wasteTypeSelect = document.getElementById('waste-type');
const driverStatus = document.getElementById('driver-status');
const btnFinishRoute = document.getElementById('btn-finish-route');

// Event Listeners for Role Switch
document.getElementById('btn-role-citizen').addEventListener('click', () => setRole('citizen'));
document.getElementById('btn-role-driver').addEventListener('click', () => setRole('driver'));
document.getElementById('btn-switch-role').addEventListener('click', () => {
    mainScreen.classList.add('hidden');
    roleScreen.classList.remove('hidden');
    // Clear route if we change role
    if(routingControl) {
        map.removeControl(routingControl);
        routingControl = null;
    }
    activeRouteType = null;
    btnFinishRoute.classList.add('hidden');
    driverStatus.textContent = 'Camión en espera (Vertedero)';
});

// Map Initialization
function initMap() {
    map = L.map('map').setView(VERTEDERO_POS, 13);

    // Load tiles from OpenStreetMap (Free, no API Key needed)
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors',
        maxZoom: 19
    }).addTo(map);

    // Add fixed marker for Vertedero
    L.marker(VERTEDERO_POS).addTo(map).bindPopup('<b>Vertedero Principal</b>').openPopup();

    // Add map click listener
    map.on('click', (e) => {
        if (currentRole === 'citizen') {
            handleMapClick(e.latlng);
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
}

// Custom Icons for different waste types
const getIcon = (color) => {
    return new L.Icon({
        iconUrl: `https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-${color}.png`,
        shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
        iconSize: [25, 41],
        iconAnchor: [12, 41],
        popupAnchor: [1, -34],
        shadowSize: [41, 41]
    });
};

const iconColors = {
    'Reciclable': getIcon('blue'),
    'Orgánica': getIcon('green'),
    'Ordinaria': getIcon('grey')
};

function setRole(role) {
    currentRole = role;
    roleScreen.classList.add('hidden');
    mainScreen.classList.remove('hidden');

    // Force map to recalculate size when shown
    setTimeout(() => { map.invalidateSize(); }, 100);

    if (role === 'citizen') {
        citizenPanel.classList.remove('hidden');
        driverPanel.classList.add('hidden');
        if(tempMarker) tempMarker.addTo(map);
    } else {
        citizenPanel.classList.add('hidden');
        driverPanel.classList.remove('hidden');
        if(tempMarker) {
            map.removeLayer(tempMarker);
            locationInput.value = '';
            btnReportWaste.disabled = true;
        }
    }
}

// CITIZEN LOGIC
function handleMapClick(latlng) {
    if (tempMarker) {
        tempMarker.setLatLng(latlng);
    } else {
        tempMarker = L.marker(latlng).addTo(map);
    }
    locationInput.value = `${latlng.lat.toFixed(5)}, ${latlng.lng.toFixed(5)}`;
    btnReportWaste.disabled = false;
}

function submitReport() {
    if (!tempMarker) return;
    
    const type = wasteTypeSelect.value;
    const location = tempMarker.getLatLng();
    
    // Create new persistent marker
    const newMarker = L.marker(location, {icon: iconColors[type]})
        .addTo(map)
        .bindPopup(`Residuo: ${type}`);

    reports.push({
        id: Date.now(),
        location: [location.lat, location.lng],
        type: type,
        marker: newMarker
    });

    // Reset temp
    map.removeLayer(tempMarker);
    tempMarker = null;
    locationInput.value = '';
    btnReportWaste.disabled = true;

    alert(`Residuo ${type} reportado exitosamente.`);
}

// DRIVER LOGIC
function calculateRoute(type) {
    // Restablecer si había ruta previa
    if(routingControl) {
        map.removeControl(routingControl);
        routingControl = null;
    }

    const targetReports = reports.filter(r => r.type === type);
    
    if (targetReports.length === 0) {
        alert(`No hay reportes activos para residuos de tipo: ${type}`);
        return;
    }

    driverStatus.textContent = `Calculando ruta para: ${type}...`;
    
    // Optimización simple: Nearest Neighbor Algorithm (Algoritmo Vecino más Cercano)
    // 1. Empezamos en el vertedero
    let currentPoint = L.latLng(VERTEDERO_POS[0], VERTEDERO_POS[1]);
    let unvisited = [...targetReports];
    let orderedWaypoints = [currentPoint]; // Inicio

    while(unvisited.length > 0) {
        // Buscar el más cercano al punto actual
        let nearestIndex = 0;
        let minDistance = Infinity;

        for(let i = 0; i < unvisited.length; i++) {
            let p = L.latLng(unvisited[i].location[0], unvisited[i].location[1]);
            let dist = currentPoint.distanceTo(p);
            if(dist < minDistance) {
                minDistance = dist;
                nearestIndex = i;
            }
        }

        // Lo añadimos a la ruta
        let nextPoint = unvisited[nearestIndex];
        orderedWaypoints.push(L.latLng(nextPoint.location[0], nextPoint.location[1]));
        currentPoint = L.latLng(nextPoint.location[0], nextPoint.location[1]);

        // Lo removemos de no visitados
        unvisited.splice(nearestIndex, 1);
    }

    // Al final, regresa al vertedero
    orderedWaypoints.push(L.latLng(VERTEDERO_POS[0], VERTEDERO_POS[1]));

    // Dibujar Ruta con Leaflet Routing Machine / OSRM (100% Gratuito)
    routingControl = L.Routing.control({
        waypoints: orderedWaypoints,
        routeWhileDragging: false,
        addWaypoints: false,
        fitSelectedRoutes: true,
        show: false, // Ocultar las instrucciones de texto paso a paso
        lineOptions: {
            styles: [{color: '#d9534f', opacity: 0.8, weight: 6}]
        },
        createMarker: function() { return null; } // Ocultar los pines predeterminados de la ruta para dejar ver nuestras propias basuras
    }).addTo(map);

    routingControl.on('routesfound', function(e) {
        activeRouteType = type;
        btnFinishRoute.classList.remove('hidden');
        driverStatus.textContent = `Ruta óptima trazada. Paradas: ${targetReports.length}`;
    });

    routingControl.on('routingerror', function(e) {
        alert("Ocurrió un error al calcular la ruta (OSRM puede estar inestable). Intenta de nuevo.");
        driverStatus.textContent = "Error de Enrutamiento";
    });
}

function completeRoute() {
    if (!activeRouteType) return;

    // Quitar marcadores del mapa y limpiar el arreglo
    const remainingReports = [];
    reports.forEach(r => {
        if (r.type === activeRouteType) {
            map.removeLayer(r.marker); // Remover el pin del mapa
        } else {
            remainingReports.push(r);
        }
    });
    
    reports = remainingReports;
    
    // Reset Route
    if(routingControl) {
        map.removeControl(routingControl);
        routingControl = null;
    }
    activeRouteType = null;
    btnFinishRoute.classList.add('hidden');
    driverStatus.textContent = 'Camión regresó (Vertedero)';
    
    alert('Ruta completada. Se han recogido los residuos del mapa.');
}

// Inicializar el mapa al momento de cargar el script
initMap();
