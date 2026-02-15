import { useEffect, useRef, useState } from "react";
import { Html5Qrcode } from "html5-qrcode";
import { Camera, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";

interface QrScannerProps {
    open: boolean;
    onClose: () => void;
    onScan: (data: string) => void;
    title?: string;
}

const QrScanner = ({ open, onClose, onScan, title = "Scan QR Code" }: QrScannerProps) => {
    const scannerRef = useRef<Html5Qrcode | null>(null);
    const [error, setError] = useState<string | null>(null);
    const containerId = "qr-reader";

    useEffect(() => {
        if (!open) return;

        // Small delay to let the dialog render the container
        const timeout = setTimeout(() => {
            const scanner = new Html5Qrcode(containerId);
            scannerRef.current = scanner;

            scanner
                .start(
                    { facingMode: "environment" },
                    { fps: 10, qrbox: { width: 250, height: 250 } },
                    (decodedText) => {
                        onScan(decodedText);
                        scanner.stop().catch(() => { });
                        onClose();
                    },
                    () => { } // ignore failures
                )
                .catch((err) => {
                    console.error("QR scanner error:", err);
                    setError("Camera access denied or unavailable.");
                });
        }, 300);

        return () => {
            clearTimeout(timeout);
            if (scannerRef.current) {
                scannerRef.current.stop().catch(() => { });
                scannerRef.current = null;
            }
            setError(null);
        };
    }, [open, onScan, onClose]);

    return (
        <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle className="font-bold flex items-center gap-2">
                        <Camera size={18} className="text-primary" />
                        {title}
                    </DialogTitle>
                </DialogHeader>

                <div className="flex flex-col items-center gap-4 py-2">
                    <div
                        id={containerId}
                        className="w-full max-w-[320px] aspect-square rounded-lg overflow-hidden bg-secondary"
                    />
                    {error && (
                        <p className="text-sm text-destructive text-center">{error}</p>
                    )}
                    <p className="text-xs text-muted-foreground text-center">
                        Point your camera at a QR code
                    </p>
                    <Button variant="secondary" onClick={onClose} className="w-full">
                        <X size={16} className="mr-2" />
                        Cancel
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
};

export default QrScanner;
