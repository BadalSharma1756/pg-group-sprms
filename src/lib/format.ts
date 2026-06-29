export const fmtNum = (n: number | null | undefined, d = 2) =>
  n == null ? "—" : Number(n).toLocaleString(undefined, { maximumFractionDigits: d, minimumFractionDigits: 0 });
export const fmtDate = (d?: string | null) => (d ? new Date(d).toLocaleDateString() : "—");
export const fmtDateTime = (d?: string | null) => (d ? new Date(d).toLocaleString() : "—");
export const fmtCurrency = (n: number | null | undefined) =>
  n == null ? "—" : new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 2 }).format(Number(n));