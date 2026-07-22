import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PageBody, PageHeader } from "@/components/page-header";
import { DataTable } from "@/components/data-table";
import { Badge } from "@/components/ui/badge";
import { fmtDateTime } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/audit/")({ component: Page });

function Page() {
  const { data } = useQuery({
    queryKey: ["audit"],
    queryFn: async () => (await supabase.from("audit_logs").select("*, profiles:user_id(email,full_name)").order("created_at",{ascending:false}).limit(500)).data,
  });
  return (
    <>
      <PageHeader title="Activity & Audit Log" subtitle="Recent changes across all modules" />
      <PageBody>
        <DataTable rows={data ?? undefined} columns={[
          { header:"When", cell:(r:any)=> fmtDateTime(r.created_at) },
          { header:"Action", cell:(r:any)=> <Badge variant="outline">{r.action}</Badge> },
          { header:"Module", cell:(r:any)=> r.table_name },
          { header:"Entity", cell:(r:any)=> r.entity_label ?? r.record_id },
          { header:"User", cell:(r:any)=> r.profiles?.email ?? r.user_id ?? "system" },
        ]} />
      </PageBody>
    </>
  );
}
