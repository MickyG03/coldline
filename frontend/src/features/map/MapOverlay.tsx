import { useEffect, useMemo, type ReactNode } from "react";
import { createPortal } from "react-dom";

// Renders React (and styled-components) content at a lat/lng via a google.maps.OverlayView.
// Plain overlays keep the custom map style working (AdvancedMarkerElement needs a mapId, which disables it).

export function MapOverlay({ map, position, zIndex = 1, children }: {
  map: google.maps.Map;
  position: google.maps.LatLngLiteral;
  zIndex?: number;
  children: ReactNode;
}) {
  const el = useMemo(() => document.createElement("div"), []);

  useEffect(() => {
    // Positioning is the one place we set element styles directly: the Maps overlay API requires it.
    el.style.position = "absolute";
    el.style.zIndex = String(zIndex);
    class Overlay extends google.maps.OverlayView {
      onAdd() { this.getPanes()?.overlayMouseTarget.appendChild(el); }
      draw() {
        const p = this.getProjection()?.fromLatLngToDivPixel(position);
        if (p) {
          el.style.left = `${p.x}px`;
          el.style.top = `${p.y}px`;
        }
      }
      onRemove() { el.remove(); }
    }
    const overlay = new Overlay();
    overlay.setMap(map);
    return () => overlay.setMap(null);
  }, [map, el, position.lat, position.lng, zIndex]);

  return createPortal(children, el);
}
