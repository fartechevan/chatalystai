import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const EVO_API_URL = "https://api.evoapicloud.com/message/sendText/";
const API_KEY = "29ec34d7-43d1-4657-9810-f5e60b527e60";

serve(async (req) => {
  try {
    if (req.method !== "POST") {
      return new Response(JSON.stringify({ error: "Method Not Allowed" }), {
        status: 405,
        headers: { "Content-Type": "application/json" },
      });
    }

    const body = await req.json();

    // Extract data from the request body
    const { number, text } = body;
    const instanceId = req.url.split('/').pop(); // Extract instanceId from the URL

    if (!number || !text || !instanceId) {
      return new Response(
        JSON.stringify({ error: "Missing required parameters" }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        },
      );
    }

    const apiUrl = EVO_API_URL + instanceId;

    const evoApiPayload = {
      number: number,
      text: text,
    };

    const resp = await fetch(apiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: API_KEY,
      },
      body: JSON.stringify(evoApiPayload),
    });

    if (!resp.ok) {
      console.error("Evolution API error:", resp.status, await resp.text());
      return new Response(
        JSON.stringify({ error: "Failed to send message", evoApiStatus: resp.status }),
        {
          status: 500,
          headers: { "Content-Type": "application/json" },
        },
      );
    }

    const data = await resp.json();

    return new Response(JSON.stringify({ data }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});
