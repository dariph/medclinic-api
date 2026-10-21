import { AppError } from "./AppError.js";
import { AppConstants } from "../constants/AppConstants.js";

const ISO_DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;
const WEEKDAY_INDEX: Record<string, number | undefined> = {
  Sun: 0,
  Mon: 1,
  Tue: 2,
  Wed: 3,
  Thu: 4,
  Fri: 5,
  Sat: 6,
};

export class DateUtils {
  static timeToMinutes(time: string): number {
    if (typeof time !== "string") throw new AppError("DADOS_INVALIDOS");
    const parts = time.split(":");
    if (parts.length !== 2) throw new AppError("DADOS_INVALIDOS");
    const hour = Number(parts[0]);
    const minute = Number(parts[1]);
    if (Number.isNaN(hour) || Number.isNaN(minute)) {
      throw new AppError("DADOS_INVALIDOS");
    }
    return hour * 60 + minute;
  }

  static getScheduleParts(date: Date): { weekDay: number; minutes: number } {
    const formatter = new Intl.DateTimeFormat("en-US", {
      timeZone: AppConstants.TIME_ZONE,
      weekday: "short",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    });
    const parts = formatter.formatToParts(date);
    const get = (type: Intl.DateTimeFormatPartTypes) =>
      parts.find((p) => p.type === type)?.value;

    const weekDay = WEEKDAY_INDEX[get("weekday") ?? ""];
    const hourStr = get("hour");
    const minuteStr = get("minute");
    const hour = hourStr !== undefined ? Number(hourStr) : NaN;
    const minute = minuteStr !== undefined ? Number(minuteStr) : NaN;

    if (weekDay === undefined || Number.isNaN(hour) || Number.isNaN(minute)) {
      throw new AppError("DADOS_INVALIDOS");
    }
    return { weekDay, minutes: hour * 60 + minute };
  }

  static getZonedDate(dateString: string, timeString: string): Date {
    if (!ISO_DATE_REGEX.test(dateString)) {
      throw new AppError("DADOS_INVALIDOS");
    }
    const baseDate = new Date(`${dateString}T${timeString}Z`);
    if (Number.isNaN(baseDate.getTime())) {
      throw new AppError("DADOS_INVALIDOS");
    }
    const formatter = new Intl.DateTimeFormat("en-US", {
      timeZone: AppConstants.TIME_ZONE,
      timeZoneName: "longOffset",
    });
    const tzName = formatter
      .formatToParts(baseDate)
      .find((part) => part.type === "timeZoneName")?.value;
    const match = /GMT([+-]\d{2}:\d{2})/.exec(tzName ?? "");
    const offset = match?.[1] ?? AppConstants.UTC_OFFSET_BRT;
    return new Date(`${dateString}T${timeString}${offset}`);
  }

  static normalizeStartAt(date: Date): Date {
    const normalized = new Date(date.getTime());
    normalized.setUTCSeconds(0, 0);
    return normalized;
  }
}
