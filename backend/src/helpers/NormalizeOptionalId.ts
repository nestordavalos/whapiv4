const normalizeOptionalId = (
  value: number | string | null | undefined
): number | null | undefined => {
  if (value === undefined) {
    return undefined;
  }

  if (value === null || value === "" || value === 0 || value === "0") {
    return null;
  }

  const parsed = typeof value === "number" ? value : Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    return null;
  }

  return parsed;
};

export default normalizeOptionalId;
