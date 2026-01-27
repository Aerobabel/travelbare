import { StyleSheet, View } from 'react-native';
import MapView, { Marker, Polyline, PROVIDER_DEFAULT, UrlTile } from 'react-native-maps';

const LIGHT_MAP_STYLE = [
    {
        "elementType": "geometry",
        "stylers": [{ "color": "#f5f5f5" }]
    },
    {
        "elementType": "labels.icon",
        "stylers": [{ "visibility": "off" }]
    },
    {
        "elementType": "labels.text.fill",
        "stylers": [{ "color": "#616161" }]
    },
    {
        "elementType": "labels.text.stroke",
        "stylers": [{ "color": "#f5f5f5" }]
    },
    {
        "featureType": "administrative.land_parcel",
        "elementType": "labels.text.fill",
        "stylers": [{ "color": "#bdbdbd" }]
    },
    {
        "featureType": "poi",
        "elementType": "geometry",
        "stylers": [{ "color": "#eeeeee" }]
    },
    {
        "featureType": "poi",
        "elementType": "labels.text.fill",
        "stylers": [{ "color": "#757575" }]
    },
    {
        "featureType": "poi.park",
        "elementType": "geometry",
        "stylers": [{ "color": "#e5e5e5" }]
    },
    {
        "featureType": "poi.park",
        "elementType": "labels.text.fill",
        "stylers": [{ "color": "#9e9e9e" }]
    },
    {
        "featureType": "road",
        "elementType": "geometry",
        "stylers": [{ "color": "#ffffff" }]
    },
    {
        "featureType": "road.arterial",
        "elementType": "labels.text.fill",
        "stylers": [{ "color": "#757575" }]
    },
    {
        "featureType": "road.highway",
        "elementType": "geometry",
        "stylers": [{ "color": "#dadada" }]
    },
    {
        "featureType": "road.highway",
        "elementType": "labels.text.fill",
        "stylers": [{ "color": "#616161" }]
    },
    {
        "featureType": "road.local",
        "elementType": "labels.text.fill",
        "stylers": [{ "color": "#9e9e9e" }]
    },
    {
        "featureType": "transit.line",
        "elementType": "geometry",
        "stylers": [{ "color": "#e5e5e5" }]
    },
    {
        "featureType": "transit.station",
        "elementType": "geometry",
        "stylers": [{ "color": "#eeeeee" }]
    },
    {
        "featureType": "water",
        "elementType": "geometry",
        "stylers": [{ "color": "#c9c9c9" }]
    },
    {
        "featureType": "water",
        "elementType": "labels.text.fill",
        "stylers": [{ "color": "#9e9e9e" }]
    }
];

const DARK_MAP_STYLE = [
    {
        "elementType": "geometry",
        "stylers": [{ "color": "#171E27" }] // Dark Land
    },
    {
        "elementType": "labels.text.fill",
        "stylers": [{ "color": "#746855" }]
    },
    {
        "elementType": "labels.text.stroke",
        "stylers": [{ "color": "#242f3e" }]
    },
    {
        "featureType": "administrative.locality",
        "elementType": "labels.text.fill",
        "stylers": [{ "color": "#94A3B8" }] // City Labels
    },
    {
        "featureType": "poi",
        "elementType": "labels.text.fill",
        "stylers": [{ "color": "#d59563" }]
    },
    {
        "featureType": "poi",
        "stylers": [{ "visibility": "off" }] // Hide POIs for cleaner look
    },
    {
        "featureType": "poi.park",
        "elementType": "geometry",
        "stylers": [{ "color": "#1C2530" }]
    },
    {
        "featureType": "road",
        "elementType": "geometry",
        "stylers": [{ "color": "#2A3441" }] // Roads
    },
    {
        "featureType": "road",
        "elementType": "geometry.stroke",
        "stylers": [{ "color": "#212a37" }]
    },
    {
        "featureType": "road",
        "elementType": "labels.text.fill",
        "stylers": [{ "color": "#9ca5b3" }]
    },
    {
        "featureType": "road.highway",
        "elementType": "geometry",
        "stylers": [{ "color": "#3E6FFF" }] // Highlight Highways slightly or keep dark? Let's keep dark usually
    },
    {
        "featureType": "road.highway",
        "elementType": "geometry.stroke",
        "stylers": [{ "color": "#1f2835" }]
    },
    {
        "featureType": "road.highway",
        "elementType": "labels.text.fill",
        "stylers": [{ "color": "#f3d19c" }]
    },
    {
        "featureType": "transit",
        "elementType": "geometry",
        "stylers": [{ "color": "#2f3948" }]
    },
    {
        "featureType": "transit.station",
        "elementType": "labels.text.fill",
        "stylers": [{ "color": "#d59563" }]
    },
    {
        "featureType": "water",
        "elementType": "geometry",
        "stylers": [{ "color": "#0E141C" }] // Dark Water
    },
    {
        "featureType": "water",
        "elementType": "labels.text.fill",
        "stylers": [{ "color": "#515c6d" }]
    },
    {
        "featureType": "water",
        "elementType": "labels.text.stroke",
        "stylers": [{ "color": "#17263c" }]
    }
];

