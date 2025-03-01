// supabase/functions/public-webhook/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

serve(async (req) => {
  try {
    // Check if the request method is POST
    if (req.method !== 'POST') {
      return new Response(JSON.stringify({ error: 'Method Not Allowed' }), {
        status: 405,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Parse the incoming request body (assuming JSON)
    const body = await req.json();

    // Log the request body
    console.log(JSON.stringify({
      level: 'info',
      message: 'Request Body',
      body: body,
    }, null, 2));

    // Process the data (replace with your logic)
    const processedData = body;

    // Create the response
    const responseBody = { result: processedData };

    // Log the response
    console.log(JSON.stringify({
      level: 'info',
      message: 'Response Body',
      response: responseBody,
      status: 200,
    }, null, 2));

    // Return the parsed body as the response
    return new Response(JSON.stringify(responseBody), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error("Error:", error.message);

    return new Response(JSON.stringify({ error: error.message }), {
      status: 400, // Bad Request for parsing errors
      headers: { 'Content-Type': 'application/json' },
    });
  }
});