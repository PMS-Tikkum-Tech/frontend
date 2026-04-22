export type FilterOption = {
  value: string;
  label: string;
};

export const formatFilterLabel = (value?: string | null) => {
  const normalized = value?.trim();

  if (!normalized) {
    return "-";
  }

  return normalized
    .split(/[_\-\s]+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
};

export const uniqueFilterOptions = <T>(
  items: T[],
  getValue: (item: T) => string | number | null | undefined,
  getLabel?: (value: string, item: T) => string | null | undefined
): FilterOption[] => {
  const options: FilterOption[] = [];
  const seen = new Set<string>();

  items.forEach((item) => {
    const rawValue = getValue(item);
    const value = rawValue === null || rawValue === undefined ? "" : String(rawValue).trim();

    if (!value || seen.has(value)) {
      return;
    }

    seen.add(value);
    options.push({
      value,
      label: getLabel?.(value, item)?.trim() || formatFilterLabel(value),
    });
  });

  return options;
};

export const hasFilterOption = (options: FilterOption[], value: string) =>
  !value || options.some((option) => option.value === value);
