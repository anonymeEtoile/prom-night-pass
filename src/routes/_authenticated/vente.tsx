import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { z } from "zod";
import { Ticket, WifiOff } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { enqueue } from "@/lib/offline-queue";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const Route = createFileRoute("/_authenticated/vente")({
  component: VentePage,
});

const schema = z.object({
  nom: z.string().trim().min(1, "Nom requis").max(100),
  prenom: z.string().trim().min(1, "Prénom requis").max(100),
  classe: z.string().trim().min(1, "Classe requise").max(50),
  montant_paye: z.number().min(0, "Montant invalide").max(1000),
});

function VentePage() {
  const { user } = useAuth();
  const [form, setForm] = useState({ nom: "", prenom: "", classe: "", montant_paye: "5" });
  const [busy, setBusy] = useState(false);

  const reset = () => setForm({ nom: "", prenom: "", classe: form.classe, montant_paye: form.montant_paye });

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = schema.safeParse({
      nom: form.nom,
      prenom: form.prenom,
      classe: form.classe,
      montant_paye: Number(form.montant_paye),
    });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0].message);
      return;
    }
    setBusy(true);
    const payload = { ...parsed.data, created_by: user?.id ?? null };

    if (!navigator.onLine) {
      enqueue(payload);
      toast.success(`${payload.prenom} ${payload.nom} — enregistré localement (hors-ligne)`, {
        description: "Sera envoyé dès le retour du réseau.",
      });
      reset();
      setBusy(false);
      return;
    }

    const { error } = await supabase.from("students").insert(payload);
    setBusy(false);
    if (error) {
      // Network failed mid-request — fallback to queue
      enqueue(payload);
      toast.warning("Réseau indisponible — enregistré localement", { description: error.message });
      reset();
    } else {
      toast.success(`Billet créé pour ${payload.prenom} ${payload.nom}`);
      reset();
    }
  };

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Nouvelle vente</h1>
        <p className="text-sm text-muted-foreground">
          Saisissez les informations de l'élève. Si le réseau est indisponible, les données sont conservées et envoyées automatiquement plus tard.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Ticket className="h-5 w-5 text-primary" />
            Informations du billet
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="prenom">Prénom</Label>
                <Input id="prenom" required value={form.prenom} onChange={(e) => setForm({ ...form, prenom: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="nom">Nom</Label>
                <Input id="nom" required value={form.nom} onChange={(e) => setForm({ ...form, nom: e.target.value })} />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="classe">Classe</Label>
              <Input id="classe" required placeholder="ex: Terminale STMG 4" value={form.classe} onChange={(e) => setForm({ ...form, classe: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="montant">Montant payé (€)</Label>
              <Input id="montant" type="number" step="0.5" min="0" required value={form.montant_paye} onChange={(e) => setForm({ ...form, montant_paye: e.target.value })} />
            </div>
            <Button type="submit" className="w-full" size="lg" disabled={busy}>
              {busy ? "Enregistrement…" : "Valider le paiement"}
            </Button>
            <p className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
              <WifiOff className="h-3 w-3" /> Tolérance hors-ligne activée
            </p>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
