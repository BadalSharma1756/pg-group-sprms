import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PageBody, PageHeader } from "@/components/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Building2, ArrowRight } from "lucide-react";

export const Route = createFileRoute("/_authenticated/audit/")({ component: Page });

function Page() {
  const { data: plants } = useQuery({
    queryKey: ["audit-plants"],
    queryFn: async () => (await supabase.from("plants").select("id,code,name,location").eq("status","active").order("code")).data,
  });
  const { data: counts } = useQuery({
    queryKey: ["audit-counts"],
    queryFn: async () => {
      const since = new Date(Date.now() - 7 * 86400000).toISOString();
      const { data } = await supabase.from("audit_logs").select("plant_id").gte("created_at", since);
      const map: Record<string, number> = {};
      (data ?? []).forEach((r:any) => { if (r.plant_id) map[r.plant_id] = (map[r.plant_id] ?? 0) + 1; });
      return map;
    },
  });

  return (
    <>
      <PageHeader title="Activity & Audit Log" subtitle="Plant-wise audit trail of every stock change, approval, and user action" />
      <PageBody>
        <div className="text-sm text-muted-foreground mb-2">Select a plant to view its activity timeline</div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {(plants ?? []).map((p:any) => (
            <Link key={p.id} to="/audit/$plantId" params={{ plantId: p.id }}>
              <Card className="hover:border-primary/50 hover:shadow-md transition-all cursor-pointer">
                <CardContent className="p-5 flex items-center justify-between">
                  <div className="flex items-start gap-3">
                    <div className="size-10 rounded-md bg-primary/10 text-primary grid place-items-center">
                      <Building2 className="size-5" />
                    </div>
                    <div>
                      <div className="font-semibold">{p.code} — {p.name}</div>
                      <div className="text-xs text-muted-foreground">{p.location ?? "—"}</div>
                      <div className="text-xs mt-2"><span className="font-semibold">{counts?.[p.id] ?? 0}</span> events (7d)</div>
                    </div>
                  </div>
                  <ArrowRight className="size-4 text-muted-foreground" />
                </CardContent>
              </Card>
            </Link>
          ))}
          {plants && plants.length === 0 && (
            <div className="text-sm text-muted-foreground">No active plants. Add one in Master Data → Plants.</div>
          )}
        </div>
      </PageBody>
    </>
  );
}