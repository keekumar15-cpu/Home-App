// Forms submit dates as three separate dropdown fields (name_day, name_month,
// name_year) instead of a native <input type="date">, so browsers/OSes never
// impose their own calendar widget or locale formatting. This reconstructs a
// real Date from those three fields.
function parseDateFields(body, name, { fallbackToNow = true } = {}) {
  const day = body[`${name}_day`];
  const month = body[`${name}_month`];
  const year = body[`${name}_year`];

  if (!day || !month || !year) {
    return fallbackToNow ? new Date() : null;
  }

  return new Date(Number(year), Number(month) - 1, Number(day));
}

module.exports = { parseDateFields };
