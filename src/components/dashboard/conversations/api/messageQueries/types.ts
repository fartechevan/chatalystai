
/**
 * Types related to message operations
 */
export interface WhatsAppMessageRequest {
  number: string;
  text: string;
  instanceId: string;
}

export interface WhatsAppMessageResponse {
  success: boolean;
  message?: string;
  error?: string;
  data?: any;
}
