export const fmtNum = (n: number | null | undefined, d = 2) =>
  n == null ? "—" : Number(n).toLocaleString(undefined, { maximumFractionDigits: d, minimumFractionDigits: 0 });
export const fmtDate = (d?: string | null) => (d ? new Date(d).toLocaleDateString() : "—");
export const fmtDateTime = (d?: string | null) => (d ? new Date(d).toLocaleString() : "—");