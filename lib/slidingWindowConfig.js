// Configura el tamaño de ventana por horario usando la fecha y la zona horaria elegidas.
const WINDOW_SIZE_SETTINGS = [
  { name: "MORNING_WINDOW_SIZE", defaultValue: 10 },
  { name: "AFTERNOON_WINDOW_SIZE", defaultValue: 6 },
  { name: "NIGHT_WINDOW_SIZE", defaultValue: 3 },
];

// Lee una variable de tamaño de ventana y rechaza valores que no sean enteros positivos válidos.
function configuredWindowSize({ name, defaultValue }) {
  const value = Number(process.env[name] || defaultValue);
  if (!Number.isSafeInteger(value) || value < 1 || value > 2147483647) {
    throw new Error(`${name} debe ser un entero positivo.`);
  }
  return value;
}

// Determina la franja horaria de la transacción y devuelve el tamaño de ventana correspondiente.
export function getSlidingWindowConfig(date) {
  const timeZone = process.env.WINDOW_TIME_ZONE || "America/Bogota";
  const sizes = Object.fromEntries(
    WINDOW_SIZE_SETTINGS.map((setting) => [
      setting.name,
      configuredWindowSize(setting),
    ]),
  );
  // Intl obtiene la hora local de la zona sin depender de la zona del servidor.
  const timeParts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date(date));
  const part = (type) => Number(timeParts.find((item) => item.type === type)?.value);
  const secondsOfDay = part("hour") * 3600 + part("minute") * 60 + part("second");

  // 05:00:01-12:00:00 usa mañana; 12:00:01-20:00:00 tarde; el resto, noche.
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
