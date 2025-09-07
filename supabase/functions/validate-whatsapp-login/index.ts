import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.43.4";
import { corsHeaders } from "../_shared/cors.ts"; // Assuming cors.ts is in _shared

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { token } = await req.json();

    if (!token) {
      return new Response(JSON.stringify({ error: "Token is required." }), {
        headers: { "Content-Type": "application/json" },
        status: 400,
      });
    }

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "", // Use service role key for admin functions
      {
        auth: {
          persistSession: false,
        },
      },
    );

    // 1. Validate the token
    const { data: loginData, error: loginError } = await supabaseClient
      .from("whatsapp_logins")
      .select("phone_number, expires_at, used_at")
      .eq("token", token)
      .single();

    if (loginError || !loginData) {
      console.error("Token lookup error:", loginError);
      throw new Error("Invalid or expired token.");
    }

    if (new Date(loginData.expires_at) < new Date()) {
      throw new Error("Token has expired.");
    }

    if (loginData.used_at) {
      throw new Error("Token has already been used.");
    }

    // 2. Mark token as used
    const { error: updateError } = await supabaseClient
      .from("whatsapp_logins")
      .update({ used_at: new Date().toISOString() })
      .eq("token", token);

    if (updateError) {
      console.error("Error marking token as used:", updateError);
      throw new Error("Failed to update token status.");
    }

    let phoneNumber = loginData.phone_number;
    // Normalize phone number to digits only for lookup in profiles table
    phoneNumber = phoneNumber.replace(/\D/g, ''); 

    // 3. Find user by phone number
    let user;
    const { data: users, error: userLookupError } = await supabaseClient
      .from("profiles") // Assuming you have a profiles table linked to auth.users
      .select("id, email") // Select 'id' and 'email'
      .eq("phone_number", phoneNumber);

    if (userLookupError) {
      console.error("User lookup error:", userLookupError);
      throw new Error("Failed to look up user.");
    }

    if (users && users.length > 0) {
      // User found
      user = users[0];
      if (!user.email) {
        throw new Error("User profile found but email is missing. Email is required for login.");
      }
    } else {
      // User not found, return an error as per new requirement
      throw new Error("User not found. Please ensure your WhatsApp number is linked to an existing account.");
    }

    // 4. Generate a real session for the user using admin.generateLink
    const userEmail = user.email; // Use the email from the profiles table
    const appUrl = Deno.env.get("APP_URL"); // Get APP_URL from environment variables

    console.log(`Attempting to generate magic link for user ID: ${user.id}, email: ${userEmail}, redirect to: ${appUrl}`);
    console.log(`DEBUG: APP_URL from Deno.env: ${appUrl}`); // Log the actual env var value
    console.log(`DEBUG: user.id: ${user.id}`);
    console.log(`DEBUG: userEmail: ${userEmail}`);

    const { data: authLink, error: generateLinkError } = await supabaseClient.auth.admin.generateLink({
      type: 'magiclink',
      email: userEmail,
      options: {
        redirectTo: appUrl,
        data: { user_id: user.id }
      }
    });

    if (generateLinkError) {
      console.error("Error generating magic link:", generateLinkError.message);
      throw new Error(`Failed to generate login session: ${generateLinkError.message}`);
    }
    if (!authLink?.properties?.email_redirect_to) {
      console.error("Error generating magic link: No redirect URL returned.");
      throw new Error("Failed to generate login session: No redirect URL.");
    }

    console.log("Magic link generated successfully. Redirect URL:", authLink.properties.email_redirect_to);

    // The generated link contains the access_token and refresh_token in its URL parameters
    // We need to extract them.
    const redirectUrl = new URL(authLink.properties.email_redirect_to);
    const accessToken = redirectUrl.searchParams.get('access_token');
    const refreshToken = redirectUrl.searchParams.get('refresh_token');

    if (!accessToken || !refreshToken) {
      console.error("Failed to extract session tokens from generated link. AccessToken:", accessToken, "RefreshToken:", refreshToken);
      throw new Error("Failed to extract session tokens from generated link.");
    }

    return new Response(JSON.stringify({
      message: "Login successful!",
      session: {
        access_token: accessToken,
        refresh_token: refreshToken,
        user: { id: user.id, phone_number: phoneNumber } // Include user info for client
      }
    }), {
      headers: { "Content-Type": "application/json" },
      status: 200,
    });


  } catch (error: unknown) {
    console.error("Function error:", (error as Error).message);
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      headers: { "Content-Type": "application/json" },
      status: 500,
    });
  }
});
