"use client";

import { useEffect, useState, useMemo } from "react";
import dynamic from "next/dynamic";
import "leaflet/dist/leaflet.css";

// Types
interface DistrictRisk {
  residence_district: string;
  anomaly_count: number;
  risk_level?: string;
}

interface IndiaMapProps {
  data?: DistrictRisk[];
  onDistrictClick?: (district: DistrictRisk) => void;
  title?: string;
  height?: string;
}

// District coordinates for Indian states (approximate centroids)
const DISTRICT_COORDINATES: Record<string, [number, number]> = {
  "Mumbai": [19.076, 72.8777],
  "Delhi": [28.6139, 77.209],
  "Bangalore": [12.9716, 77.5946],
  "Chennai": [13.0827, 80.2707],
  "Kolkata": [22.5726, 88.3639],
  "Hyderabad": [17.385, 78.4867],
  "Pune": [18.5204, 73.8567],
  "Ahmedabad": [23.0225, 72.5714],
  "Jaipur": [26.9124, 75.7873],
  "Lucknow": [26.8467, 80.9462],
  "Patna": [25.5941, 85.1376],
  "Bhopal": [23.2599, 77.4126],
  "Nagpur": [21.1458, 79.0882],
  "Indore": [22.7196, 75.8577],
  "Thane": [19.2183, 72.9781],
  "Varanasi": [25.3176, 82.9739],
  "Kanpur": [26.4499, 80.3319],
  "Agra": [27.1767, 78.0081],
  "Surat": [21.1702, 72.8311],
  "Vadodara": [22.3072, 73.1812],
  "Nashik": [19.9975, 73.7898],
  "Rajkot": [22.3039, 70.8022],
  "Coimbatore": [11.0168, 76.9558],
  "Visakhapatnam": [17.6868, 83.2185],
  "Madurai": [9.9252, 78.1198],
  "Kochi": [9.9312, 76.2673],
  "Thiruvananthapuram": [8.5241, 76.9366],
  "Guwahati": [26.1445, 91.7362],
  "Ranchi": [23.3441, 85.3096],
  "Raipur": [21.2514, 81.6296],
  "Dehradun": [30.3165, 78.0322],
  "Chandigarh": [30.7333, 76.7794],
  "Shimla": [31.1048, 77.1734],
  "Srinagar": [34.0837, 74.7973],
  "Jammu": [32.7266, 74.857],
  "Amritsar": [31.634, 74.8723],
  "Ludhiana": [30.901, 75.8573],
  "Jodhpur": [26.2389, 73.0243],
  "Udaipur": [24.5854, 73.7125],
  "Gwalior": [26.2183, 78.1828],
  "Jabalpur": [23.1815, 79.9864],
  "Unknown": [20.5937, 78.9629],
};

// Get coordinates for a district
function getDistrictCoordinates(districtName: string): [number, number] {
  if (DISTRICT_COORDINATES[districtName]) {
    return DISTRICT_COORDINATES[districtName];
  }
  const normalizedName = districtName.toLowerCase().trim();
  for (const [key, coords] of Object.entries(DISTRICT_COORDINATES)) {
    if (key.toLowerCase().includes(normalizedName) || normalizedName.includes(key.toLowerCase())) {
      return coords;
    }
  }
  // Use deterministic hash instead of random to prevent position flickering
  const baseCoords = DISTRICT_COORDINATES["Unknown"];
  const hash = districtName.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const latOffset = ((hash % 100) - 50) / 10;
  const lngOffset = (((hash * 7) % 100) - 50) / 10;
  return [baseCoords[0] + latOffset, baseCoords[1] + lngOffset];
}

// Risk color mapping
function getRiskColor(count: number, maxCount: number): string {
  const ratio = count / maxCount;
  if (ratio > 0.7) return "#ef4444"; // Red
  if (ratio > 0.5) return "#f97316"; // Orange
  if (ratio > 0.3) return "#eab308"; // Yellow
  if (ratio > 0.15) return "#22c55e"; // Green
  return "#10b981"; // Emerald
}

// Dynamically import map components
const MapContainer = dynamic(
  () => import("react-leaflet").then((mod) => mod.MapContainer),
  { ssr: false }
);
const TileLayer = dynamic(
  () => import("react-leaflet").then((mod) => mod.TileLayer),
  { ssr: false }
);
const CircleMarker = dynamic(
  () => import("react-leaflet").then((mod) => mod.CircleMarker),
  { ssr: false }
);
const Popup = dynamic(
  () => import("react-leaflet").then((mod) => mod.Popup),
  { ssr: false }
);
const ZoomControl = dynamic(
  () => import("react-leaflet").then((mod) => mod.ZoomControl),
  { ssr: false }
);

