import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const EVO_API_BASE_URL = 'https://api.evoapicloud.com'; // Extracted base URL

serve(async (req) => {
  const apiKey = 'd20770d7-312f-499a-b841-4b64a243f24c'; // Hardcoded API key

  if (req.method === 'GET' && req.url.includes('/instance/fetchInstances')) {
    const options = {
      method: 'GET',
      headers: { apikey: apiKey }
    };

    try {
      const response = await fetch(EVO_API_BASE_URL + '/instance/fetchInstances', options);
      const data = await response.json();
      return new Response(JSON.stringify(data), {
        headers: { 'Content-Type': 'application/json' },
        status: response.status,
      });
    } catch (err) {
      console.error(err);
      return new Response(JSON.stringify({ error: err.message }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }
  } else if (req.method === 'GET' && req.url.includes('/instance/connect/')) {
    const options = {
      method: 'GET',
      headers: { apikey: apiKey }
    };
    const instance = req.url.split('/').pop(); // Extract instance from URL
    const apiUrl = `${EVO_API_BASE_URL}/instance/connect/${instance}`;

    try {
      const response = await fetch(apiUrl, options);
      const data = await response.json();
      return new Response(JSON.stringify(data), {
        headers: { 'Content-Type': 'application/json' },
        status: response.status,
      });
    } catch (err) {
      console.error(err);
      return new Response(JSON.stringify({ error: err.message }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }
  } else if (req.method === 'POST' && req.url.includes('/message/sendText/')) {
    const options = {
      method: 'POST',
      headers: {
        apikey: apiKey,
        'Content-Type': 'application/json'
      },
      body: '{"number":"<string>","text":"<string>","delay":123,"quoted":{"key":{"remoteJid":"<string>","fromMe":true,"id":"<string>","participant":"<string>"},"message":{"conversation":"<string>"}},"linkPreview":true,"mentionsEveryOne":true,"mentioned":["<string>"]}'
    };

    const instance = req.url.split('/').pop(); // Extract instance from URL
    const apiUrl = `${EVO_API_BASE_URL}/message/sendText/${instance}`;

    try {
      const response = await fetch(apiUrl, options);
      const data = await response.json();
      return new Response(JSON.stringify(data), {
        headers: { 'Content-Type': 'application/json' },
        status: response.status,
      });
    } catch (err) {
      console.error(err);
      return new Response(JSON.stringify({ error: err.message }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }
  } else {
    return new Response(JSON.stringify({ error: 'Invalid request' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }
});
