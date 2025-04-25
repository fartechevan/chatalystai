
/**
 * Adds CORS headers to a Response object.
 * 
 * @param req - The original Request object
 * @param res - The Response object to add CORS headers to
 * @returns A Response object with CORS headers
 */
export function cors(req: Request, res: Response): Response {
  const headers = new Headers(res.headers);
  
  // Set CORS headers
  headers.set('Access-Control-Allow-Origin', '*');
  headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  headers.set('Access-Control-Allow-Headers', 'authorization, x-client-info, apikey, content-type');
  
  return new Response(res.body, {
    status: res.status,
    statusText: res.statusText,
    headers
  });
}

// Export corsHeaders for backward compatibility
export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};
