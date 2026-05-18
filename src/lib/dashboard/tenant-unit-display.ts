export type TenantUnitDisplaySource = {
  id?: number | string | null;
  name?: string | null;
  unit_name?: string | null;
  unit_number?: string | number | null;
  room_number?: string | number | null;
  number?: string | number | null;
  building_name?: string | null;
  block_name?: string | null;
};

const sanitizeLabelPart = (value?: string | number | null) => {
  if (value == null) {
    return "";
  }

  return String(value).trim();
};

const parseBuildingNameFromUnitName = (unitName: string) => {
  const separatorMatch = unitName.match(/^(.+?)\s*(?:-|\/|\||•|·|:)\s*(.+)$/);
  if (separatorMatch?.[1]) {
    return separatorMatch[1].trim();
  }

  const compactMatch = unitName.match(/^([A-Za-z]+\d+)\s+(?:Unit\s*)?(.+)$/i);
  return compactMatch?.[1]?.trim() || null;
};

export const getTenantUnitBuildingName = (
  unit?: TenantUnitDisplaySource | null
) => {
  if (!unit) {
    return null;
  }

  return (
    sanitizeLabelPart(unit.building_name) ||
    sanitizeLabelPart(unit.block_name) ||
    parseBuildingNameFromUnitName(
      sanitizeLabelPart(unit.name) || sanitizeLabelPart(unit.unit_name)
    )
  );
};

export const getTenantUnitNumber = (
  unit?: TenantUnitDisplaySource | null,
  buildingName?: string | null
) => {
  if (!unit) {
    return "";
  }

  const explicitNumber =
    sanitizeLabelPart(unit.unit_number) ||
    sanitizeLabelPart(unit.room_number) ||
    sanitizeLabelPart(unit.number);

  if (explicitNumber) {
    return explicitNumber.replace(/^(unit|kamar|room)\s+/i, "").trim();
  }

  let candidate = sanitizeLabelPart(unit.name) || sanitizeLabelPart(unit.unit_name);
  if (!candidate) {
    return "";
  }

  const normalizedBuilding = buildingName?.trim();
  if (
    normalizedBuilding &&
    candidate.toLowerCase().startsWith(normalizedBuilding.toLowerCase())
  ) {
    candidate = candidate.slice(normalizedBuilding.length).trim();
  }

  candidate = candidate.replace(/^\s*(?:-|\/|\||•|·|:)\s*/, "").trim();
  const separatorMatch = candidate.match(/^.+?\s*(?:-|\/|\||•|·|:)\s*(.+)$/);
  if (separatorMatch?.[1]) {
    candidate = separatorMatch[1].trim();
  }

  return candidate
    .replace(/^(unit|kamar|room)\s+/i, "")
    .replace(/^#/, "")
    .trim();
};

export const getTenantUnitDisplayName = (
  unit?: TenantUnitDisplaySource | null,
  fallback = "-"
) => {
  const buildingName = getTenantUnitBuildingName(unit);
  const unitNumber = getTenantUnitNumber(unit, buildingName);

  if (buildingName) {
    return buildingName;
  }

  if (unitNumber) {
    return `Unit ${unitNumber}`;
  }

  const rawName = sanitizeLabelPart(unit?.name) || sanitizeLabelPart(unit?.unit_name);
  if (rawName) {
    return rawName;
  }

  return fallback;
};
