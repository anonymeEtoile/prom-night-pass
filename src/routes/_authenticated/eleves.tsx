import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { Search, QrCode, CheckCircle2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { QrDisplay } from "@/components/qr-display";

export const Route = createFileRoute("/_authenticated/eleves")({
  component: ElevesPage,
});

type Student = {
  id: string;
  nom: string;
  prenom: string;
  classe: string;
  montant_paye: number;
  qr_token: string;
  scanned: boolean;
};

function ElevesPage() {
  const qc = useQueryClient();
  const [q, setQ] = useState("");
  const [selected, setSelected] = useState<Student | null>(null);

  const { data: students = [] } = useQuery({
    queryKey: ["students"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("students")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(1000);
      if (error) throw error;
      return data as Student[];
    },
  });

  useEffect(() => {
    const ch = supabase
      .channel("students-list")
      .on("postgres_changes", { event: "*", schema: "public", table: "students" }, () => {
        qc.invalidateQueries({ queryKey: ["students"] });
      })
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [qc]);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return students;
    return students.filter((x) => `${x.nom} ${x.prenom} ${x.classe}`.toLowerCase().includes(s));
  }, [students, q]);

  const onDelete = async (id: string) => {
    if (!confirm("Supprimer ce billet ? Cette action est irréversible.")) return;
    const { error } = await supabase.from("students").delete().eq("id", id);
    if (error) toast.error(error.message);
    else toast.success("Billet supprimé");
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Liste des élèves</h1>
          <p className="text-sm text-muted-foreground">
            {filtered.length} résultat{filtered.length > 1 ? "s" : ""}
          </p>
        </div>
        <div className="relative w-full sm:max-w-sm">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Rechercher nom, prénom, classe…"
            className="pl-9"
          />
        </div>
      </div>

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-secondary text-secondary-foreground">
              <tr className="text-left">
                <th className="px-4 py-2.5 font-medium">Prénom</th>
                <th className="px-4 py-2.5 font-medium">Nom</th>
                <th className="px-4 py-2.5 font-medium">Classe</th>
                <th className="px-4 py-2.5 font-medium">Montant</th>
                <th className="px-4 py-2.5 font-medium">Statut</th>
                <th className="px-4 py-2.5 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((s) => (
                <tr key={s.id} className="border-t hover:bg-muted/50">
                  <td className="px-4 py-2.5">{s.prenom}</td>
                  <td className="px-4 py-2.5 font-medium">{s.nom}</td>
                  <td className="px-4 py-2.5 text-muted-foreground">{s.classe}</td>
                  <td className="px-4 py-2.5">{Number(s.montant_paye).toFixed(2)} €</td>
                  <td className="px-4 py-2.5">
                    {s.scanned ? (
                      <Badge variant="secondary" className="bg-success/10 text-success">
                        <CheckCircle2 className="mr-1 h-3 w-3" /> Entré
                      </Badge>
                    ) : (
                      <Badge variant="outline">En attente</Badge>
                    )}
                  </td>
                  <td className="px-4 py-2.5 text-right">
                    <Button variant="ghost" size="sm" onClick={() => setSelected(s)}>
                      <QrCode className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => onDelete(s.id)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center text-muted-foreground">
                    Aucun élève
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      <Dialog open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{selected ? `${selected.prenom} ${selected.nom}` : ""}</DialogTitle>
          </DialogHeader>
          {selected && (
            <div className="space-y-3">
              <div className="text-center text-sm text-muted-foreground">
                {selected.classe} — {Number(selected.montant_paye).toFixed(2)} €
              </div>
              <QrDisplay token={selected.qr_token} name={`${selected.prenom}-${selected.nom}`} />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
