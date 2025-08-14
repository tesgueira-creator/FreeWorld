function parseDateTime(str) {
  if (!str) return null;
  const parts = str.trim().split(' ');
  if (parts.length === 0) return null;
  const datePart = parts[0].split('/');
  if (datePart.length !== 3) return null;
  const [mm, dd, yyyy] = datePart;
  const timePart = parts[1] || '00:00';
  const iso = `${yyyy.padStart(4, '0')}-${mm.padStart(2, '0')}-${dd.padStart(2, '0')}T${timePart}:00Z`;
  const d = new Date(iso);
  return isNaN(d.getTime()) ? null : d;
}

/**
 * Parse a date string in the format "MM/DD/YYYY". Returns a Date object
 * or null if parsing fails.
 * @param {string} str
 * @returns {Date|null}
 */
function parseDateOnly(str) {
  if (!str) return null;
  const parts = str.trim().split('/');
  if (parts.length !== 3) return null;
  const [mm, dd, yyyy] = parts;
  const iso = `${yyyy.padStart(4, '0')}-${mm.padStart(2, '0')}-${dd.padStart(2, '0')}T00:00:00Z`;
  const d = new Date(iso);
  return isNaN(d.getTime()) ? null : d;
}

export { parseDateTime, parseDateOnly };
