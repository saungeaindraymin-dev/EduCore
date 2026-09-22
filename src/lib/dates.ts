// Calendar helpers. Everything here works in the browser's local time zone.

const pad = (n: number) => String(n).padStart(2, "0");

/** Monday 00:00 of the week containing `date` */
export function startOfWeek(date: Date) {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const daysSinceMonday = (d.getDay() + 6) % 7;
  d.setDate(d.getDate() - daysSinceMonday);
  return d;
}

export function addDays(date: Date, days: number) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

export function isSameDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

/** YYYY-MM-DD for <input type="date"> */
export function toDateInput(date: Date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/** HH:MM for <input type="time"> */
export function toTimeInput(date: Date) {
  return `${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

/** Local date + time input values → ISO string (UTC) for the API */
export function fromDateTimeInputs(date: string, time: string) {
  return new Date(`${date}T${time}`).toISOString();
}

export function formatTime(date: Date) {
  return date.toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  });
}

export function formatWeekday(date: Date) {
  return date.toLocaleDateString(undefined, { weekday: "short" });
}

export function formatFullDate(date: Date) {
  return date.toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
}

/** e.g. "Sep 7 – 13, 2026" for the 7 days starting at `weekStart` */
export function formatWeekRange(weekStart: Date) {
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).formatRange(weekStart, addDays(weekStart, 6));
}

/** YYYY-MM-DDTHH:MM for <input type="datetime-local"> */
export function toDateTimeLocalInput(date: Date) {
  return `${toDateInput(date)}T${toTimeInput(date)}`;
}

export function formatDateTime(date: Date) {
  return date.toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}