const RouteMap = ({ route, theme = 'dark' }) => {
    if (!route || !route.start) return null;

    // Convert array [lon, lat] to object { latitude, longitude }
    const startCoords = { latitude: route.start[1], longitude: route.start[0] };

    let endCoords = null;
    if (route.end) {
        endCoords = { latitude: route.end[1], longitude: route.end[0] };
    }

    const isSinglePoint = !endCoords || (startCoords.latitude === endCoords.latitude && startCoords.longitude === endCoords.longitude);

    // Calculate center and delta
    const midLat = isSinglePoint ? startCoords.latitude : (startCoords.latitude + endCoords.latitude) / 2;
    const midLon = isSinglePoint ? startCoords.longitude : (startCoords.longitude + endCoords.longitude) / 2;

    // Zoom closer for single point, further for route
    const latDelta = isSinglePoint ? 0.01 : Math.abs(startCoords.latitude - endCoords.latitude) * 1.5;
    const lonDelta = isSinglePoint ? 0.01 : Math.abs(startCoords.longitude - endCoords.longitude) * 1.5;

    return (
        <View style={[styles.container, { backgroundColor: theme === 'light' ? '#f5f5f5' : '#0E141C' }]}>
            <MapView
                provider={PROVIDER_DEFAULT}
                style={styles.map}
                customMapStyle={theme === 'light' ? LIGHT_MAP_STYLE : DARK_MAP_STYLE}
                initialRegion={{
                    latitude: midLat,
                    longitude: midLon,
                    latitudeDelta: Math.max(latDelta, 0.1),
                    longitudeDelta: Math.max(lonDelta, 0.1),
                }}
                pitchEnabled={false}
                rotateEnabled={false}
                zoomEnabled={true}
                scrollEnabled={true}
            >
                {/* CartoDB Dark Matter Tiles - Only for Dark Mode */}
                {theme === 'dark' && (
                    <UrlTile
                        urlTemplate="https://a.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png"
                        maximumZ={19}
                        flipY={false}
                        zIndex={-1}
                    />
                )}

                {!isSinglePoint && endCoords && (
                    <Polyline
                        coordinates={[startCoords, endCoords]}
                        strokeColor={theme === 'light' ? "#3E6FFF" : "#3E6FFF"}
                        strokeWidth={4}
                        lineDashPattern={[1]}
                        geodesic={true} // Simple curved line for now
                        zIndex={10}
                    />
                )}

                <Marker coordinate={startCoords} anchor={{ x: 0.5, y: 0.5 }}>
                    <View style={[styles.markerDot, { borderColor: theme === 'light' ? '#fff' : '#0E141C' }]} />
                </Marker>

                {!isSinglePoint && endCoords && (
                    <Marker coordinate={endCoords} anchor={{ x: 0.5, y: 0.5 }}>
                        <View style={[styles.markerDot, { borderColor: theme === 'light' ? '#fff' : '#0E141C' }]} />
                    </Marker>
                )}

            </MapView>
        </View>
    );
};

export default RouteMap;

const styles = StyleSheet.create({
    container: {
        ...StyleSheet.absoluteFillObject,
        justifyContent: 'flex-end',
        alignItems: 'center',
        borderRadius: 16,
        overflow: 'hidden', // Enforce bounds
    },
    map: {
        ...StyleSheet.absoluteFillObject,
    },
    markerDot: {
        width: 14,
        height: 14,
        borderRadius: 7,
        backgroundColor: '#3E6FFF',
        borderWidth: 2,
    }
});
