
/**
 * WhatsApp integration utility functions for formatting
 */

/**
 * Format QR code base64 string to proper data URL
 */
export const formatQrCodeUrl = (base64Value: string): string => {
  return base64Value.startsWith('data:image/')
    ? base64Value
    : `data:image/png;base64,${base64Value}`;
};
