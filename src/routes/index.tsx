import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { useAuth } from "@/lib/auth-context";

export const Route = createFileRoute("/")({
  component: Index,
});

function Index() {
  const { loading, session, isSuperAdmin } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (loading) return;
    if (!session) navigate({ to: "/login" });
    else if (!isSuperAdmin) navigate({ to: "/pending" });
    else navigate({ to: "/dashboard" });
  }, [loading, session, isSuperAdmin, navigate]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="text-sm text-muted-foreground">Chargement…</div>
    </div>
  );
}
