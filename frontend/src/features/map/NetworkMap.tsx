import { useEffect, useMemo, useRef, useState } from "react";
import styled, { useTheme } from "styled-components";
import { Icon } from "../../components/Icon.tsx";
import { Mono, Overline } from "../../components/Text.tsx";
import type { Incident, Pharmacy, Route } from "../../connection/index.ts";
import type { FacilityView } from "../filters.ts";
import { fmtMiles } from "../status.ts";
import { decodePolyline, loadGoogleMaps, mapStyle } from "./googleMaps.ts";
import { useCourier } from "./courier.ts";
import { CourierMarker, FacilityMarker, PharmacyMarker } from "./Markers.tsx";
import { MapOverlay } from "./MapOverlay.tsx";

const Wrap = styled.div`
  position: relative;
  height: ${({ theme }) => theme.sizes.layout.map};
  background: ${({ theme }) => theme.palette.mapLand};
`;

const Canvas = styled.div`
  position: absolute;
  inset: 0;
`;

const Corner = styled(Overline)`
  position: absolute;
  top: ${({ theme }) => theme.sizes.space.xl};
  left: ${({ theme }) => theme.sizes.space.xl};
  z-index: 1;
  pointer-events: none;
`;

const Notice = styled.div`
  position: absolute;
  inset: 0;
  display: grid;
  place-items: center;
  padding: ${({ theme }) => theme.sizes.space.xxl};
  text-align: center;
  color: ${({ theme }) => theme.palette.textSecondary};
  font-size: ${({ theme }) => theme.fonts.size.sm};
`;

const Floating = styled.div`
  position: absolute;
  left: ${({ theme }) => theme.sizes.space.xl};
  bottom: ${({ theme }) => theme.sizes.space.xl};
  z-index: 1;
  min-width: 300px;
  padding: ${({ theme }) => `${theme.sizes.space.lg} ${theme.sizes.space.xl}`};
  background: ${({ theme }) => theme.palette.surface};
  border: ${({ theme }) => theme.border.stroke.thin} solid ${({ theme }) => theme.palette.border};
  border-radius: ${({ theme }) => theme.border.radius.xl};
  box-shadow: ${({ theme }) => theme.border.shadow.soft};
`;

const Track = styled.div`
  height: 4px;
  margin-top: ${({ theme }) => theme.sizes.space.md};
  border-radius: ${({ theme }) => theme.border.radius.pill};
  background: ${({ theme }) => theme.palette.primaryTint};
  overflow: hidden;
`;

const TrackFill = styled.div.attrs<{ $pct: number }>(({ $pct }) => ({ style: { width: `${$pct}%` } }))<{ $pct: number }>`
  height: 100%;
  background: ${({ theme }) => theme.palette.primary};
`;

const FloatingTitle = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: ${({ theme }) => theme.sizes.space.lg};
  margin-top: ${({ theme }) => theme.sizes.space.sm};
  font-size: ${({ theme }) => theme.fonts.size.xl};
  color: ${({ theme }) => theme.palette.textPrimary};
  & > svg { color: ${({ theme }) => theme.palette.textMuted}; }
