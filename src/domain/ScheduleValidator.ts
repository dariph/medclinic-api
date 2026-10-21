import type { WorkShift } from "../entities/Doctor.js";
import { AppError } from "../utils/AppError.js";
import { DateUtils } from "../utils/DateUtils.js";

const TIME_FORMAT_REGEX = /^([01]\d|2[0-3]):([0-5]\d)$/;

export class ScheduleValidator {
  static validateShifts(shifts: WorkShift[]): void {
    if (!Array.isArray(shifts)) {
      throw new AppError("DADOS_INVALIDOS");
    }

    for (const shift of shifts) {
      if (
        typeof shift.weekDay !== "number" ||
        !Number.isInteger(shift.weekDay) ||
        shift.weekDay < 0 ||
        shift.weekDay > 6
      ) {
        throw new AppError("DADOS_INVALIDOS");
      }

      if (
        typeof shift.startTime !== "string" ||
        typeof shift.endTime !== "string" ||
        !TIME_FORMAT_REGEX.test(shift.startTime) ||
        !TIME_FORMAT_REGEX.test(shift.endTime)
      ) {
        throw new AppError("DADOS_INVALIDOS");
      }

      if (
        typeof shift.slotDurationMinutes !== "number" ||
        !Number.isInteger(shift.slotDurationMinutes) ||
        shift.slotDurationMinutes <= 0
      ) {
        throw new AppError("DADOS_INVALIDOS");
      }
    }

    for (let day = 0; day <= 6; day++) {
      const dayShifts = shifts.filter((s) => s.weekDay === day);

      for (let i = 0; i < dayShifts.length; i++) {
        const currentStart = DateUtils.timeToMinutes(dayShifts[i].startTime);
        const currentEnd = DateUtils.timeToMinutes(dayShifts[i].endTime);

        if (currentStart >= currentEnd) {
          throw new AppError("DADOS_INVALIDOS");
        }

        for (let j = i + 1; j < dayShifts.length; j++) {
          const nextStart = DateUtils.timeToMinutes(dayShifts[j].startTime);
          const nextEnd = DateUtils.timeToMinutes(dayShifts[j].endTime);

          if (currentStart < nextEnd && nextStart < currentEnd) {
            throw new AppError("DADOS_INVALIDOS");
          }
        }
      }
    }
  }

  static findValidShift(
    shifts: WorkShift[],
    startsAt: Date,
  ): WorkShift | undefined {
    if (startsAt.getUTCSeconds() !== 0 || startsAt.getUTCMilliseconds() !== 0) {
      return undefined;
    }

    const { weekDay, minutes: appStartMins } =
      DateUtils.getScheduleParts(startsAt);

    return shifts.find((shift) => {
      if (shift.weekDay !== weekDay) return false;
      if (!(shift.slotDurationMinutes > 0)) return false;

      const shiftStartMins = DateUtils.timeToMinutes(shift.startTime);
      const shiftEndMins = DateUtils.timeToMinutes(shift.endTime);
      const appEndMins = appStartMins + shift.slotDurationMinutes;

      const isAligned =
        (appStartMins - shiftStartMins) % shift.slotDurationMinutes === 0;
      const isWithinShift =
        appStartMins >= shiftStartMins && appEndMins <= shiftEndMins;

      return isAligned && isWithinShift;
    });
  }
}
