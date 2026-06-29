import { useScope } from "@/lib/scope";
import { MapPin, Building2 } from "lucide-react";

export function ScopeSwitcher() {
  const { locations, filteredPlants, locationId, plantId, setLocationId, setPlantId } = useScope();
  const baseCls =
    "h-9 rounded-md border border-input bg-background pl-8 pr-7 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-ring";
  return (
    <div className="flex items-center gap-2">
      <div className="relative">
        <MapPin className="size-4 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
        <select
          value={locationId ?? ""}
          onChange={(e) => setLocationId(e.target.value || null)}
          className={baseCls}
          aria-label="Location"
        >
          <option value="">All Locations</option>
          {locations.map((l) => (
            <option key={l.id} value={l.id}>{l.name}</option>
          ))}
        </select>
      </div>
      <div className="relative">
        <Building2 className="size-4 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
        <select
          value={plantId ?? ""}
          onChange={(e) => setPlantId(e.target.value || null)}
          className={baseCls}
          aria-label="Plant"
        >
          <option value="">All Plants{locationId ? " (in location)" : ""}</option>
          {filteredPlants.map((p) => (
            <option key={p.id} value={p.id}>{p.code} — {p.name}</option>
          ))}
        </select>
      </div>
    </div>
  );
}