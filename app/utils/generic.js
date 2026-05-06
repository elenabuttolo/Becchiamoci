export function generateCode() {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

export function toggleInArray(items, value) {
  return items.includes(value)
    ? items.filter((item) => item !== value)
    : [...items, value];
}

export function safeArray(value) {
  return Array.isArray(value) ? value : [];
}
