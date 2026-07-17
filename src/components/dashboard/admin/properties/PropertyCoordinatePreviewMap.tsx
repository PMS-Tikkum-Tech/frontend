"use client";

import { useMemo } from "react";
import { divIcon } from "leaflet";
import { MapContainer, Marker, TileLayer } from "react-leaflet";

type PropertyCoordinatePreviewMapProps = {
  latitude?: number | null;
  longitude?: number | null;
};

const isValidCoordinate = (lat: number, lng: number) =>
  Number.isFinite(lat) &&
  Number.isFinite(lng) &&
  lat >= -90 &&
  lat <= 90 &&
  lng >= -180 &&
  lng <= 180;

const getMarkerIcon = () =>
  divIcon({
    className: "admin-property-coordinate-preview-marker",
    html: `<div style="
      transform: translate(-50%, -100%);
      width: 28px;
      height: 28px;
      border-radius: 9999px;
      background: #1E2746;
      border: 3px solid #ffffff;
      box-shadow: 0 10px 20px rgba(30, 39, 70, 0.25);
    "></div>`,
    iconSize: [0, 0],
    iconAnchor: [0, 0],
  });

export default function PropertyCoordinatePreviewMap({
  latitude,
  longitude,
}: PropertyCoordinatePreviewMapProps) {
  const coordinate = useMemo(() => {
    if (
      typeof latitude !== "number" ||
      typeof longitude !== "number" ||
      !isValidCoordinate(latitude, longitude)
    ) {
      return null;
    }

    return { lat: latitude, lng: longitude };
  }, [latitude, longitude]);

  if (!coordinate) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-500">
        Koordinat belum tersedia.
      </div>
    );
  }

  return (
    <div className="h-[240px] overflow-hidden rounded-2xl border border-slate-200 bg-slate-100 sm:h-[340px]">
      <MapContainer
        center={[coordinate.lat, coordinate.lng]}
        zoom={16}
        scrollWheelZoom={false}
        zoomControl={false}
        attributionControl={false}
        className="h-full w-full"
      >
        <TileLayer url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png" />
        <Marker position={[coordinate.lat, coordinate.lng]} icon={getMarkerIcon()} />
      </MapContainer>
    </div>
  );
}
