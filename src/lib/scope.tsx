import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";

export type Plant = { id: string; code: string; name: string; location_id: string | null };
export type Location = { id: string; code: string; name: string };

interface ScopeCtx {
  locations: Location[];
  plants: Plant[];               // plants user can access (RLS-filtered + admin sees all)
  allowedPlantIds: string[];
  locationId: string | null;     // selected location filter
  plantId: string | null;        // selected plant filter (within location)
  setLocationId: (id: string | null) => void;
  setPlantId: (id: string | null) => void;
  filteredPlants: Plant[];       // plants in selected location
  ready: boolean;
}

const Ctx = createContext<ScopeCtx | null>(null);
const LS_LOC = "ss-erp-loc";
const LS_PLANT = "ss-erp-plant";

export function ScopeProvider({ children }: { children: ReactNode }) {
  const { user, isAdmin } = useAuth();

  const { data: locations = [] } = useQuery<Location[]>({
    queryKey: ["scope-locations"],
    queryFn: async () => (await supabase.from("locations").select("id,code,name").order("name")).data ?? [],
    enabled: !!user,
  });

  const { data: allPlants = [] } = useQuery<Plant[]>({
    queryKey: ["scope-plants-all"],
    queryFn: async () => (await supabase.from("plants").select("id,code,name,location_id").order("code")).data ?? [],
    enabled: !!user,
  });

  const { data: assigned = [] } = useQuery<{ plant_id: string }[]>({
    queryKey: ["scope-user-plants", user?.id],
    queryFn: async () => (await supabase.from("user_plants").select("plant_id").eq("user_id", user!.id)).data ?? [],
    enabled: !!user,
  });

  const plants = useMemo(() => {
    if (isAdmin) return allPlants;
    const ids = new Set(assigned.map((a) => a.plant_id));
    const filtered = allPlants.filter((p) => ids.has(p.id));
    return filtered.length ? filtered : allPlants; // fallback so UI not empty pre-assignment
  }, [isAdmin, allPlants, assigned]);

  const allowedPlantIds = useMemo(() => plants.map((p) => p.id), [plants]);

  const [locationId, setLocationIdState] = useState<string | null>(null);
  const [plantId, setPlantIdState] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    setLocationIdState(window.localStorage.getItem(LS_LOC));
    setPlantIdState(window.localStorage.getItem(LS_PLANT));
  }, []);

  const setLocationId = (id: string | null) => {
    setLocationIdState(id);
    setPlantIdState(null);
    if (typeof window !== "undefined") {
      id ? localStorage.setItem(LS_LOC, id) : localStorage.removeItem(LS_LOC);
      localStorage.removeItem(LS_PLANT);
    }
  };
  const setPlantId = (id: string | null) => {
    setPlantIdState(id);
    if (typeof window !== "undefined") {
      id ? localStorage.setItem(LS_PLANT, id) : localStorage.removeItem(LS_PLANT);
    }
  };

  const filteredPlants = useMemo(
    () => (locationId ? plants.filter((p) => p.location_id === locationId) : plants),
    [plants, locationId],
  );

  const value: ScopeCtx = {
    locations,
    plants,
    allowedPlantIds,
    locationId,
    plantId,
    setLocationId,
    setPlantId,
    filteredPlants,
    ready: !!user,
  };
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useScope() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useScope outside provider");
  return v;
}

/** Returns plant ids to filter queries by — selected single plant, or all plants of selected location, or all accessible. */
export function useScopedPlantIds() {
  const s = useScope();
  if (s.plantId) return [s.plantId];
  if (s.locationId) return s.filteredPlants.map((p) => p.id);
  return s.allowedPlantIds;
}