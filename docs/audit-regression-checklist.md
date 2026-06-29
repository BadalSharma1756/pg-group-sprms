# Audit Routes — Regression Checklist

Run after any change to `src/routes/_authenticated.audit.*`.

1. **List route** — Visit `/audit`. List of active plants renders with 7-day event counts.
2. **Sibling routing** — Click any plant card. URL becomes `/audit/<uuid>` and the timeline page renders (not the list).
3. **Back link** — "All plants" button returns to `/audit` and re-renders the list.
4. **Invalid id** — Visit `/audit/not-a-uuid`. "Plant not found" empty state shows with a Back button.
5. **Unknown id** — Visit `/audit/00000000-0000-0000-0000-000000000000`. "Plant not found" empty state shows.
6. **Loading state** — Throttle network to Slow 3G; skeleton rows + "Loading activity…" caption visible before data resolves.
7. **Empty state** — Pick a plant with no events in the date range. Empty card shows active filters + "Last 90 days / Clear filters / Retry" buttons.
8. **Error state** — Temporarily break the query (e.g. invalid column in devtools). Error card with Retry appears; Retry restores data after fix.
9. **Filters** — Change Date range / Department / Module. Results refetch; URL plant id stays stable.
10. **Export** — CSV / XLSX / PDF download contains the currently filtered rows.
11. **User column** — Each event shows user email/name (validates `profiles:user_id` FK embed).