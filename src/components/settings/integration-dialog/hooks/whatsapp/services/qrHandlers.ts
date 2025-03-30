
import { formatQrCodeUrl } from "../utils/formatters";

/**
 * Process QR code or pairing code from API response
 */
export function processConnectionData(
  data: any,
  toastFn: (props: any) => void
) {
  // Check if we received a QR code or pairing code

  console.log("qrcode data:",data);
  if (data && (data.qrcode || data.base64 || data.pairingCode)) {
    // We got a proper response with either QR code or pairing code
    const qrCodeBase64 = data.qrcode || data.base64 || null;
    const pairingCode = data.pairingCode || null;
    
    console.log('QR Code Base64:', qrCodeBase64);
    const formattedQrCode = qrCodeBase64 ? formatQrCodeUrl(String(qrCodeBase64)) : null;
    
    if (pairingCode) {
      toastFn({
        title: "Pairing Code",
        description: `Enter this code on your phone: ${pairingCode}`,
      });
    }
    
    return {
      success: true,
      qrCodeDataUrl: formattedQrCode,
      pairingCode
    };
  }
  
  return {
    success: false,
    error: "No QR code or pairing code data returned"
  };
}
