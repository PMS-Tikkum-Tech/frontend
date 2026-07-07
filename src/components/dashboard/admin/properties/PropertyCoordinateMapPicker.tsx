"use client";

import { useEffect, useMemo, useState } from "react";
import { divIcon } from "leaflet";
import {
  MapContainer,
  Marker,
  TileLayer,
  useMap,
  useMapEvents,
} from "react-leaflet";

type PropertyCoordinateMapPickerProps = {
  latitude: string;
  longitude: string;
  onChange: (coordinate: { lat: number; lng: number }) => void;
};

const DEFAULT_CENTER: [number, number] = [-6.5667, 106.7283];

const isValidCoordinate = (lat: number, lng: number) =>
  Number.isFinite(lat) &&
  Number.isFinite(lng) &&
  lat >= -90 &&
  lat <= 90 &&
  lng >= -180 &&
  lng <= 180;

const parseCoordinate = (value: string) => {
  const normalized = value.trim().replace(",", ".");
  if (!normalized) {
    return null;
  }

  const parsed = Number.parseFloat(normalized);
  return Number.isFinite(parsed) ? parsed : null;
};

const getCurrentCoordinate = (latitude: string, longitude: string) => {
  const lat = parseCoordinate(latitude);
  const lng = parseCoordinate(longitude);

  if (lat === null || lng === null || !isValidCoordinate(lat, lng)) {
    return null;
  }

  return { lat, lng };
};

const getPickerIcon = () =>
  divIcon({
    className: "admin-property-coordinate-picker-marker",
    html: `<div style="
      transform: translate(-50%, -100%);
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 34px;
      height: 34px;
      border-radius: 9999px;
      background: #1E2746;
      border: 3px solid #ffffff;
      box-shadow: 0 12px 24px rgba(30, 39, 70, 0.28);
    ">
      <div style="
        width: 12px;
        height: 12px;
        border-radius: 9999px;
        background: #8dd3ff;
      "></div>
    </div>`,
    iconSize: [0, 0],
    iconAnchor: [0, 0],
  });

function MapController({
  coordinate,
  onChange,
}: {
  coordinate: { lat: number; lng: number };
  onChange: (coordinate: { lat: number; lng: number }) => void;
}) {
  const map = useMap();

  useEffect(() => {
    map.setView([coordinate.lat, coordinate.lng], coordinate ? 16 : 12);
  }, [coordinate.lat, coordinate.lng, map]);

  useMapEvents({
    click(event) {
      onChange({ lat: event.latlng.lat, lng: event.latlng.lng });
    },
  });

  return null;
}

export default function PropertyCoordinateMapPicker({
  latitude,
  longitude,
  onChange,
}: PropertyCoordinateMapPickerProps) {
  const [isFetchingLocation, setIsFetchingLocation] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);
  const currentCoordinate = useMemo(
    () => getCurrentCoordinate(latitude, longitude),
    [latitude, longitude]
  );

  const center = currentCoordinate
    ? ([currentCoordinate.lat, currentCoordinate.lng] as [number, number])
    : DEFAULT_CENTER;

  const markerCoordinate = currentCoordinate || {
    lat: DEFAULT_CENTER[0],
    lng: DEFAULT_CENTER[1],
  };

  const handleUseCurrentLocation = () => {
    if (!navigator.geolocation) {
      setLocationError("Browser ini tidak mendukung lokasi perangkat.");
      return;
    }

    setIsFetchingLocation(true);
    setLocationError(null);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setIsFetchingLocation(false);
        onChange({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        });
      },
      () => {
        setIsFetchingLocation(false);
        setLocationError("Gagal mengambil lokasi perangkat.");
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 60000,
      }
    );
  };

  return (
    <div className="space-y-3">
      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
        <div className="mb-2 flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-semibold text-slate-800">
              Pilih titik lokasi dari peta
            </p>
            <p className="text-xs text-slate-500">
              Klik peta atau geser pin untuk mengisi latitude dan longitude.
            </p>
          </div>
          <div className="text-xs text-slate-500">
            {currentCoordinate
              ? `Lat ${currentCoordinate.lat.toFixed(6)}, Lng ${currentCoordinate.lng.toFixed(6)}`
              : "Koordinat belum diisi"}
          </div>
        </div>

        <div className="mb-3 flex flex-col gap-2 sm:flex-row">
          <button
            type="button"
            onClick={handleUseCurrentLocation}
            className="inline-flex h-10 items-center justify-center rounded-lg border border-[#1E2746] px-4 text-sm font-medium text-[#1E2746] transition hover:bg-[#1E2746] hover:text-white disabled:cursor-not-allowed disabled:opacity-60"
            disabled={isFetchingLocation}
          >
            {isFetchingLocation ? "Mencari lokasi..." : "Gunakan lokasi saya"}
          </button>
          {locationError ? (
            <p className="text-xs text-red-600">{locationError}</p>
          ) : null}
        </div>

        <div className="h-[280px] overflow-hidden rounded-xl border border-slate-200 bg-slate-100 sm:h-[340px]">
          <MapContainer
            center={center}
            zoom={currentCoordinate ? 16 : 12}
            scrollWheelZoom
            zoomControl
            attributionControl={false}
            className="h-full w-full"
          >
            <TileLayer url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png" />
            <MapController coordinate={markerCoordinate} onChange={onChange} />
            <Marker
              draggable
              position={[markerCoordinate.lat, markerCoordinate.lng]}
              icon={getPickerIcon()}
              eventHandlers={{
                dragend: (event) => {
                  const marker = event.target;
                  const nextLatLng = marker.getLatLng();
                  onChange({
                    lat: nextLatLng.lat,
                    lng: nextLatLng.lng,
                  });
                },
              }}
            />
          </MapContainer>
        </div>
      </div>
    </div>
  );
}
