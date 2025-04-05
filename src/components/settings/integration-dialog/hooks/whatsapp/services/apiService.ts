
import { evolutionApiKey, evolutionServerUrl } from "./config";

/**
 * Makes an authenticated request to the Evolution API
 */
export async function makeEvolutionApiRequest(
  endpoint: string,
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' = 'GET',
  body?: any
): Promise<any> {
  const url = `${evolutionServerUrl}${endpoint}`;
  
  // Ensure we have an API key
  const apiKey = evolutionApiKey;
  if (!apiKey) {
    throw new Error('API key is missing. Cannot make request to Evolution API.');
  }
  
  console.log(`Making ${method} request to: ${url}`);
  
  const requestOptions: RequestInit = {
    method,
    headers: {
      'Content-Type': 'application/json',
      'apikey': apiKey,
    },
  };
  
  if (body && (method === 'POST' || method === 'PUT')) {
    requestOptions.body = JSON.stringify(body);
  }
  
  try {
    const response = await fetch(url, requestOptions);
    
    // Handle non-JSON responses
    if (!response.headers.get('content-type')?.includes('application/json')) {
      if (!response.ok) {
        throw new Error(`API request failed with status: ${response.status}`);
      }
      return { success: true, status: response.status };
    }
    
    // Parse and return JSON response
    const data = await response.json();
    
    if (!response.ok) {
      // Format error response
      const errorMessage = data?.error?.message || data?.message || `API request failed with status: ${response.status}`;
      throw new Error(errorMessage);
    }
    
    return data;
  } catch (error) {
    console.error('Evolution API request failed:', error);
    throw error;
  }
}
