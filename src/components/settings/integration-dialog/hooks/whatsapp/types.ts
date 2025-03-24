
export type ConnectionState = 'open' | 'connecting' | 'unknown' | 'closed';

export interface WhatsAppConfig {
  id?: string;
  integration_id: string;
  instance_id: string;
  user_reference_id?: string;
  base_url?: string;
}

export interface ConnectionResult {
  success: boolean;
  qrCodeDataUrl?: string;
  error?: string;
}
