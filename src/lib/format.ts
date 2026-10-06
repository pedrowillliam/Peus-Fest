const dateTime = new Intl.DateTimeFormat('pt-BR', {
  day: '2-digit',
  month: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
});

// "06/10, 21:14"
export function formatDateTime(iso: string): string {
  return dateTime.format(new Date(iso));
}
