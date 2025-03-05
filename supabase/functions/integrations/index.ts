import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
const EVO_API_URL = "https://api.evoapicloud.com/message/sendText/";
const API_KEY = "29ec34d7-43d1-4657-9810-f5e60b527e60";

// Add CORS headers for browser compatibility
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Content-Type': 'application/json'
};

serve(async (req) => {
  const requestId = crypto.randomUUID();
  console.log(`[${requestId}] Received request to integrations function: ${req.method}`);
  
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    console.log(`[${requestId}] Handling CORS preflight request`);
    return new Response(null, { headers: corsHeaders });
  }

  try {
    if (req.method !== "POST") {
      console.log(`[${requestId}] Method not allowed: ${req.method}`);
      return new Response(JSON.stringify({ error: "Method Not Allowed" }), {
        status: 405,
        headers: corsHeaders,
      });
    }

    // Log the raw request body
    const rawBody = await req.clone().text();
    console.log(`[${requestId}] Raw request body:`, rawBody);
    
    const body = JSON.parse(rawBody);
    console.log(`[${requestId}] Parsed request body:`, JSON.stringify(body, null, 2));

    // Extract data from the request body
    const { number, text, instanceId } = body;

    if (!number || !text || !instanceId) {
      console.log(`[${requestId}] Missing required parameters. number: ${!!number}, text: ${!!text}, instanceId: ${!!instanceId}`);
      return new Response(
        JSON.stringify({ error: "Missing required parameters" }),
        {
          status: 400,
          headers: corsHeaders,
        },
      );
    }

    const apiUrl = EVO_API_URL + instanceId;
    console.log(`[${requestId}] Sending message to: ${apiUrl}`);

    const evoApiPayload = {
      number: number,
      text: text,
    };

    console.log(`[${requestId}] Request payload to Evolution API:`, JSON.stringify(evoApiPayload));
    
    const resp = await fetch(apiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: API_KEY,
      },
      body: JSON.stringify(evoApiPayload),
    });

    console.log(`[${requestId}] Evolution API response status: ${resp.status}`);
    
    if (!resp.ok) {
      const responseText = await resp.text();
      console.error(`[${requestId}] Evolution API error: ${resp.status}`, responseText);
      return new Response(
        JSON.stringify({ error: "Failed to send message", evoApiStatus: resp.status, details: responseText }),
        {
          status: 500,
          headers: corsHeaders,
        },
      );
    }

    const data = await resp.json();
    console.log(`[${requestId}] Evolution API success response:`, JSON.stringify(data));

    return new Response(JSON.stringify({ success: true, data }), {
      headers: corsHeaders,
    });
  } catch (error) {
    console.error(`Error in integrations function:`, error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: corsHeaders,
    });
  }
});
