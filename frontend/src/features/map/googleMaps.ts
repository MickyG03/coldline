import type { Theme } from "../../theme/index.ts";

// Google Maps JS loader, polyline decoding and the pale sage map style.

const KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string | undefined;
let loading: Promise<typeof google.maps> | undefined;

export function loadGoogleMaps(): Promise<typeof google.maps> {
  if (!KEY) return Promise.reject(new Error("VITE_GOOGLE_MAPS_API_KEY is not set in the repo-root .env"));
  return (loading ??= new Promise((resolve, reject) => {
    const cb = "__coldlineMapsReady";
    (window as unknown as Record<string, () => void>)[cb] = () => resolve(google.maps);
    const script = document.createElement("script");
    script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(KEY)}&v=weekly&callback=${cb}`;
    script.async = true;
    script.onerror = () => reject(new Error("Google Maps failed to load"));
    document.head.appendChild(script);
  }));
}

/** Decode a Google encoded polyline (Routes API routes.polyline.encodedPolyline). */
export function decodePolyline(encoded: string): google.maps.LatLngLiteral[] {
  const points: google.maps.LatLngLiteral[] = [];
  let i = 0, lat = 0, lng = 0;
  const next = () => {
    let result = 0, shift = 0, b: number;
    do {
      b = encoded.charCodeAt(i++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    return result & 1 ? ~(result >> 1) : result >> 1;
  };
  while (i < encoded.length) {
    lat += next();
    lng += next();
    points.push({ lat: lat / 1e5, lng: lng / 1e5 });
  }
  return points;
}

/** Custom map style JSON, built from the theme palette (works only without a mapId). */
export const mapStyle = ({ palette: p }: Theme): google.maps.MapTypeStyle[] => [
  { elementType: "geometry", stylers: [{ color: p.mapLand }] },
  { elementType: "labels.icon", stylers: [{ visibility: "off" }] },
  { elementType: "labels.text.fill", stylers: [{ color: p.mapLabel }] },
  { elementType: "labels.text.stroke", stylers: [{ color: p.mapLand }, { weight: 3 }] },
  { featureType: "poi", stylers: [{ visibility: "off" }] },
  { featureType: "poi.park", stylers: [{ visibility: "on" }] },
  { featureType: "poi.park", elementType: "geometry", stylers: [{ color: p.mapPark }] },
  { featureType: "poi.park", elementType: "labels", stylers: [{ visibility: "off" }] },
  { featureType: "transit", stylers: [{ visibility: "off" }] },
  { featureType: "administrative", elementType: "geometry", stylers: [{ visibility: "off" }] },
  { featureType: "administrative.neighborhood", elementType: "labels.text.fill", stylers: [{ color: p.textMuted }] },
  { featureType: "road", elementType: "geometry", stylers: [{ color: p.mapRoad }] },
  { featureType: "road.highway", elementType: "geometry", stylers: [{ color: p.mapRoadMajor }] },
  { featureType: "road.highway", elementType: "geometry.stroke", stylers: [{ color: p.border }] },
  { featureType: "road", elementType: "labels", stylers: [{ visibility: "off" }] },
  { featureType: "road.arterial", elementType: "labels.text", stylers: [{ visibility: "simplified" }] },
  { featureType: "landscape.man_made", elementType: "geometry", stylers: [{ color: p.mapLand }] },
  { featureType: "water", elementType: "geometry", stylers: [{ color: p.mapWater }] },
  { featureType: "water", elementType: "labels", stylers: [{ visibility: "off" }] },
];