export default function IndiaMap({
  data = [],
  onDistrictClick,
  title = "National Risk Overview",
  height = "500px"
}: IndiaMapProps) {
  const [isClient, setIsClient] = useState(false);
  const [mapData, setMapData] = useState<DistrictRisk[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    if (data.length > 0) {
      setMapData(data);
      setLoading(false);
      return;
    }

    async function fetchDistrictData() {
      try {
        const res = await fetch("/api/geo/district-risk");
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = await res.json();
        setMapData(json);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load map data");
      } finally {
        setLoading(false);
      }
    }
    fetchDistrictData();
  }, [data]);

  const maxAnomalyCount = useMemo(() =>
    Math.max(...mapData.map((d) => d.anomaly_count), 1),
    [mapData]
  );

  // Loading state
  if (!isClient || loading) {
    return (
      <div
        className="relative rounded-xl overflow-hidden border border-gray-200 bg-gray-50"
        style={{ height }}
      >
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center">
            <div className="w-12 h-12 border-4 border-primary/20 rounded-full animate-spin border-t-primary mx-auto"></div>
            <p className="mt-4 text-sm text-gray-500">Loading map...</p>
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div
        className="relative rounded-xl overflow-hidden border border-red-200 bg-red-50"
        style={{ height }}
      >
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center p-6">
            <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-red-100 flex items-center justify-center">
              <svg className="w-6 h-6 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <p className="text-red-600 text-sm mb-4">{error}</p>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-red-100 hover:bg-red-200 text-red-700 rounded-lg transition-all text-sm font-medium"
            >
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative group rounded-xl overflow-hidden shadow-md border border-gray-200 bg-white" style={{ height }}>
      {/* Header overlay */}
      <div className="absolute top-4 left-4 z-[1000] flex items-center gap-3 pointer-events-none">
        <div className="bg-white/95 backdrop-blur-sm border border-gray-200 px-4 py-2 rounded-lg shadow-sm">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
            <span className="text-xs font-semibold uppercase tracking-wide text-gray-700">{title}</span>
          </div>
        </div>
      </div>

      {/* Stats overlay */}
      <div className="absolute top-4 right-16 z-[1000] pointer-events-none">
        <div className="bg-white/95 backdrop-blur-sm border border-gray-200 px-4 py-2 rounded-lg shadow-sm">
          <div className="flex items-center gap-4">
            <div className="text-center">
              <p className="text-lg font-bold text-gray-900 tabular-nums">{mapData.length}</p>
              <p className="text-[10px] uppercase tracking-wider text-gray-500">Districts</p>
            </div>
            <div className="w-px h-8 bg-gray-200"></div>
            <div className="text-center">
              <p className="text-lg font-bold text-primary tabular-nums">
                {mapData.reduce((a, b) => a + b.anomaly_count, 0).toLocaleString()}
              </p>
              <p className="text-[10px] uppercase tracking-wider text-gray-500">Anomalies</p>
            </div>
          </div>
        </div>
      </div>

      {/* Map container */}
      <MapContainer
        center={[22.5937, 78.9629]}
        zoom={5}
        style={{ height: "100%", width: "100%", background: "#f9fafb" }}
        zoomControl={false}
        attributionControl={false}
      >
        <ZoomControl position="topright" />

        {/* Light Theme Basemap - CartoDB Positron */}
        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>'
        />

        {/* Risk markers */}
        {mapData.map((district) => {
          const coords = getDistrictCoordinates(district.residence_district);
          const color = getRiskColor(district.anomaly_count, maxAnomalyCount);
          const ratio = district.anomaly_count / maxAnomalyCount;
          const radius = 8 + ratio * 25;

          return (
            <CircleMarker
              key={district.residence_district}
              center={coords}
              radius={radius}
              pathOptions={{
                fillColor: color,
                fillOpacity: 0.6,
                color: color,
                weight: 2,
                opacity: 0.8,
              }}
              eventHandlers={{
                click: () => onDistrictClick?.(district),
              }}
            >
              <Popup>
                <div className="p-3 min-w-[160px]">
                  <div className="flex items-center gap-2 mb-2">
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: color }}
                    ></div>
                    <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                      Zone Analysis
                    </span>
                  </div>
                  <h3 className="text-lg font-bold text-gray-900 mb-2">
                    {district.residence_district}
                  </h3>
                  <div className="space-y-1">
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-gray-500">Anomalies</span>
                      <span className="text-lg font-bold tabular-nums" style={{ color }}>
                        {district.anomaly_count.toLocaleString()}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-gray-500">Risk Level</span>
                      <span className="text-sm font-semibold" style={{ color }}>
                        {ratio > 0.7 ? 'CRITICAL' : ratio > 0.4 ? 'HIGH' : ratio > 0.2 ? 'MEDIUM' : 'LOW'}
                      </span>
                    </div>
                    {/* Progress bar */}
                    <div className="mt-2">
                      <div className="h-1 bg-gray-200 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-500"
                          style={{ width: `${ratio * 100}%`, backgroundColor: color }}
                        ></div>
                      </div>
                      <p className="text-[10px] text-gray-400 mt-1 text-right">
                        {(ratio * 100).toFixed(1)}% of peak
                      </p>
                    </div>
                  </div>
                </div>
              </Popup>
            </CircleMarker>
          );
        })}
      </MapContainer>

      {/* Legend overlay - Bottom left */}
      <div className="absolute bottom-6 left-6 z-[1000] bg-white/95 backdrop-blur-sm border border-gray-200 p-4 rounded-xl shadow-sm">
        <h4 className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-3">
          Risk Zones
        </h4>
        <div className="space-y-2">
          {[
            { label: 'Critical (70%+)', color: '#ef4444' },
            { label: 'High (50-70%)', color: '#f97316' },
            { label: 'Medium (30-50%)', color: '#eab308' },
            { label: 'Low (15-30%)', color: '#22c55e' },
            { label: 'Minimal (<15%)', color: '#10b981' },
          ].map((item) => (
            <div key={item.label} className="flex items-center gap-3">
              <div
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: item.color }}
              ></div>
              <span className="text-xs text-gray-600">
                {item.label}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Custom attribution */}
      <div className="absolute bottom-1 right-1 bg-white/80 backdrop-blur-sm px-2 py-0.5 text-[9px] text-gray-400 z-[400] rounded-tl-md">
        Leaflet | CARTO | JanaVlokan
      </div>
    </div>
  );
}
