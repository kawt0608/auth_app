const dateFormatter = new Intl.DateTimeFormat("ja-JP", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "Asia/Tokyo"
});

export function formatDateTime(value: string | Date) {
  return dateFormatter.format(new Date(value));
}

export function formatOptionalDateTime(value: string | Date | null) {
  return value ? formatDateTime(value) : "なし";
}
