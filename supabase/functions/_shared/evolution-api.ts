
// Base URL for Evolution API
export const EVO_API_BASE_URL = Deno.env.get('EVOLUTION_API_URL') || 'https://api.evoapicloud.com';

/**
 * Creates standard options for Evolution API requests
 */
export function getEvolutionAPIOptions(method = 'GET', body?: object): RequestInit {
  const options: RequestInit = {
    method,
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'apikey': Deno.env.get('EVOLUTION_API_KEY') || '',
    },
  };

  if (body) {
    options.body = JSON.stringify(body);
  }

  return options;
}

/**
 * Creates a URL for instance-specific API requests
 */
export function getInstanceApiUrl(base: string, instanceId: string): string {
  return `${EVO_API_BASE_URL}/${base}/${instanceId}`;
}
