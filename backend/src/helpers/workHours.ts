export interface DaySchedule {
  enabled: boolean;
  start?: string | null;
  startLunch?: string | null;
  endLunch?: string | null;
  end?: string | null;
}

const toSeconds = (value?: string | null): number | null => {
  if (!value) {
    return null;
  }

  const [hours, minutes] = value.split(":");
  const hourNumber = Number(hours);
  const minuteNumber = Number(minutes);

  if (Number.isNaN(hourNumber) || Number.isNaN(minuteNumber)) {
    return null;
  }

  return hourNumber * 3600 + minuteNumber * 60;
};

const isWithinRange = (
  value: number,
  start: number | null,
  end: number | null
): boolean => {
  if (start === null || end === null) {
    return true;
  }

  if (start <= end) {
    return value >= start && value < end;
  }

  return value >= start || value < end;
};

export const secondsFromDate = (date: Date): number =>
  date.getHours() * 3600 + date.getMinutes() * 60;

export const timeStringToSeconds = (value?: string | null): number | null =>
  toSeconds(value);

export const buildDaySchedule = (
  enabled: boolean,
  start?: string | null,
  startLunch?: string | null,
  endLunch?: string | null,
  end?: string | null
): DaySchedule => ({
  enabled,
  start,
  startLunch,
  endLunch,
  end
});

export const evaluateSchedule = (
  date: Date,
  schedule?: DaySchedule
): { enabled: boolean; open: boolean } => {
  if (!schedule || !schedule.enabled) {
    return { enabled: false, open: false };
  }

  const start = toSeconds(schedule.start);
  const end = toSeconds(schedule.end);

  if (start === null || end === null) {
    return { enabled: true, open: true };
  }

  const value = secondsFromDate(date);
  const startLunch = toSeconds(schedule.startLunch);
  const endLunch = toSeconds(schedule.endLunch);

  if (startLunch !== null && endLunch !== null) {
    const inFirstShift = isWithinRange(value, start, startLunch);
    const inSecondShift = isWithinRange(value, endLunch, end);

    return { enabled: true, open: inFirstShift || inSecondShift };
  }

  return { enabled: true, open: isWithinRange(value, start, end) };
};
