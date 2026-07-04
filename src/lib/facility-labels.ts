const FACILITY_LABEL_OVERRIDES: Record<string, string> = {
  wifi: "WiFi",
  wi_fi: "WiFi",
  internet: "Internet",
  parking_area: "Area Parkir",
  parking: "Area Parkir",
  parkir: "Area Parkir",
  kitchen: "Dapur",
  dapur: "Dapur",
  pet_friendly: "Ramah Hewan",
  cctv: "CCTV",
  ac: "AC",
  laundry: "Laundry",
  swimming_pool: "Kolam Renang",
  gym: "Pusat Kebugaran",
  security_24h: "Keamanan 24 Jam",
  security_24_jam: "Keamanan 24 Jam",
  elevator: "Lift",
  generator_backup: "Genset",
  balcony: "Balkon",
  furnished: "Berperabot",
  garden: "Taman",
  rooftop_access: "Akses Rooftop",
  mini_market: "Minimarket",
  water_heater: "Water Heater",
  kmd: "Kamar Mandi Dalam",
  kamar_mandi_dalam: "Kamar Mandi Dalam",
  kamar_mandi_luar: "Kamar Mandi Luar",
};

export const formatFacilityLabel = (value?: string | null) => {
  if (!value) {
    return "-";
  }

  const normalized = value.trim().replace(/[_-]+/g, " ").replace(/\s+/g, " ");
  const lower = normalized.toLowerCase();

  if (FACILITY_LABEL_OVERRIDES[lower]) {
    return FACILITY_LABEL_OVERRIDES[lower];
  }

  return normalized
    .split(" ")
    .map((word) => {
      const lowerWord = word.toLowerCase();

      if (FACILITY_LABEL_OVERRIDES[lowerWord]) {
        return FACILITY_LABEL_OVERRIDES[lowerWord];
      }

      if (/^[a-z0-9]+$/.test(lowerWord) && lowerWord.length <= 3) {
        return lowerWord.toUpperCase();
      }

      return lowerWord.charAt(0).toUpperCase() + lowerWord.slice(1);
    })
    .join(" ");
};
