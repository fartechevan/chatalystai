import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const EVO_API_BASE_URL = "https://api.evoapicloud.com"; // Extracted base URL

// Supabase configuration
const supabaseUrl = Deno.env.get("SUPABASE_URL");
const supabaseKey = Deno.env.get("SUPABASE_ANON_KEY");

if (!supabaseUrl || !supabaseKey) {
  Deno.exit(1);
}

const supabaseClient = createClient(supabaseUrl, supabaseKey);

// Define CORS headers
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  console.log("Integrations edge function called", req);
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const integrationId = "bda44db7-4e9a-4733-a9c7-c4f5d7198905";

  // Fetch integration configuration from Supabase
  const { data: integration, error: integrationError } = await supabaseClient
    .from("integrations_config")
    .select("api_key, instance_id")
    .eq("id", integrationId)
    .single();

  if (integrationError) {
    return new Response(
      JSON.stringify({ error: "Failed to fetch integration configuration" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }

  if (!integration) {
    return new Response(
      JSON.stringify({ error: "Integration configuration not found" }),
      {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }

  const { api_key: apiKey, instance_id: instanceId } = integration;

  if (!apiKey) {
    return new Response(
      JSON.stringify({
        error: "API key not configured in integrations_config",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }

  // Parse URL to get the path
  const url = new URL(req.url);
  const path = url.pathname;

  if (req.method === "GET" && path.includes("/instance/fetchInstances")) {
    const options = {
      method: "GET",
      headers: { apikey: apiKey },
    };

    try {
      const response = await fetch(
        EVO_API_BASE_URL + "/instance/fetchInstances",
        options,
      );
      const data = await response.json();
      return new Response(
        JSON.stringify(data),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: response.status,
        },
      );
    } catch (err) {
      return new Response(
        JSON.stringify({ error: err.message }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }
  } else if (
    req.method === "GET" && path.includes("/instance/connectionState/")
  ) {
    const options = {
      method: "GET",
      headers: { apikey: apiKey },
    };
    const apiUrl = `${EVO_API_BASE_URL}/instance/connectionState/${instanceId}`;

    try {
      const response = await fetch(apiUrl, options);
      const data = await response.json();
      return new Response(
        JSON.stringify(data),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: response.status,
        },
      );
    } catch (err) {
      return new Response(
        JSON.stringify({ error: err.message }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }
  } else if (req.method === "GET" && path.includes("/instance/connect/")) {
    const options = {
      method: "GET",
      headers: { apikey: apiKey },
    };
    const apiUrl = `${EVO_API_BASE_URL}/instance/connect/${instanceId}`;

    try {
      const response = await fetch(apiUrl, options);
      const data = await response.json();
      return new Response(
        JSON.stringify(data),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: response.status,
        },
      );
    } catch (err) {
      return new Response(
        JSON.stringify({ error: err.message }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }
  } else if (req.method === "POST" && path.includes("/message/sendText/")) {
    try {
      const body = await req.json();
      const options = {
        method: "POST",
        headers: {
          apikey: apiKey,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      };

      const apiUrl = `${EVO_API_BASE_URL}/message/sendText/${instanceId}`;

      const response = await fetch(apiUrl, options);
      const data = await response.json();
      return new Response(
        JSON.stringify(data),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: response.status,
        },
      );
    } catch (err) {
      return new Response(
        JSON.stringify({ error: err.message }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }
  } else {
    return new Response(
      JSON.stringify({ error: "Invalid request" }),
      {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
