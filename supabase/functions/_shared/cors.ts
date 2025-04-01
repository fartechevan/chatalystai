
export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

export function cors(req: Request, res: Response): Response {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  } else {
    const response = new Response(res.body, res);
    for (const key in corsHeaders) {
      response.headers.set(key, corsHeaders[key]);
    }
    return response;
  }
}
