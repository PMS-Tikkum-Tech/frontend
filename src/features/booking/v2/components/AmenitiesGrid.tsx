import {
  Armchair,
  Bath,
  Camera,
  Car,
  CircleCheck,
  DoorOpen,
  Dumbbell,
  ShieldCheck,
  Snowflake,
  Sparkles,
  Utensils,
  WashingMachine,
  Wifi,
} from "lucide-react";

const getAmenityIcon = (amenity: string) => {
  const normalized = amenity.toLowerCase();

  if (normalized.includes("wifi") || normalized.includes("internet")) return Wifi;
  if (normalized.includes("ac")) return Snowflake;
  if (normalized.includes("bath") || normalized.includes("mandi")) return Bath;
  if (normalized.includes("cctv")) return Camera;
  if (normalized.includes("security") || normalized.includes("keamanan")) return ShieldCheck;
  if (normalized.includes("parkir") || normalized.includes("parking")) return Car;
  if (normalized.includes("dapur") || normalized.includes("kitchen")) return Utensils;
  if (normalized.includes("cuci") || normalized.includes("laundry")) return WashingMachine;
  if (normalized.includes("furnished") || normalized.includes("lemari")) return Armchair;
  if (normalized.includes("gym")) return Dumbbell;
  if (normalized.includes("balcon") || normalized.includes("balkon")) return DoorOpen;
  if (normalized.includes("housekeeper") || normalized.includes("clean")) return Sparkles;

  return CircleCheck;
};

export default function AmenitiesGrid({ facilities }: { facilities: string[] }) {
  const uniqueFacilities = Array.from(
    new Set(facilities.map((facility) => facility.trim()).filter(Boolean))
  );

  if (uniqueFacilities.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-5 text-sm text-slate-500">
        Fasilitas belum tersedia di response katalog existing.
      </div>
    );
  }

  return (
    <div>
      <div className="grid gap-4 sm:grid-cols-2">
        {uniqueFacilities.map((facility) => {
          const Icon = getAmenityIcon(facility);

          return (
            <div key={facility} className="flex items-center gap-3 text-sm text-slate-800">
              <Icon size={19} className="shrink-0 text-slate-700" />
              <span className="line-clamp-1">{facility}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
