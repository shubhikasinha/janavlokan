"use client";

import { useEffect, useState, useCallback } from "react";
import dynamic from "next/dynamic";
import { useScheme } from "@/context/SchemeContext";

// District coordinates for Indian states (approximate centroids)
// In production, use proper GeoJSON boundaries
const DISTRICT_COORDINATES: Record<string, [number, number]> = {
  // Major districts - add more as needed
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
  // Default fallback for unknown districts
  "Unknown": [20.5937, 78.9629], // Center of India
};

// Get coordinates for a district (with fuzzy matching)
function getDistrictCoordinates(districtName: string): [number, number] {
  // Direct match
  if (DISTRICT_COORDINATES[districtName]) {
    return DISTRICT_COORDINATES[districtName];
  }

  // Fuzzy match (case-insensitive, partial)
  const normalizedName = districtName.toLowerCase().trim();
  for (const [key, coords] of Object.entries(DISTRICT_COORDINATES)) {
    if (key.toLowerCase().includes(normalizedName) || normalizedName.includes(key.toLowerCase())) {
      return coords;
    }
  }

  // FIXED: Use deterministic hash instead of random to prevent flickering
  const baseCoords = DISTRICT_COORDINATES["Unknown"];
  const hash = districtName.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const latOffset = ((hash % 100) - 50) / 10;  // -5 to +5 range, deterministic
  const lngOffset = (((hash * 7) % 100) - 50) / 10;
  return [baseCoords[0] + latOffset, baseCoords[1] + lngOffset];
}

// Get color based on anomaly count
function getHeatColor(count: number, maxCount: number): string {
  const ratio = count / maxCount;
  if (ratio > 0.7) return "#dc2626"; // Red - High
  if (ratio > 0.4) return "#f59e0b"; // Amber - Medium
  if (ratio > 0.2) return "#eab308"; // Yellow - Low-Medium
  return "#22c55e"; // Green - Low
}

// Get radius based on anomaly count
function getRadius(count: number, maxCount: number): number {
  const minRadius = 8;
  const maxRadius = 35;
  const ratio = count / maxCount;
  return minRadius + ratio * (maxRadius - minRadius);
}

interface DistrictRisk {
  residence_district: string;
  anomaly_count: number;
}

interface DistrictHeatmapProps {
  data?: DistrictRisk[];
  onDistrictClick?: (district: DistrictRisk) => void;
}

// Dynamically import map to avoid SSR issues
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

const Tooltip = dynamic(
  () => import("react-leaflet").then((mod) => mod.Tooltip),
  { ssr: false }
);

export default function DistrictHeatmap({ data = [], onDistrictClick }: DistrictHeatmapProps) {
  const { currentScheme, schemeConfig } = useScheme();
  const [isClient, setIsClient] = useState(false);
  const [mapData, setMapData] = useState<DistrictRisk[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Get API endpoint based on scheme
  const getApiEndpoint = useCallback(() => {
    return currentScheme === 'MDM' ? '/api/mdm/geo/district-risk' : '/api/geo/district-risk';
  }, [currentScheme]);

  // Ensure client-side rendering
  useEffect(() => {
    setIsClient(true);
  }, []);

  // Fetch data if not provided
  useEffect(() => {
    if (data.length > 0) {
      setMapData(data);
      setLoading(false);
      return;
    }

    async function fetchDistrictData() {
      try {
        const res = await fetch(getApiEndpoint());
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
  }, [data, currentScheme, getApiEndpoint]);

  // Calculate max for scaling
  const maxAnomalyCount = Math.max(...mapData.map((d) => d.anomaly_count), 1);

  if (!isClient) {
    return (
      <div className="h-[500px] bg-gray-100 rounded-lg flex items-center justify-center">
        <p className="text-gray-500">Loading map...</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="h-[500px] bg-gray-100 rounded-lg flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
          <p className="text-gray-500">Loading district data...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-[500px] bg-red-50 rounded-lg flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 mb-2">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-red-100 text-red-700 rounded hover:bg-red-200"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="relative">
      {/* Legend */}
      <div className="absolute top-2 right-2 z-[1000] bg-white/95 p-3 rounded-lg shadow-md text-xs">
        <p className="font-semibold mb-2">{schemeConfig.name} Anomaly Density</p>
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-red-600"></span>
            <span>High (&gt;70%)</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-amber-500"></span>
            <span>Medium (40-70%)</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-yellow-500"></span>
            <span>Low-Med (20-40%)</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-green-500"></span>
            <span>Low (&lt;20%)</span>
          </div>
        </div>
      </div>

      <MapContainer
        center={[20.5937, 78.9629]} // Center of India
        zoom={5}
        style={{ height: "500px", width: "100%", borderRadius: "0.5rem" }}
        scrollWheelZoom={true}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {mapData.map((district) => {
          const coords = getDistrictCoordinates(district.residence_district);
          const color = getHeatColor(district.anomaly_count, maxAnomalyCount);
          const radius = getRadius(district.anomaly_count, maxAnomalyCount);

          return (
            <CircleMarker
              key={district.residence_district}
              center={coords}
              radius={radius}
              pathOptions={{
                fillColor: color,
                fillOpacity: 0.7,
                color: color,
                weight: 2,
              }}
              eventHandlers={{
                click: () => onDistrictClick?.(district),
              }}
            >
              <Tooltip direction="top" offset={[0, -10]} opacity={1}>
                <div className="text-sm">
                  <p className="font-semibold">{district.residence_district}</p>
                  <p>Anomalies: {district.anomaly_count.toLocaleString()}</p>
                </div>
              </Tooltip>
              <Popup>
                <div className="text-sm">
                  <p className="font-bold text-lg">{district.residence_district}</p>
                  <p className="text-gray-600">Detected Anomalies</p>
                  <p className="text-2xl font-bold" style={{ color }}>
                    {district.anomaly_count.toLocaleString()}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    {((district.anomaly_count / maxAnomalyCount) * 100).toFixed(1)}% of max
                  </p>
                </div>
              </Popup>
            </CircleMarker>
          );
        })}
      </MapContainer>
    </div>
  );
}
