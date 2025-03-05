
/**
 * Types related to message operations
 */
export interface WhatsAppMessageRequest {
  configId: string;
  number: string;
  text: string;
}

export interface WhatsAppMessageResponse {
  success: boolean;
  message?: string;
  error?: string;
}
