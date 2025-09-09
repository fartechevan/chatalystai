import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.5";

serve(async (req) => {
  try {
    const { phone_number } = await req.json();

    if (!phone_number) {
      return new Response(JSON.stringify({ error: "Phone number is required." }), {
        headers: { "Content-Type": "application/json" },
        status: 400,
      });
    }

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      {
        auth: {
          persistSession: false,
        },
      },
    );

    // Generate a unique token
    const token = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString(); // Token valid for 5 minutes

    const { data, error } = await supabaseClient
      .from("whatsapp_logins")
      .insert({ phone_number, token, expires_at: expiresAt })
      .select()
      .single();

    if (error) {
      console.error("Error inserting token:", error);
      throw new Error("Failed to generate login token.");
    }

    const magicLink = `${Deno.env.get("APP_URL")}/whatsapp-login?token=${token}`;
    const responseMessage = `Click this link to log in: ${magicLink}`;

    return new Response(JSON.stringify({ response: responseMessage }), {
      headers: { "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    console.error("Function error:", error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { "Content-Type": "application/json" },
      status: 500,
    });
  }
});
