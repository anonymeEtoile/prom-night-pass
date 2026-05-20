import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { Html5Qrcode } from "html5-qrcode";
import { CheckCircle2, XCircle, Camera, CameraOff } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export const Route = createFileRoute("/_authenticated/scan")({
  component: ScanPage,
});

type Result =
  | { kind: "ok"; nom: string; prenom: string; classe: string; montant: number }
  | { kind: "err"; message: string };

function ScanPage() {
  const { user } = useAuth();
  const containerId = "qr-reader-region";
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const [active, setActive] = useState(false);
  const [result, setResult] = useState<Result | null>(null);
  const lastScanRef = useRef<{ token: string; at: number } | null>(null);

  const handleToken = async (token: string) => {
    // Debounce duplicate fast scans
    const now = Date.now();
    if (
      lastScanRef.current &&
      lastScanRef.current.token === token &&
      now - lastScanRef.current.at < 3000
    )
      return;
    lastScanRef.current = { token, at: now };

    // Check scan_settings
    const { data: setting } = await supabase
      .from("scan_settings")
      .select("scan_enabled")
      .eq("id", 1)
      .maybeSingle();
    if (!setting?.scan_enabled) {
      setResult({
        kind: "err",
        message: "Le scan n'est pas activé. Activez-le depuis le tableau de bord.",
      });
      return;
    }

    const { data: student } = await supabase
      .from("students")
      .select("*")
      .eq("qr_token", token)
      .maybeSingle();

    if (!student) {
      setResult({ kind: "err", message: "Billet inconnu." });
      return;
    }
    if (student.scanned) {
      setResult({
        kind: "err",
        message: `Billet déjà utilisé (${student.prenom} ${student.nom}).`,
      });
      return;
    }

    const { error: updErr } = await supabase
      .from("students")
      .update({ scanned: true, scanned_at: new Date().toISOString(), scanned_by: user?.id })
      .eq("id", student.id)
      .eq("scanned", false); // optimistic lock
    if (updErr) {
      setResult({ kind: "err", message: updErr.message });
      return;
    }

    setResult({
      kind: "ok",
      nom: student.nom,
      prenom: student.prenom,
      classe: student.classe,
      montant: Number(student.montant_paye),
    });
  };

  const start = async () => {
    setResult(null);
    const inst = new Html5Qrcode(containerId);
    scannerRef.current = inst;
    try {
      await inst.start(
        { facingMode: "environment" },
        { fps: 10, qrbox: { width: 260, height: 260 } },
        (decoded) => {
          handleToken(decoded);
        },
        () => {},
      );
      setActive(true);
    } catch (e) {
      setResult({
        kind: "err",
        message: "Impossible d'accéder à la caméra. Vérifiez les permissions.",
      });
      console.error(e);
    }
  };

  const stop = async () => {
    if (scannerRef.current) {
      try {
        await scannerRef.current.stop();
      } catch (e) {
        // Ignore stop errors if scanner already stopped
      }
      try {
        await scannerRef.current.clear();
      } catch (e) {
        // Ignore clear errors if scanner already cleared
      }
      scannerRef.current = null;
    }
    setActive(false);
  };

  useEffect(() => {
    return () => {
      stop();
    };
  }, []);

  return (
    <div className="mx-auto max-w-xl space-y-4">
      <div>
        <h1 className="text-2xl font-semibold">Scanner les billets</h1>
        <p className="text-sm text-muted-foreground">
          Pointez la caméra vers le QR code du billet.
        </p>
      </div>

      <Card>
        <CardContent className="p-4">
          <div id={containerId} className="overflow-hidden rounded-md bg-black aspect-square" />
          <div className="mt-3 flex justify-center">
            {!active ? (
              <Button onClick={start}>
                <Camera className="mr-2 h-4 w-4" /> Démarrer le scan
              </Button>
            ) : (
              <Button variant="outline" onClick={stop}>
                <CameraOff className="mr-2 h-4 w-4" /> Arrêter
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {result && (
        <Card
          className={
            result.kind === "ok"
              ? "border-success bg-success/10"
              : "border-destructive bg-destructive/10"
          }
        >
          <CardContent className="p-6">
            {result.kind === "ok" ? (
              <div className="flex items-start gap-3">
                <CheckCircle2 className="h-10 w-10 shrink-0 text-success" />
                <div>
                  <div className="text-xl font-semibold text-success">Billet validé</div>
                  <div className="mt-2 text-base">
                    <div>
                      <span className="text-muted-foreground">Élève :</span>{" "}
                      <strong>
                        {result.prenom} {result.nom}
                      </strong>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Classe :</span> {result.classe}
                    </div>
                    <div>
                      <span className="text-muted-foreground">Payé :</span>{" "}
                      {result.montant.toFixed(2)} €
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex items-start gap-3">
                <XCircle className="h-10 w-10 shrink-0 text-destructive" />
                <div>
                  <div className="text-xl font-semibold text-destructive">Refusé</div>
                  <div className="mt-1 text-sm">{result.message}</div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
