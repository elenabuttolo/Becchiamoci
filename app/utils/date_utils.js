export function isoDate(date) {
  return date.toLocaleDateString("en-CA");
}

export function getCurrentMonth() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const year = today.getFullYear();
  const month = today.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const startDow = (new Date(year, month, 1).getDay() + 6) % 7;
  return { today, year, month, daysInMonth, startDow };
}

export function formatFullDate(dateKey) {
  return new Date(`${dateKey}T00:00:00`).toLocaleDateString("it-IT", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
}

export function formatShortDate(date) {
  return date.toLocaleDateString("it-IT", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
}
