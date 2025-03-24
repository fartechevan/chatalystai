
// Constants and utilities for Evolution API integration

// Base URL for Evolution API
export const EVO_API_BASE_URL = 'https://api.evoapicloud.com';

// Get Evolution API key and build request options
export function getEvolutionAPIOptions(method = 'GET'): RequestInit {
  const apiKey = Deno.env.get('EVOLUTION_API_KEY');
  
  if (!apiKey) {
    console.error('EVOLUTION_API_KEY environment variable is not set');
  }
  
  const options: RequestInit = {
    method,
    headers: {
      apikey: apiKey || '',
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    }
  };
  
  // For POST requests, add an empty body if none provided
  if (method === 'POST') {
    options.body = JSON.stringify({});
  }
  
  return options;
}

// Format QR code base64 string to proper data URL
export function formatQrCodeUrl(base64Value: string): string {
  return base64Value.startsWith('data:image/')
    ? base64Value
    : `data:image/png;base64,${base64Value}`;
}
