"use client";

import { useEffect } from "react";
import { divIcon } from "leaflet";
import {
  MapContainer,
  Marker,
  Popup,
  TileLayer,
  ZoomControl,
  useMap,
} from "react-leaflet";
import SafeBookingImage from "./SafeBookingImage";

export type BookingV2MapLocation = {
  id: number;
  name: string;
  address: string;
  lat: number;
  lng: number;
  priceLabel: string;
  markerLabel: string;
  availabilityLabel: string;
  availableUnits: number;
  imageUrl: string;
  propertyTypeLabel: string;
  href: string;
};

const DEFAULT_CENTER: [number, number] = [-6.5667, 106.7283];
const FOCUSED_ZOOM = 16;

function FitToLocations({ locations }: { locations: BookingV2MapLocation[] }) {
  const map = useMap();

  useEffect(() => {
    if (locations.length === 0) {
      map.setView(DEFAULT_CENTER, 12);
      return;
    }

    if (locations.length === 1) {
      map.setView([locations[0].lat, locations[0].lng], FOCUSED_ZOOM);
      return;
    }

    map.fitBounds(
      locations.map((location) => [location.lat, location.lng]),
      { padding: [42, 42] }
    );
  }, [locations, map]);

  return null;
}

function FocusSelected({
  locations,
  selectedId,
}: {
  locations: BookingV2MapLocation[];
  selectedId?: number | null;
}) {
  const map = useMap();

  useEffect(() => {
    if (!selectedId) {
      return;
    }

    const selectedLocation = locations.find((location) => location.id === selectedId);
    if (!selectedLocation) {
      return;
    }

    map.flyTo([selectedLocation.lat, selectedLocation.lng], FOCUSED_ZOOM, {
      duration: 0.35,
    });
  }, [locations, map, selectedId]);

  return null;
}

const getMarkerIcon = (
  location: BookingV2MapLocation,
  isSelected: boolean
) => {
  const border = isSelected ? "#111827" : "#d1d5db";
  const background = isSelected ? "#111827" : "#ffffff";
  const text = isSelected ? "#ffffff" : "#0f172a";
  const subText = isSelected ? "#f3f4f6" : "#64748b";
  const shadow = isSelected
    ? "0 18px 42px rgba(17,24,39,0.34)"
    : "0 14px 32px rgba(15,23,42,0.18)";

  return divIcon({
    className: "kikost-booking-v2-marker",
    html: `<div style="
      position: relative;
      transform: translate(-50%, -100%);
      pointer-events: auto;
    ">
      <div style="
        min-width: 112px;
        border-radius: 14px;
        background: ${background};
        color: ${text};
        border: 1px solid ${border};
        box-shadow: ${shadow};
        overflow: hidden;
      ">
        <div style="
          padding: 8px 10px 6px;
          font-size: 12px;
          font-weight: 800;
          line-height: 1;
          white-space: nowrap;
        ">
          ${location.markerLabel}
        </div>
        <div style="
          border-top: 1px solid ${isSelected ? "rgba(255,255,255,0.2)" : "#e2e8f0"};
          padding: 5px 10px 7px;
          color: ${subText};
          font-size: 10px;
          font-weight: 700;
          white-space: nowrap;
        ">
          ${location.availableUnits} unit tersedia
        </div>
      </div>
      <span style="
        position: absolute;
        left: 50%;
        bottom: -7px;
        width: 14px;
        height: 14px;
        background: ${background};
        border-right: 1px solid ${border};
        border-bottom: 1px solid ${border};
        transform: translateX(-50%) rotate(45deg);
      "></span>
    </div>`,
    iconSize: [0, 0],
    iconAnchor: [0, 0],
    popupAnchor: [0, -38],
  });
};

export default function BookingV2PropertyMap({
  locations,
  selectedId,
  onSelect,
}: {
  locations: BookingV2MapLocation[];
  selectedId?: number | null;
  onSelect: (id: number) => void;
}) {
  return (
    <MapContainer
      center={DEFAULT_CENTER}
      zoom={13}
      scrollWheelZoom
      zoomControl={false}
      attributionControl={false}
      className="kikost-booking-v2-map h-full w-full"
    >
      <TileLayer url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png" />
      <ZoomControl position="bottomright" />
      <FitToLocations locations={locations} />
      <FocusSelected locations={locations} selectedId={selectedId} />

      {locations.map((location) => {
        const isSelected = selectedId === location.id;

        return (
          <Marker
            key={location.id}
            position={[location.lat, location.lng]}
            icon={getMarkerIcon(location, isSelected)}
            eventHandlers={{
              click: () => onSelect(location.id),
            }}
          >
            <Popup className="kikost-booking-v2-popup" closeButton={false}>
              <div className="space-y-3">
                <div className="relative h-28 overflow-hidden rounded-xl bg-slate-100">
                  <SafeBookingImage
                    src={location.imageUrl}
                    alt={location.name}
                    className="object-cover"
                  />
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-950">
                    {location.name}
                  </p>
                  <p className="mt-1 text-xs leading-relaxed text-slate-600">
                    {location.address}
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="rounded-lg bg-slate-100 px-2.5 py-2">
            <p className="text-slate-600">Harga</p>
            <p className="mt-0.5 font-semibold text-slate-950">
              {location.priceLabel}
            </p>
          </div>
                  <div className="rounded-lg bg-emerald-50 px-2.5 py-2">
                    <p className="text-emerald-700">Tersedia</p>
                    <p className="mt-0.5 font-semibold text-emerald-950">
                      {location.availableUnits} unit
                    </p>
                  </div>
                </div>
                <a
                  href={location.href}
                  className="inline-flex h-9 w-full items-center justify-center rounded-lg bg-[var(--color-primary)] text-xs font-semibold text-white"
                >
                  Pilih kamar
                </a>
              </div>
            </Popup>
          </Marker>
        );
      })}

      <style jsx global>{`
        .kikost-booking-v2-map.leaflet-container {
          background: #eef4f8;
        }

        .kikost-booking-v2-map .leaflet-control-zoom {
          border: 0;
          border-radius: 14px;
          overflow: hidden;
          box-shadow: 0 14px 34px rgba(15, 23, 42, 0.2);
        }

        .kikost-booking-v2-map .leaflet-control-zoom a {
          width: 36px;
          height: 36px;
          line-height: 36px;
          color: #0f172a;
          background: #ffffff;
          border-bottom: 1px solid #e2e8f0;
        }

        .kikost-booking-v2-map .leaflet-control-zoom a:last-child {
          border-bottom: 0;
        }

        .kikost-booking-v2-popup .leaflet-popup-content-wrapper {
          border: 1px solid #e5e7eb;
          border-radius: 16px;
          box-shadow: 0 18px 40px rgba(15, 23, 42, 0.2);
          padding: 0;
        }

        .kikost-booking-v2-popup .leaflet-popup-content {
          margin: 0;
          min-width: 240px;
          padding: 14px;
        }

        .kikost-booking-v2-popup .leaflet-popup-tip {
          border: 1px solid #e5e7eb;
          background: #ffffff;
        }
      `}</style>
    </MapContainer>
  );
}
