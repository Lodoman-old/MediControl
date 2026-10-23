const formatterCache = new Map<string, Intl.DateTimeFormat>();

function formatterFor(timeZone: string): Intl.DateTimeFormat {
  let dtf = formatterCache.get(timeZone);
  if (!dtf) {
    dtf = new Intl.DateTimeFormat("en-US", {
      timeZone,
      hourCycle: "h23",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
    formatterCache.set(timeZone, dtf);
  }
  return dtf;
}

function offsetMs(instant: Date, timeZone: string): number {
  const parts = formatterFor(timeZone).formatToParts(instant);
  const get = (type: string): number => {
    const part = parts.find((p) => p.type === type);
    return part ? Number(part.value) : 0;
  };
  const asUtc = Date.UTC(
    get("year"),
    get("month") - 1,
    get("day"),
    get("hour"),
    get("minute"),
    get("second"),
  );
  return asUtc - instant.getTime();
}

/**
 * Convierte una fecha/hora de pared (la que ve el usuario en la clinica) al
 * instante UTC que se guarda en la base de datos.
 */
export function wallTimeToUtc(dateStr: string, timeStr: string, timeZone: string): Date {
  const [year, month, day] = dateStr.split("-").map(Number);
  const [hour, minute] = timeStr.split(":").map(Number);
  const naive = Date.UTC(year!, month! - 1, day!, hour!, minute ?? 0, 0, 0);

  let offset = offsetMs(new Date(naive), timeZone);
  let result = new Date(naive - offset);

  const corrected = offsetMs(result, timeZone);
  if (corrected !== offset) result = new Date(naive - corrected);

  return result;
}

/** Minutos desde medianoche de un valor `@db.Time` (Prisma lo entrega en UTC). */
export function timeOfDayMinutes(time: Date): number {
  return time.getUTCHours() * 60 + time.getUTCMinutes();
}

/** Formatea minutos desde medianoche como HH:MM. */
export function formatMinutes(minutes: number): string {
  const h = Math.floor(minutes / 60) % 24;
  const m = minutes % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

/** Fecha (YYYY-MM-DD) desplazada N dias, sin depender de la zona del servidor. */
export function shiftDate(dateStr: string, days: number): string {
  const [year, month, day] = dateStr.split("-").map(Number);
  return new Date(Date.UTC(year!, month! - 1, day! + days)).toISOString().slice(0, 10);
}

/** Dia de la semana (0=domingo) de una fecha de pared. */
export function weekdayOf(dateStr: string): number {
  const [year, month, day] = dateStr.split("-").map(Number);
  return new Date(Date.UTC(year!, month! - 1, day!)).getUTCDay();
}

/** Fecha @db.Date para comparar con `exception_date`, independiente del TZ del servidor. */
export function dateOnly(dateStr: string): Date {
  const [year, month, day] = dateStr.split("-").map(Number);
  return new Date(Date.UTC(year!, month! - 1, day!));
}
