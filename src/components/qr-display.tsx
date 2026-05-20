import { useEffect, useRef, useState } from "react";
import QRCode from "qrcode";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";

interface Props {
  token: string;
  name: string;
}

export function QrDisplay({ token, name }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [dataUrl, setDataUrl] = useState<string>("");

  useEffect(() => {
    if (canvasRef.current) {
      QRCode.toCanvas(canvasRef.current, token, { width: 280, margin: 2 });
      QRCode.toDataURL(token, { width: 720, margin: 2 }).then(setDataUrl);
    }
  }, [token]);

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="rounded-lg bg-white p-4 shadow">
        <canvas ref={canvasRef} />
      </div>
      <p className="text-center text-sm text-muted-foreground">Billet de {name}</p>
      {dataUrl && (
        <Button variant="outline" size="sm" asChild>
          <a href={dataUrl} download={`billet-${name.replace(/\s+/g, "-")}.png`}>
            <Download className="mr-2 h-4 w-4" /> Télécharger
          </a>
        </Button>
      )}
    </div>
  );
}
