"use client";

import { useEffect, useMemo } from "react";
import { divIcon } from "leaflet";
import {
  MapContainer,
  Marker,
  Popup,
  TileLayer,
  useMap,
  ZoomControl,
} from "react-leaflet";

export type SewaMapLocation = {
  id: number;
  name: string;
  address: string;
  lat: number;
  lng: number;
  priceLabel: string;
  markerLabel: string;
  isFavorite: boolean;
};

const DEFAULT_CENTER: [number, number] = [-6.5667, 106.7283];

const isValidLatLng = (lat: number, lng: number) =>
  Number.isFinite(lat) &&
  Number.isFinite(lng) &&
  lat >= -90 &&
  lat <= 90 &&
  lng >= -180 &&
  lng <= 180;

const getSafeLocations = (locations: SewaMapLocation[]) =>
  locations.filter((location) => isValidLatLng(location.lat, location.lng));

function FitToMarkers({ locations }: { locations: SewaMapLocation[] }) {
  const map = useMap();
  const safeLocations = useMemo(() => getSafeLocations(locations), [locations]);

  useEffect(() => {
    try {
      if (safeLocations.length === 0) {
        map.setView(DEFAULT_CENTER, 12);
        return;
      }

      if (safeLocations.length === 1) {
        map.setView([safeLocations[0].lat, safeLocations[0].lng], 14);
        return;
      }

      map.fitBounds(
        safeLocations.map((location) => [location.lat, location.lng]),
        { padding: [35, 35] }
      );
    } catch {
      map.setView(DEFAULT_CENTER, 12);
    }
  }, [map, safeLocations]);

  return null;
}

function FocusToSelected({
  locations,
  selectedId,
}: {
  locations: SewaMapLocation[];
  selectedId?: number | null;
}) {
  const map = useMap();
  const safeLocations = useMemo(() => getSafeLocations(locations), [locations]);

  useEffect(() => {
    if (!selectedId) {
      return;
    }

    const selectedLocation = safeLocations.find((item) => item.id === selectedId);
    if (!selectedLocation) {
      return;
    }

    try {
      map.flyTo([selectedLocation.lat, selectedLocation.lng], 14, {
        duration: 0.35,
      });
    } catch {
      // Ignore invalid map transitions and keep the page stable.
    }
  }, [map, safeLocations, selectedId]);

  return null;
}

const getMarkerIcon = (location: SewaMapLocation, isSelected: boolean) => {
  const border = isSelected ? "#0b3d91" : "#d7deea";
  const dotColor = isSelected ? "#0b3d91" : location.isFavorite ? "#1d4ed8" : "#64748b";
  const textColor = isSelected ? "#0b3d91" : "#0f172a";
  const boxShadow = isSelected
    ? "0 12px 30px rgba(11, 61, 145, 0.28)"
    : "0 10px 24px rgba(15, 23, 42, 0.16)";

  return divIcon({
    className: "kyra-sewa-marker",
    html: `<div style="
      position: relative;
      transform: translate(-50%, -100%);
      pointer-events: auto;
    ">
      <div style="
        display: inline-flex;
        align-items: center;
        gap: 6px;
        min-width: 64px;
        padding: 7px 11px;
        border-radius: 9999px;
        background: #ffffff;
        color: ${textColor};
        font-size: 11px;
        font-weight: 700;
        border: 1px solid ${border};
        box-shadow: ${boxShadow};
        white-space: nowrap;
      ">
        <span style="
          width: 7px;
          height: 7px;
          border-radius: 9999px;
          background: ${dotColor};
          display: inline-block;
        "></span>
        ${location.markerLabel}
      </div>
      <span style="
        position: absolute;
        left: 50%;
        bottom: -7px;
        width: 12px;
        height: 12px;
        background: #ffffff;
        border-right: 1px solid ${border};
        border-bottom: 1px solid ${border};
        transform: translateX(-50%) rotate(45deg);
      "></span>
    </div>`,
    iconSize: [0, 0],
    iconAnchor: [0, 0],
    popupAnchor: [0, -30],
  });
};

export default function SewaLocationsMap({
  locations,
  selectedId,
  onSelect,
}: {
  locations: SewaMapLocation[];
  selectedId?: number | null;
  onSelect?: (id: number) => void;
}) {
  const safeLocations = useMemo(() => getSafeLocations(locations), [locations]);

  return (
    <MapContainer
      center={DEFAULT_CENTER}
      zoom={12}
      scrollWheelZoom
      zoomControl={false}
      attributionControl={false}
      className="kyra-sewa-map relative z-0 h-full w-full"
    >
      <TileLayer
        url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
      />
      <ZoomControl position="bottomright" />

      <FitToMarkers locations={safeLocations} />
      <FocusToSelected locations={safeLocations} selectedId={selectedId} />

      {safeLocations.map((location) => (
        <Marker
          key={location.id}
          position={[location.lat, location.lng]}
          icon={getMarkerIcon(location, selectedId === location.id)}
          eventHandlers={{
            click: () => {
              onSelect?.(location.id);
            },
          }}
        >
          <Popup className="kyra-sewa-popup" closeButton={false}>
            <div className="space-y-1">
              <p className="text-sm font-semibold text-slate-900">{location.name}</p>
              <p className="text-xs text-slate-600">{location.address}</p>
              <p className="text-xs font-medium text-green-700">{location.priceLabel}</p>
            </div>
          </Popup>
        </Marker>
      ))}

      <style jsx global>{`
        .kyra-sewa-map.leaflet-container {
          background: #edf2f8;
        }

        .kyra-sewa-map .leaflet-control-zoom {
          border: 0;
          border-radius: 14px;
          overflow: hidden;
          box-shadow: 0 12px 26px rgba(15, 23, 42, 0.2);
        }

        .kyra-sewa-map .leaflet-control-zoom a {
          width: 34px;
          height: 34px;
          line-height: 34px;
          color: #0f172a;
          background: #ffffff;
          border-bottom: 1px solid #e2e8f0;
        }

        .kyra-sewa-map .leaflet-control-zoom a:last-child {
          border-bottom: 0;
        }

        .kyra-sewa-popup .leaflet-popup-content-wrapper {
          border: 1px solid #e2e8f0;
          border-radius: 14px;
          box-shadow: 0 14px 30px rgba(15, 23, 42, 0.18);
          padding: 0;
        }

        .kyra-sewa-popup .leaflet-popup-content {
          margin: 0;
          padding: 12px 14px;
          min-width: 190px;
        }

        .kyra-sewa-popup .leaflet-popup-tip {
          border: 1px solid #e2e8f0;
          background: #ffffff;
        }
      `}</style>
    </MapContainer>
  );
}
