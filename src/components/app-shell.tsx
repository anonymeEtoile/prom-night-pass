import { Link, useRouterState } from "@tanstack/react-router";
import {
  LayoutDashboard,
  Ticket,
  Users,
  ScanLine,
  ShieldCheck,
  LogOut,
  Wifi,
  WifiOff,
} from "lucide-react";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { getQueue } from "@/lib/offline-queue";

const nav = [
  { to: "/dashboard", label: "Tableau de bord", icon: LayoutDashboard },
  { to: "/vente", label: "Vente", icon: Ticket },
  { to: "/eleves", label: "Élèves", icon: Users },
  { to: "/scan", label: "Scan", icon: ScanLine },
  { to: "/admins", label: "Admins", icon: ShieldCheck },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const { user, signOut } = useAuth();
  const { location } = useRouterState();
  const [online, setOnline] = useState(true);
  const [queueCount, setQueueCount] = useState(0);

  useEffect(() => {
    const upd = () => setOnline(navigator.onLine);
    const updQ = () => setQueueCount(getQueue().length);
    upd();
    updQ();
    window.addEventListener("online", upd);
    window.addEventListener("offline", upd);
    window.addEventListener("offline-queue-changed", updQ);
    const i = setInterval(updQ, 5000);
    return () => {
      window.removeEventListener("online", upd);
      window.removeEventListener("offline", upd);
      window.removeEventListener("offline-queue-changed", updQ);
      clearInterval(i);
    };
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card sticky top-0 z-30">
        <div className="mx-auto flex max-w-7xl items-center gap-3 px-4 py-3">
          <Link to="/dashboard" className="flex items-center gap-2 font-semibold">
            <span className="inline-block h-7 w-7 rounded-md bg-primary" />
            <span className="hidden sm:inline">Bal MMF</span>
          </Link>
          <nav className="ml-2 flex flex-1 items-center gap-1 overflow-x-auto">
            {nav.map(({ to, label, icon: Icon }) => {
              const active = location.pathname.startsWith(to);
              return (
                <Link
                  key={to}
                  to={to}
                  className={`flex items-center gap-1.5 whitespace-nowrap rounded-md px-3 py-1.5 text-sm transition-colors ${
                    active ? "bg-primary text-primary-foreground" : "hover:bg-secondary"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  <span className="hidden md:inline">{label}</span>
                </Link>
              );
            })}
          </nav>
          <div className="flex items-center gap-2">
            <div
              title={online ? "En ligne" : "Hors-ligne"}
              className={`flex items-center gap-1 rounded-md px-2 py-1 text-xs ${
                online ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive"
              }`}
            >
              {online ? <Wifi className="h-3.5 w-3.5" /> : <WifiOff className="h-3.5 w-3.5" />}
              {queueCount > 0 && <span>{queueCount} en attente</span>}
            </div>
            <span className="hidden text-xs text-muted-foreground sm:inline">{user?.email}</span>
            <Button variant="ghost" size="sm" onClick={signOut}>
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-7xl px-4 py-6">{children}</main>
    </div>
  );
}
