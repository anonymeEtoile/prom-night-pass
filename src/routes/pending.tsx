import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const Route = createFileRoute("/pending")({
  component: PendingPage,
});

function PendingPage() {
  const navigate = useNavigate();
  const { session, isSuperAdmin, loading, signOut, refreshRole, user } = useAuth();

  useEffect(() => {
    if (loading) return;
    if (!session) navigate({ to: "/login" });
    else if (isSuperAdmin) navigate({ to: "/dashboard" });
  }, [loading, session, isSuperAdmin, navigate]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-background via-secondary to-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Compte en attente de validation</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Bonjour <strong>{user?.email}</strong>. Votre compte a bien été créé.
            Un administrateur doit vous accorder l'accès depuis l'espace de gestion.
          </p>
          <div className="flex gap-2">
            <Button variant="outline" className="flex-1" onClick={refreshRole}>Vérifier</Button>
            <Button variant="ghost" className="flex-1" onClick={signOut}>Se déconnecter</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
