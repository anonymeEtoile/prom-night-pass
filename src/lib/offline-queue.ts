// Offline queue for pending student registrations.
// Stores entries in localStorage and flushes when network is back.
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface QueuedStudent {
  id: string; // local uuid
  nom: string;
  prenom: string;
  classe: string;
  montant_paye: number;
  created_by: string | null;
  ts: number;
}

const KEY = "bal_offline_queue_v1";

export function getQueue(): QueuedStudent[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(KEY) || "[]");
  } catch {
    return [];
  }
}

function setQueue(q: QueuedStudent[]) {
  localStorage.setItem(KEY, JSON.stringify(q));
  window.dispatchEvent(new Event("offline-queue-changed"));
}

export function enqueue(item: Omit<QueuedStudent, "id" | "ts">) {
  const q = getQueue();
  q.push({ ...item, id: crypto.randomUUID(), ts: Date.now() });
  setQueue(q);
}

export async function flushQueue(): Promise<{ ok: number; fail: number }> {
  const q = getQueue();
  if (q.length === 0) return { ok: 0, fail: 0 };

  let ok = 0;
  let fail = 0;
  const remaining: QueuedStudent[] = [];

  for (const item of q) {
    const { error } = await supabase.from("students").insert({
      nom: item.nom,
      prenom: item.prenom,
      classe: item.classe,
      montant_paye: item.montant_paye,
      created_by: item.created_by,
    });
    if (error) {
      remaining.push(item);
      fail++;
    } else {
      ok++;
    }
  }
  setQueue(remaining);
  return { ok, fail };
}

export function setupAutoFlush() {
  if (typeof window === "undefined") return;
  const tryFlush = async () => {
    if (!navigator.onLine) return;
    const before = getQueue().length;
    if (before === 0) return;
    const { ok } = await flushQueue();
    if (ok > 0) {
      toast.success(`${ok} vente(s) hors-ligne synchronisée(s)`);
    }
  };
  window.addEventListener("online", tryFlush);
  // Try immediately
  setTimeout(tryFlush, 1500);
  // And periodically
  setInterval(tryFlush, 30000);
}
