import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { LocateFixed } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

const pinIcon = L.icon({
  iconUrl: markerIcon,
  iconRetinaUrl: markerIcon2x,
  shadowUrl: markerShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

/** Interactive map: tap or drag the pin to choose the delivery location. */
export function MapPicker({
  lat,
  lng,
  onChange,
}: {
  lat: number;
  lng: number;
  onChange: (lat: number, lng: number) => void;
}) {
  const el = useRef<HTMLDivElement>(null);
  const map = useRef<L.Map | null>(null);
  const marker = useRef<L.Marker | null>(null);
  const onChangeRef = useRef(onChange);
  const [locating, setLocating] = useState(false);
  onChangeRef.current = onChange;

  useEffect(() => {
    if (!el.current || map.current) return;
    const m = L.map(el.current, { zoomControl: true }).setView([lat, lng], 15);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; OpenStreetMap',
    }).addTo(m);
    const mk = L.marker([lat, lng], { draggable: true, icon: pinIcon }).addTo(m);
    mk.on('dragend', () => {
      const p = mk.getLatLng();
      onChangeRef.current(p.lat, p.lng);
    });
    m.on('click', (e: L.LeafletMouseEvent) => {
      mk.setLatLng(e.latlng);
      onChangeRef.current(e.latlng.lat, e.latlng.lng);
    });
    map.current = m;
    marker.current = mk;
    setTimeout(() => m.invalidateSize(), 250);
    return () => {
      m.remove();
      map.current = null;
      marker.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Keep the pin in sync when lat/lng change externally (e.g. choosing an area chip).
  useEffect(() => {
    const mk = marker.current;
    const m = map.current;
    if (!mk || !m) return;
    const cur = mk.getLatLng();
    if (Math.abs(cur.lat - lat) > 1e-7 || Math.abs(cur.lng - lng) > 1e-7) {
      mk.setLatLng([lat, lng]);
      m.setView([lat, lng], m.getZoom());
    }
  }, [lat, lng]);

  function locate() {
    if (!navigator.geolocation) return;
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocating(false);
        onChangeRef.current(pos.coords.latitude, pos.coords.longitude);
      },
      () => setLocating(false),
      { enableHighAccuracy: true, timeout: 10000 },
    );
  }

  return (
    <div className="relative overflow-hidden rounded-2xl border border-line" dir="ltr">
      <div ref={el} className="h-64 w-full" />
      <button
        type="button"
        onClick={locate}
        disabled={locating}
        className="absolute bottom-3 left-3 z-[1000] flex items-center gap-1.5 rounded-full bg-white px-3 py-2 text-xs font-extrabold text-ink shadow-md"
      >
        <LocateFixed className="size-4" />
        {locating ? 'بحدد...' : 'موقعي الحالي'}
      </button>
    </div>
  );
}
