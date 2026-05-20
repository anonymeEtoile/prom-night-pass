import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { Euro, Users, ScanLine, UserCheck, Power } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/_authenticated/dashboard")({
  component: Dashboard,
});

function Dashboard() {
  const { user } = useAuth();
  const qc = useQueryClient();

  const { data: stats } = useQuery({
    queryKey: ["dashboard-stats"],
    queryFn: async () => {
      const [{ data: students }, { data: setting }] = await Promise.all([
        supabase.from("students").select("montant_paye, scanned"),
        supabase.from("scan_settings").select("scan_enabled").eq("id", 1).maybeSingle(),
      ]);
      const total = (students ?? []).reduce((s, x) => s + Number(x.montant_paye), 0);
      const count = (students ?? []).length;
      const scanned = (students ?? []).filter((x) => x.scanned).length;
      return {
        total,
        count,
        scanned,
        waiting: count - scanned,
        scanEnabled: setting?.scan_enabled ?? false,
      };
    },
    refetchInterval: 5000,
  });

  // Realtime updates
  useEffect(() => {
    const ch = supabase
      .channel("dashboard")
      .on("postgres_changes", { event: "*", schema: "public", table: "students" }, () => {
        qc.invalidateQueries({ queryKey: ["dashboard-stats"] });
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "scan_settings" }, () => {
        qc.invalidateQueries({ queryKey: ["dashboard-stats"] });
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [qc]);

  const toggleScan = async (enabled: boolean) => {
    const { error } = await supabase
      .from("scan_settings")
      .update({ scan_enabled: enabled, updated_at: new Date().toISOString(), updated_by: user?.id })
      .eq("id", 1);
    if (error) toast.error(error.message);
    else {
      toast.success(enabled ? "Scan activé — les billets sont valides" : "Scan désactivé");
      qc.invalidateQueries({ queryKey: ["dashboard-stats"] });
    }
  };

  const cards = [
    { label: "Recette totale", value: `${(stats?.total ?? 0).toFixed(2)} €`, icon: Euro, color: "text-success" },
    { label: "Inscrits", value: stats?.count ?? 0, icon: Users, color: "text-primary" },
    { label: "Entrés au bal", value: stats?.scanned ?? 0, icon: ScanLine, color: "text-accent" },
    { label: "Attendus", value: stats?.waiting ?? 0, icon: UserCheck, color: "text-muted-foreground" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Tableau de bord</h1>
        <p className="text-sm text-muted-foreground">Statistiques en temps réel du bal.</p>
      </div>

      <Card className={stats?.scanEnabled ? "border-success" : "border-border"}>
        <CardContent className="flex items-center justify-between p-6">
          <div className="flex items-center gap-3">
            <div className={`flex h-12 w-12 items-center justify-center rounded-full ${stats?.scanEnabled ? "bg-success/10 text-success" : "bg-muted text-muted-foreground"}`}>
              <Power className="h-6 w-6" />
            </div>
            <div>
              <Label htmlFor="scan-switch" className="text-base font-medium">Activation du scan</Label>
              <p className="text-sm text-muted-foreground">
                {stats?.scanEnabled
                  ? "Les billets sont actuellement valides à l'entrée."
                  : "Aucun billet ne peut être validé tant que le scan n'est pas activé."}
              </p>
            </div>
          </div>
          <Switch id="scan-switch" checked={stats?.scanEnabled ?? false} onCheckedChange={toggleScan} />
        </CardContent>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((c) => (
          <Card key={c.label}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{c.label}</CardTitle>
              <c.icon className={`h-4 w-4 ${c.color}`} />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{c.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
