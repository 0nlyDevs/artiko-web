export function formatBytes(bytes: number, locale: string): string {
  const megabytes = bytes >= 1024 * 1024;
  return new Intl.NumberFormat(locale, {
    style: "unit",
    unit: megabytes ? "megabyte" : "kilobyte",
    maximumFractionDigits: 1,
  }).format(bytes / (megabytes ? 1024 * 1024 : 1024));
}
