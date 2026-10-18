import { env } from "../../utils/env.ts";

// Google Routes API: computeRoutes (drive time + distance between two points).

export interface LatLng {
  lat: number;
  lng: number;
}

export interface DriveRoute {
  durationSeconds: number;
  distanceMeters: number;
}

const point = (p: LatLng) => ({ location: { latLng: { latitude: p.lat, longitude: p.lng } } });

export async function computeDriveRoute(origin: LatLng, destination: LatLng): Promise<DriveRoute> {
  const key = env("GOOGLE_MAPS_API_KEY");
  if (!key) throw new Error("GOOGLE_MAPS_API_KEY not set");
  const res = await fetch("https://routes.googleapis.com/directions/v2:computeRoutes", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": key,
      "X-Goog-FieldMask": "routes.duration,routes.distanceMeters",
    },
    body: JSON.stringify({ origin: point(origin), destination: point(destination), travelMode: "DRIVE" }),
  });
  const body = await res.json();
  if (!res.ok) throw new Error(`Routes API ${res.status} ${body?.error?.message ?? ""}`.trim());
  const route = body.routes?.[0];
  if (!route) throw new Error("Routes API returned no route");
  return { durationSeconds: parseInt(route.duration), distanceMeters: route.distanceMeters ?? 0 };
}
