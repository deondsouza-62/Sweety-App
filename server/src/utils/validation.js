export const SLOTS = ['morning', 'after_breakfast', 'after_lunch', 'after_dinner'];

// Earliest local time (minutes since midnight) a slot can be logged for today.
export const SLOT_OPENS = { morning: 4 * 60, after_breakfast: 6 * 60, after_lunch: 12 * 60, after_dinner: 18 * 60 };

function formatTime(minutes) {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  const suffix = h >= 12 ? 'PM' : 'AM';
  const hour = h % 12 || 12;
  return `${hour}:${String(m).padStart(2, '0')} ${suffix}`;
}

export function validateReading({ value, date, slot }) {
  if (value === undefined || value === null || value === '') {
    return 'Please enter a glucose value.';
  }
  const numericValue = Number(value);
  if (!Number.isInteger(numericValue) || numericValue < 40 || numericValue > 600) {
    return 'Value must be between 40 and 600 mg/dl.';
  }
  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date) || Number.isNaN(Date.parse(`${date}T00:00:00Z`))) {
    return 'Please enter a valid date.';
  }
  const today = new Date();
  const todayString = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  if (date > todayString) return 'Date cannot be in the future.';
  if (!SLOTS.includes(slot)) return 'Please select a valid time slot.';
  if (date === todayString) {
    const nowMinutes = today.getHours() * 60 + today.getMinutes();
    if (nowMinutes < SLOT_OPENS[slot]) {
      return `${slot.replaceAll('_', ' ')} readings can be logged from ${formatTime(SLOT_OPENS[slot])}.`;
    }
  }
  return null;
}
