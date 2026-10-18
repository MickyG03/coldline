import { useEffect, useMemo, useRef, type ReactNode } from "react";
import { createPortal } from "react-dom";

// Renders React (and styled-components) content at a lat/lng via a google.maps.OverlayView.
// Plain overlays keep the custom map style working (AdvancedMarkerElement needs a mapId, which disables it).
// Moving the position only redraws; the overlay itself is created once per map, so animated markers stay smooth.

export function MapOverlay({ map, position, zIndex = 1, children }: {
  map: google.maps.Map;
  position: google.maps.LatLngLiteral;
  zIndex?: number;
  children: ReactNode;
}) {
  const el = useMemo(() => document.createElement("div"), []);
  const pos = useRef(position);
  const overlay = useRef<google.maps.OverlayView | null>(null);
  pos.current = position;

  useEffect(() => {
    // Positioning is the one place we set element styles directly: the Maps overlay API requires it.
    el.style.position = "absolute";
    class Overlay extends google.maps.OverlayView {
      onAdd() { this.getPanes()?.overlayMouseTarget.appendChild(el); }
      draw() {
        const p = this.getProjection()?.fromLatLngToDivPixel(pos.current);
        if (p) {
          el.style.left = `${p.x}px`;
          el.style.top = `${p.y}px`;
        }
      }
      onRemove() { el.remove(); }
    }
    const o = new Overlay();
    o.setMap(map);
    overlay.current = o;
    return () => {
      o.setMap(null);
      overlay.current = null;
    };
  }, [map, el]);

  useEffect(() => {
    el.style.zIndex = String(zIndex);
  }, [el, zIndex]);

  useEffect(() => {
    overlay.current?.draw();
  }, [position.lat, position.lng]);

  return createPortal(children, el);
}
