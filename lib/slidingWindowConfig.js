const WINDOW_SIZE_SETTINGS = [
  { name: "MORNING_WINDOW_SIZE", defaultValue: 10 },
  { name: "AFTERNOON_WINDOW_SIZE", defaultValue: 6 },
  { name: "NIGHT_WINDOW_SIZE", defaultValue: 3 },
];

function configuredWindowSize({ name, defaultValue }) {
  const value = Number(process.env[name] || defaultValue);
  if (!Number.isSafeInteger(value) || value < 1 || value > 2147483647) {
    throw new Error(`${name} debe ser un entero positivo.`);
  }
  return value;
}

export function getSlidingWindowConfig(date) {
  const timeZone = process.env.WINDOW_TIME_ZONE || "America/Bogota";
  const sizes = Object.fromEntries(
    WINDOW_SIZE_SETTINGS.map((setting) => [
      setting.name,
      configuredWindowSize(setting),
    ]),
  );
  const timeParts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date(date));
  const part = (type) => Number(timeParts.find((item) => item.type === type)?.value);
  const secondsOfDay = part("hour") * 3600 + part("minute") * 60 + part("second");

  let period;
  let windowSize;
  if (secondsOfDay >= 18001 && secondsOfDay <= 43200) {
    period = "morning";
    windowSize = sizes.MORNING_WINDOW_SIZE;
  } else if (secondsOfDay >= 43201 && secondsOfDay <= 72000) {
    period = "afternoon";
    windowSize = sizes.AFTERNOON_WINDOW_SIZE;
  } else {
    period = "night";
    windowSize = sizes.NIGHT_WINDOW_SIZE;
  }

  return { period, timeZone, windowSize };
}
