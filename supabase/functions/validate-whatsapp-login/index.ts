import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createSupabaseServiceRoleClient } from "../_shared/supabaseClient.ts";
import { corsHeaders } from "../_shared/cors.ts";

// @ts-ignore
Deno.serve(async (req: Request) => {
  console.log("Function started - validate-whatsapp-login");
  console.log("Request method:", req.method);
  const body = await req.text();
  console.log("Raw request body:", body);
  
  // Quick test to check APP_URL availability
  const testAppUrl = Deno.env.get("APP_URL");
  console.log("TEST: APP_URL value:", testAppUrl);
  
  if (!testAppUrl) {
    return new Response(
      JSON.stringify({ error: "APP_URL environment variable not found", debug: "Environment variable is missing" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
  
  try {
    // Handle CORS preflight requests
    if (req.method === 'OPTIONS') {
      return new Response('ok', { headers: corsHeaders });
    }

    // Parse the request body
    const { token } = JSON.parse(body);
    console.log("Extracted token:", token);

    if (!token) {
      return new Response(JSON.stringify({ error: "Token is required." }), {
        headers: { "Content-Type": "application/json" },
        status: 400,
      });
    }

    const supabaseClient = createSupabaseServiceRoleClient();

    // 1. Validate the token
    console.log("Looking up token in database:", token);
    const { data: loginData, error: loginError } = await supabaseClient
      .from("whatsapp_logins")
      .select("phone_number, expires_at, used_at")
      .eq("token", token)
      .single();

    console.log("Token lookup result:", { loginData, loginError });
    
    if (loginError) {
      console.error("Database error during token lookup:", loginError);
      return new Response(
        JSON.stringify({ error: "Database error: " + loginError.message }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }
    
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
      .eq("id", token);

    if (updateError) {
      console.error("Error marking token as used:", updateError);
      throw new Error("Failed to update token status.");
    }

    let phoneNumber = loginData.phone_number;
    // Normalize phone number to digits only for lookup in profiles table
    phoneNumber = phoneNumber.replace(/\D/g, ''); 

    // 3. Find user by phone number (temporarily mocked for testing)
    console.log("Looking up user for phone:", phoneNumber);
    
    // TODO: Implement proper user lookup when profiles table has phone_number column
    // For now, create a mock user for testing
    const user = {
      id: "00000000-0000-0000-0000-000000000000", // Mock user ID
      email: "test@example.com"
    };
    
    console.log("Using mock user for testing:", user);

    // 4. Generate magic link using Supabase admin
    const userEmail = user.email; // Use the email from the profiles table
    const rawAppUrl = Deno.env.get("APP_URL");
    console.log("[Debug] APP_URL:", rawAppUrl);
    console.log("[Debug] APP_URL type:", typeof rawAppUrl);
    
    const appUrl = rawAppUrl || "http://localhost:5173";
    console.log("[Debug] Final appUrl:", appUrl);
    
    // Try a simpler generateLink call first
    const { data: authLink, error: generateLinkError } = await supabaseClient.auth.admin.generateLink({
      type: "magiclink",
      email: user.email!,
    });
    
    console.log("[Debug] Simple authLink:", JSON.stringify(authLink, null, 2));
    console.log("[Debug] Simple generateLinkError:", JSON.stringify(generateLinkError, null, 2));

    console.log(`DEBUG: generateLink response:`, JSON.stringify(authLink, null, 2));
    console.log(`DEBUG: generateLink error:`, generateLinkError);

    if (generateLinkError) {
      console.error("Error generating magic link:", generateLinkError.message);
      throw new Error(`Failed to generate login session: ${generateLinkError.message}`);
    }
    
    // Check for the correct response structure based on Supabase documentation
    const actionLink = authLink?.properties?.action_link || authLink?.action_link;
    const hashedToken = authLink?.properties?.hashed_token || authLink?.hashed_token;
    
    if (!actionLink) {
      console.error("Error generating magic link: No action link returned.");
      console.error("DEBUG: authLink structure:", JSON.stringify(authLink, null, 2));
      throw new Error("Failed to generate login session: No action link.");
    }

    console.log("Magic link generated successfully. Action Link:", actionLink);
    console.log("Hashed Token:", hashedToken);

    // The generated link contains the access_token and refresh_token in its URL parameters
    // We need to extract them.
    const redirectUrl = new URL(actionLink);
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
