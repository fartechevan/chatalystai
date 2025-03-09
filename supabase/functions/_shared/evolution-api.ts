
// Constants and utilities for Evolution API integration

// Base URL for Evolution API
export const EVO_API_BASE_URL = 'https://api.evoapicloud.com';

// Get Evolution API key and build request options
export function getEvolutionAPIOptions(apiKey: string, method = 'GET'): RequestInit {
  return {
    method,
    headers: {
      apikey: apiKey,
      'Content-Type': 'application/json'
    }
  };
}

// Format QR code base64 string to proper data URL
export function formatQrCodeUrl(base64Value: string): string {
  return base64Value.startsWith('data:image/')
    ? base64Value
    : `data:image/png;base64,${base64Value}`;
}
