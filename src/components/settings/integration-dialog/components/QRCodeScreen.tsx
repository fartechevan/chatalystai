
import { BaseDialog } from "./BaseDialog";

interface QRCodeScreenProps {
  open: boolean;
  onClose: () => void;
  onOpenChange: (open: boolean) => void;
  qrCodeBase64?: string | null;
  // pairingCode?: string | null; // Removed pairingCode prop
}

export function QRCodeScreen({ open, onClose, onOpenChange, qrCodeBase64 }: QRCodeScreenProps) {
  console.log('QR Code Data:', qrCodeBase64); // Debug log
  // console.log('Pairing Code:', pairingCode); // Debug log removed

  return (
    <BaseDialog
      open={open}
      onOpenChange={onOpenChange}
      onClose={onClose}
      title="Connect WhatsApp"
      description="Scan the QR code in WhatsApp to connect" // Updated description
    >
      <div className="space-y-6">
        {/* Pairing code display removed */}
        {/* {pairingCode && ( ... )} */}
        
        <div className="grid grid-cols-2 gap-8">
          <div className="flex items-center justify-center">
            <video 
              src="https://global-core-public-static-files.s3.amazonaws.com/onboarding-com/en/ios-scan-en.mp4"
              autoPlay 
              loop 
              muted 
              playsInline
              className="w-full h-auto rounded-lg"
            />
          </div>
          <div className="flex items-center justify-center">
            <div className="aspect-square w-full max-w-[240px] bg-white p-4 rounded-xl">
              {qrCodeBase64 ? (
                <img
                  src={qrCodeBase64}
                  alt="WhatsApp QR Code"
                  className="w-full h-full object-contain"
                  onError={(e) => console.error('QR code image error:', e)}
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-gray-400">
                  {'Loading QR code...'} {/* Simplified fallback text */}
                </div>
              )}
            </div>
          </div>
        </div>
        <div className="text-center space-y-2">
          <p className="text-sm font-medium">✋ Read before scanning</p>
          <p className="text-sm text-muted-foreground">
            To find WhatsApp's QR scanner, tap Settings ⚙️ {'>'}
            <br />
            Linked Devices {'>'} Link a Device.
          </p>
          <p className="text-sm text-muted-foreground">
            <a href="#" className="text-blue-600 hover:underline">Trouble connecting?</a>
          </p>
        </div>
      </div>
    </BaseDialog>
  );
}
