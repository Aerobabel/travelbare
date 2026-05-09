import { StyleSheet, Text, View } from 'react-native';
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

const toNumber = (value) => {
    const n = Number(value);
    return Number.isFinite(n) ? n : null;
};

const isValidCoordinate = (latitude, longitude) =>
    latitude !== null &&
    longitude !== null &&
    latitude >= -90 &&
    latitude <= 90 &&
    longitude >= -180 &&
    longitude <= 180;

const cleanCoordinate = (point) => ({
    latitude: point.latitude,
    longitude: point.longitude,
});

const pointFromArray = (value) => {
    if (!Array.isArray(value) || value.length < 2) return null;
    const longitude = toNumber(value[0]);
    const latitude = toNumber(value[1]);
    if (!isValidCoordinate(latitude, longitude)) return null;
    return { latitude, longitude };
};

const pointFromEvent = (event) => {
    const latitude = toNumber(event?.latitude);
    const longitude = toNumber(event?.longitude);
    if (!isValidCoordinate(latitude, longitude)) return null;
    return { latitude, longitude };
};

const decodePolyline = (encoded = '') => {
    let index = 0;
    let lat = 0;
    let lng = 0;
    const coordinates = [];

    while (index < encoded.length) {
        let shift = 0;
        let result = 0;
        let byte = null;
        do {
            byte = encoded.charCodeAt(index++) - 63;
            result |= (byte & 0x1f) << shift;
            shift += 5;
        } while (byte >= 0x20 && index < encoded.length);
        lat += (result & 1) ? ~(result >> 1) : (result >> 1);

        shift = 0;
        result = 0;
        do {
            byte = encoded.charCodeAt(index++) - 63;
            result |= (byte & 0x1f) << shift;
            shift += 5;
        } while (byte >= 0x20 && index < encoded.length);
        lng += (result & 1) ? ~(result >> 1) : (result >> 1);

        const point = { latitude: lat / 1e5, longitude: lng / 1e5 };
        if (isValidCoordinate(point.latitude, point.longitude)) coordinates.push(point);
    }

    return coordinates;
};

const lineFromLeg = (leg) => {
    if (leg?.encodedPolyline) {
        const decoded = decodePolyline(leg.encodedPolyline);
        if (decoded.length >= 2) return decoded;
    }

    const rawCoordinates = leg?.geometry?.coordinates;
    if (Array.isArray(rawCoordinates) && rawCoordinates.length >= 2) {
        return rawCoordinates.map(pointFromArray).filter(Boolean);
    }

    return [];
};

const connectorLinesFromMarkers = (markers = []) => {
    const lines = [];
    for (let i = 1; i < markers.length; i += 1) {
        lines.push([cleanCoordinate(markers[i - 1]), cleanCoordinate(markers[i])]);
    }
    return lines;
};

const normalizeRoute = (route) => {
    if (!route) return null;

    if (route.start) {
        const start = pointFromArray(route.start);
        const end = pointFromArray(route.end);
        if (!start) return null;
        return {
            markers: end ? [start, end] : [start],
            polylines: end ? [[start, end]] : [],
            bounds: null,
            connectorMode: 'direct',
        };
    }

    const events = Array.isArray(route.events) ? route.events : [];
    const markers = events
        .map((event, index) => {
            const point = pointFromEvent(event);
            if (!point) return null;
            return route.numberedMarkers ? { ...point, label: String(index + 1) } : point;
        })
        .filter(Boolean);
    const legs = Array.isArray(route.legs) ? route.legs : [];
    const polylines = route.connectMarkers
        ? connectorLinesFromMarkers(markers)
        : legs.map(lineFromLeg).filter((line) => line.length >= 2);

    if (!markers.length && !polylines.length) return null;

    return {
        markers: markers.length ? markers : polylines.flat(),
        polylines,
        bounds: route.bounds || null,
        connectorMode: route.connectMarkers ? 'overview' : 'geometry',
    };
};

const regionFromRoute = (normalized) => {
    const bounds = normalized?.bounds;
    const centerLat = toNumber(bounds?.center?.latitude);
    const centerLng = toNumber(bounds?.center?.longitude);
    if (centerLat !== null && centerLng !== null) {
        return {
            latitude: centerLat,
            longitude: centerLng,
            latitudeDelta: Math.max(toNumber(bounds.latitudeDelta) || 0.01, 0.01),
            longitudeDelta: Math.max(toNumber(bounds.longitudeDelta) || 0.01, 0.01),
        };
    }

    const points = [...(normalized?.markers || []), ...(normalized?.polylines || []).flat()]
        .filter((point) => isValidCoordinate(point?.latitude, point?.longitude));
    if (!points.length) return null;

    const lats = points.map((point) => point.latitude);
    const lngs = points.map((point) => point.longitude);
    const minLat = Math.min(...lats);
    const maxLat = Math.max(...lats);
    const minLng = Math.min(...lngs);
    const maxLng = Math.max(...lngs);

    return {
        latitude: (minLat + maxLat) / 2,
        longitude: (minLng + maxLng) / 2,
        latitudeDelta: Math.max((maxLat - minLat) * 1.5, 0.01),
        longitudeDelta: Math.max((maxLng - minLng) * 1.5, 0.01),
    };
};

const RouteMap = ({ route, theme = 'dark' }) => {
    const normalized = normalizeRoute(route);
    if (!normalized) return null;

    const region = regionFromRoute(normalized);
    if (!region) return null;

    return (
        <View style={[styles.container, { backgroundColor: theme === 'light' ? '#f5f5f5' : '#0E141C' }]}>
            <MapView
                provider={PROVIDER_DEFAULT}
                style={styles.map}
                customMapStyle={theme === 'light' ? LIGHT_MAP_STYLE : DARK_MAP_STYLE}
                initialRegion={region}
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

                {normalized.polylines.map((coordinates, index) => (
                    <Polyline
                        key={`route-line-${index}`}
                        coordinates={coordinates}
                        strokeColor="#3E6FFF"
                        strokeWidth={normalized.connectorMode === 'overview' ? 3 : 4}
                        lineDashPattern={normalized.connectorMode === 'overview' ? [8, 6] : coordinates.length === 2 ? [1] : undefined}
                        geodesic={false}
                        zIndex={10}
                    />
                ))}

                {normalized.markers.map((coordinate, index) => (
                    <Marker key={`route-marker-${index}`} coordinate={coordinate} anchor={{ x: 0.5, y: 0.5 }}>
                        <View style={[styles.markerDot, { borderColor: theme === 'light' ? '#fff' : '#0E141C' }]}>
                            {coordinate.label ? <Text style={styles.markerNumber}>{coordinate.label}</Text> : null}
                        </View>
                    </Marker>
                ))}

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
        width: 22,
        height: 22,
        borderRadius: 11,
        backgroundColor: '#3E6FFF',
        borderWidth: 2,
        alignItems: 'center',
        justifyContent: 'center',
    },
    markerNumber: {
        color: '#fff',
        fontSize: 10,
        fontWeight: '700',
    }
});
