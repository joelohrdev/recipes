export function totalTime(prep: number | null, cook: number | null) {
  const total = (prep ?? 0) + (cook ?? 0);
  if (!total) return null;
  return minutes(total);
}

export function minutes(total: number) {
  if (total < 60) return `${total} min`;
  const h = Math.floor(total / 60);
  const m = total % 60;
  return m ? `${h} hr ${m} min` : `${h} hr`;
}

export function hostname(url: string) {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "Original recipe";
  }
}
