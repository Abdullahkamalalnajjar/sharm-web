import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Loader2, LocateFixed, MapPin, Search } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

import { TextField } from '@/components/ui';
import { currentLanguage, t } from '@/lib/i18n';

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

  /** Moves the pin to a search result, zoomed in close enough to fine-tune it. */
  function pick(la: number, ln: number) {
    marker.current?.setLatLng([la, ln]);
    map.current?.setView([la, ln], 17);
    onChangeRef.current(la, ln);
  }

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
    <div className="flex flex-col gap-2">
      <PlaceSearch onPick={pick} />
      <div className="relative overflow-hidden rounded-2xl border border-line" dir="ltr">
        <div ref={el} className="h-64 w-full" />
        <button
          type="button"
          onClick={locate}
          disabled={locating}
          className="absolute bottom-3 left-3 z-[1000] flex items-center gap-1.5 rounded-full bg-surface px-3 py-2 text-xs font-extrabold text-ink shadow-md"
        >
          <LocateFixed className="size-4" />
          {locating ? t('بحدد...') : t('موقعي الحالي')}
        </button>
      </div>
    </div>
  );
}

interface Place {
  place_id: number;
  lat: string;
  lon: string;
  name?: string;
  display_name: string;
}

// Searches stay inside Sharm El Sheikh (west, north, east, south), where MARID delivers.
const SHARM_VIEWBOX = '34.15,28.05,34.45,27.70';

/**
 * Place search (hotels, streets, landmarks) over OpenStreetMap's Nominatim, the same map data as the
 * tiles. Its usage policy allows about one request a second, hence the debounce.
 */
function PlaceSearch({ onPick }: { onPick: (lat: number, lng: number) => void }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Place[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) {
      setResults(null);
      setLoading(false);
      return;
    }
    const controller = new AbortController();
    setLoading(true);
    const timer = setTimeout(async () => {
      try {
        const params = new URLSearchParams({
          q,
          format: 'jsonv2',
          limit: '6',
          viewbox: SHARM_VIEWBOX,
          bounded: '1',
          'accept-language': currentLanguage(),
        });
        const res = await fetch(`https://nominatim.openstreetmap.org/search?${params}`, { signal: controller.signal });
        setResults(res.ok ? ((await res.json()) as Place[]) : []);
      } catch {
        if (!controller.signal.aborted) setResults([]);
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }, 700);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [query]);

  return (
    <div className="relative">
      <TextField
        name="placeSearch"
        type="search"
        autoComplete="off"
        placeholder={t('ابحث عن فندق أو مكان أو شارع')}
        start={<Search className="size-5" />}
        end={loading ? <Loader2 className="size-4 animate-spin" /> : undefined}
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        // Inside the address / store form: Enter picks the first result instead of submitting.
        onKeyDown={(e) => {
          if (e.key !== 'Enter') return;
          e.preventDefault();
          const first = results?.[0];
          if (first) {
            onPick(Number(first.lat), Number(first.lon));
            setOpen(false);
          }
        }}
      />
      {open && results !== null && query.trim().length >= 2 && (
        <div className="absolute inset-x-0 top-full z-[1001] mt-1 max-h-64 overflow-y-auto rounded-xl border border-line bg-surface shadow-lg">
          {results.length === 0 ? (
            <p className="px-4 py-3 text-sm text-ink-3">{loading ? t('بدوّر...') : t('ملقيناش مكان بالاسم ده في شرم')}</p>
          ) : (
            results.map((r) => (
              <button
                key={r.place_id}
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => {
                  onPick(Number(r.lat), Number(r.lon));
                  setQuery(r.name || r.display_name.split(',')[0]);
                  setOpen(false);
                }}
                className="flex w-full items-start gap-2.5 border-b border-line px-4 py-2.5 text-start last:border-0 hover:bg-surface-alt"
              >
                <MapPin className="mt-0.5 size-4 shrink-0 text-brand" />
                <span className="min-w-0">
                  <span className="block truncate text-sm font-bold text-ink">{r.name || r.display_name.split(',')[0]}</span>
                  <span className="block truncate text-xs text-ink-3">{r.display_name}</span>
                </span>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}