`;

export function NetworkMap({ pharmacy, views, incident, focusId, route, onSelect }: {
  pharmacy: Pharmacy;
  views: FacilityView[];
  incident: Incident | null;
  focusId: string | null;
  route: Route | null;
  onSelect: (facilityId: string) => void;
}) {
  const theme = useTheme();
  const ref = useRef<HTMLDivElement>(null);
  const [map, setMap] = useState<google.maps.Map | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    loadGoogleMaps().then((maps) => {
      if (cancelled || !ref.current) return;
      const m = new maps.Map(ref.current, {
        center: { lat: pharmacy.lat, lng: pharmacy.lng },
        zoom: 12,
        styles: mapStyle(theme),
        disableDefaultUI: true,
        zoomControl: true,
        clickableIcons: false,
        gestureHandling: "cooperative",
      });
      const bounds = new maps.LatLngBounds({ lat: pharmacy.lat, lng: pharmacy.lng });
      views.forEach((v) => bounds.extend(v.facility));
      m.fitBounds(bounds, 80);
      setMap(m);
    }).catch((err: Error) => setError(err.message));
    return () => { cancelled = true; };
    // Create the map once; markers and lines follow the data below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // After approval, a simulated courier drives the route to the approved site.
  const approval = incident?.decisions.find((d) => d.decision === "approved") ?? null;
  const tripRoute = approval && route?.facilityId === approval.facility?.id ? route : null;
  const path = useMemo(() => (tripRoute ? decodePolyline(tripRoute.encodedPolyline) : null), [tripRoute?.encodedPolyline]);
  const courier = useCourier(path, approval?.decidedAt ?? null, tripRoute?.durationMinutes ?? 0);

  // Zoom to the approved trip, leaving room at the bottom for the floating card.
  useEffect(() => {
    if (!map || !path?.length) return;
    const bounds = new google.maps.LatLngBounds();
    path.forEach((p) => bounds.extend(p));
    map.fitBounds(bounds, { top: 90, right: 90, bottom: 230, left: 90 });
    // Short trips would otherwise zoom to street level.
    const once = google.maps.event.addListenerOnce(map, "idle", () => {
      if ((map.getZoom() ?? 0) > 14) map.setZoom(14);
    });
    return () => once.remove();
  }, [map, path]);

  // Dashed spokes from the pharmacy to every matched site (hidden once a site is approved);
  // solid route line to the focused one.
  useEffect(() => {
    if (!map) return;
    const origin = { lat: pharmacy.lat, lng: pharmacy.lng };
    const dash = { path: "M 0,-1 0,1", strokeOpacity: 0.5, strokeColor: theme.palette.primary, scale: 1.5 };
    const spokes = (approval ? [] : views.filter((v) => v.response)).map((v) => new google.maps.Polyline({
      map,
      path: [origin, { lat: v.facility.lat, lng: v.facility.lng }],
      strokeOpacity: 0,
      icons: [{ icon: dash, offset: "0", repeat: "10px" }],
    }));
    const line = route && new google.maps.Polyline({
      map,
      path: decodePolyline(route.encodedPolyline),
      strokeColor: theme.palette.route,
      strokeOpacity: 0.9,
      strokeWeight: approval ? 5 : 3,
    });
    return () => {
      spokes.forEach((s) => s.setMap(null));
      line?.setMap(null);
    };
  }, [map, views, route, pharmacy, theme, !!approval]);

  const focused = views.find((v) => v.facility.id === focusId);
  const focusedIsRecommendation = incident?.recommendation?.facility.id === focusId;

  return (
    <Wrap>
      <Canvas ref={ref} />
      <Corner>+ Los Angeles network ——— {String(views.length).padStart(2, "0")} nodes</Corner>
      {error && <Notice>Map unavailable: {error}</Notice>}
      {map && (
        <>
          <MapOverlay map={map} position={{ lat: pharmacy.lat, lng: pharmacy.lng }} zIndex={2}>
            <PharmacyMarker name={pharmacy.name} />
          </MapOverlay>
          {views.map((v) => (
            <MapOverlay key={v.facility.id} map={map} position={{ lat: v.facility.lat, lng: v.facility.lng }}
              zIndex={v.facility.id === focusId ? 3 : 1}>
              <FacilityMarker
                name={v.facility.name}
                neighborhood={v.facility.neighborhood}
                status={v.status}
                halo={v.facility.id === focusId}
                dim={!!incident && !v.response}
                onClick={() => onSelect(v.facility.id)}
              />
            </MapOverlay>
          ))}
          {courier && (
            <MapOverlay map={map} position={courier.position} zIndex={4}>
              <CourierMarker etaMinutes={courier.etaMinutes} delivered={courier.delivered} />
            </MapOverlay>
          )}
        </>
      )}
      {focused && (
        <Floating>
          <Overline>
            ● {courier ? (courier.delivered ? "Delivered · handoff to coordinator" : "Courier en route · simulated")
              : focusedIsRecommendation ? "A connection with potential" : "Selected site"}
          </Overline>
          <FloatingTitle>
            {focused.facility.name}
            <Icon name="arrowUpRight" size="sm" />
          </FloatingTitle>
          <Mono>
            {route ? `${route.durationMinutes} min drive · ${fmtMiles(route.distanceKm)}` : fmtMiles(focused.km)}
            {" · "}{focused.facility.neighborhood}
          </Mono>
          {courier && (
            <>
              <Track><TrackFill $pct={Math.round(courier.progress * 100)} /></Track>
              <Mono>{courier.delivered ? "Arrived · cold chain held at 2–8 °C" : `ETA ${courier.etaMinutes} min · refrigerated van`}</Mono>
            </>
          )}
        </Floating>
      )}
    </Wrap>
  );
}
