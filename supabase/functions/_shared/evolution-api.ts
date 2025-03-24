
// Get the Evolution API base URL from environment variables or use default
export const EVO_API_BASE_URL = Deno.env.get("EVOLUTION_API_URL") || "https://api.evoapicloud.com";

// Get Evolution API options with the appropriate headers
export function getEvolutionAPIOptions(method: string = 'GET') {
  const apiKey = Deno.env.get("EVOLUTION_API_KEY") || "";
  
  if (!apiKey) {
    console.error("EVOLUTION_API_KEY environment variable is not set");
  }
  
  return {
    method,
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'apikey': apiKey,
    },
  };
}

// Helper to format the API URL with the instance ID
export function getInstanceApiUrl(endpoint: string, instanceId?: string) {
  if (instanceId) {
    return `${EVO_API_BASE_URL}/${endpoint}/${instanceId}`;
  }
  return `${EVO_API_BASE_URL}/${endpoint}`;
}
