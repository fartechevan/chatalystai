
export type ConnectionState = 'open' | 'connecting' | 'close' | 'unknown';

export interface WhatsAppConfig {
  instance_id: string;
  base_url: string;
  api_key: string;
  [key: string]: any;
}

export interface ConnectionResult {
  success: boolean;
  qrCodeDataUrl?: string;
}
