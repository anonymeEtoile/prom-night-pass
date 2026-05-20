import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ShieldCheck, ShieldOff, Hourglass } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/_authenticated/admins")({
  component: AdminsPage,
});

type Profile = { id: string; email: string; full_name: string | null; created_at: string };
type Role = { user_id: string; role: string };

function AdminsPage() {
  const qc = useQueryClient();
  const { user } = useAuth();

  const { data } = useQuery({
    queryKey: ["admins-and-pending"],
    queryFn: async () => {
      const [{ data: profiles }, { data: roles }] = await Promise.all([
        supabase.from("profiles").select("*").order("created_at"),
        supabase.from("user_roles").select("user_id, role"),
      ]);
      const roleSet = new Set(
        ((roles as Role[] | null) ?? [])
          .filter((r) => r.role === "super_admin")
          .map((r) => r.user_id),
      );
      return {
        admins: ((profiles as Profile[] | null) ?? []).filter((p) => roleSet.has(p.id)),
        pending: ((profiles as Profile[] | null) ?? []).filter((p) => !roleSet.has(p.id)),
      };
    },
  });

  const grant = async (id: string) => {
    const { error } = await supabase
      .from("user_roles")
      .insert({ user_id: id, role: "super_admin" });
    if (error) toast.error(error.message);
    else {
      toast.success("Statut administrateur accordé");
      qc.invalidateQueries({ queryKey: ["admins-and-pending"] });
    }
  };

  const revoke = async (id: string) => {
    if (id === user?.id) {
      if (!confirm("Vous êtes sur le point de retirer VOTRE propre statut. Confirmer ?")) return;
    } else if (!confirm("Retirer le statut administrateur de cette personne ?")) return;
    const { error } = await supabase
      .from("user_roles")
      .delete()
      .eq("user_id", id)
      .eq("role", "super_admin");
    if (error) toast.error(error.message);
    else {
      toast.success("Statut retiré");
      qc.invalidateQueries({ queryKey: ["admins-and-pending"] });
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Administrateurs</h1>
        <p className="text-sm text-muted-foreground">
          Validez les nouveaux comptes pour leur donner accès à l'application.
        </p>
      </div>

      <section className="space-y-2">
        <h2 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
          <Hourglass className="h-4 w-4" /> En attente de validation
        </h2>
        <Card className="divide-y">
          {(data?.pending ?? []).length === 0 && (
            <div className="p-6 text-center text-sm text-muted-foreground">
              Aucun compte en attente.
            </div>
          )}
          {data?.pending.map((p) => (
            <div key={p.id} className="flex items-center justify-between gap-3 p-4">
              <div>
                <div className="font-medium">{p.full_name || p.email}</div>
                <div className="text-xs text-muted-foreground">{p.email}</div>
              </div>
              <Button size="sm" onClick={() => grant(p.id)}>
                <ShieldCheck className="mr-2 h-4 w-4" /> Valider
              </Button>
            </div>
          ))}
        </Card>
      </section>

      <section className="space-y-2">
        <h2 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
          <ShieldCheck className="h-4 w-4" /> Super-administrateurs actifs
        </h2>
        <Card className="divide-y">
          {data?.admins.map((p) => (
            <div key={p.id} className="flex items-center justify-between gap-3 p-4">
              <div>
                <div className="font-medium flex items-center gap-2">
                  {p.full_name || p.email}
                  {p.id === user?.id && <Badge variant="secondary">Vous</Badge>}
                </div>
                <div className="text-xs text-muted-foreground">{p.email}</div>
              </div>
              <Button size="sm" variant="outline" onClick={() => revoke(p.id)}>
                <ShieldOff className="mr-2 h-4 w-4" /> Retirer
              </Button>
            </div>
          ))}
        </Card>
      </section>
    </div>
  );
}
