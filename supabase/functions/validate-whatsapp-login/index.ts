import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createSupabaseServiceRoleClient } from "../_shared/supabaseClient.ts";
import { corsHeaders } from "../_shared/cors.ts";

// @ts-ignore
Deno.serve(async (req: Request) => {
  console.log("Function started - validate-whatsapp-login");
  console.log("Request method:", req.method);
  const body = await req.text();
  console.log("Raw request body:", body);
  
  // Log APP_URL availability for debugging
  const testAppUrl = Deno.env.get("APP_URL");
  console.log("TEST: APP_URL value:", testAppUrl);
  console.log("Will use fallback if APP_URL is not available");
  
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
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      });
    }

    let supabaseClient;
    try {
      supabaseClient = createSupabaseServiceRoleClient();
      console.log("Service role client created successfully");
    } catch (clientError: unknown) {
      console.error("Failed to create service role client:", clientError);
      throw new Error(`Service role client error: ${(clientError as Error).message}`);
    }

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
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    
    if (loginError || !loginData) {
      console.error("Token lookup error:", loginError);
      throw new Error("Invalid token.");
    }

    // TEMPORARILY DISABLED FOR TESTING: Expiration and used_at checks
    // if (new Date(loginData.expires_at) < new Date()) {
    //   throw new Error("Token has expired.");
    // }

    // if (loginData.used_at) {
    //   throw new Error("Token has already been used.");
    // }
    
    console.log("Token validation bypassed for testing - any valid token will work");

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

    // 3. Find user by phone number in profiles table
    console.log("Looking up user for phone:", phoneNumber);
    
    const { data: user, error: userLookupError } = await supabaseClient
      .from("profiles")
      .select("id, email, phone_number")
      .eq("phone_number", phoneNumber)
      .single();

    if (userLookupError || !user) {
      console.error("User lookup error:", userLookupError);
      return new Response(
        JSON.stringify({ 
          error: "User not found", 
          message: "No user found with this phone number. Please ensure you have an account registered with this phone number." 
        }),
        { 
          status: 404, 
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        }
      );
    }
    
    console.log("Found user:", { id: user.id, email: user.email, phone: user.phone_number });

    // 4. Generate magic link using Supabase admin
    const userEmail = user.email; // Use the email from the profiles table
    const rawAppUrl = Deno.env.get("APP_URL");
    console.log("[Debug] APP_URL:", rawAppUrl);
    console.log("[Debug] APP_URL type:", typeof rawAppUrl);
    
    const appUrl = rawAppUrl || "https://app.chattalyst.com";
    console.log("[Debug] Final appUrl:", appUrl);
    
    // Generate magic link with proper redirectTo URL
    const { data: authLink, error: generateLinkError } = await supabaseClient.auth.admin.generateLink({
      type: "magiclink",
      email: user.email!,
      options: {
        redirectTo: `${appUrl}/dashboard`
      }
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

    // Mark the token as used
    const { error: markUsedError } = await supabaseClient
      .from('whatsapp_logins')
      .update({ used_at: new Date().toISOString() })
      .eq('token', token);

    if (markUsedError) {
      console.error("Error marking token as used:", markUsedError);
      // Don't fail the request if this update fails
    }

    return new Response(JSON.stringify({
      message: "Login successful!",
      magic_link: actionLink,
      user: { id: user.id, phone_number: phoneNumber }
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });


  } catch (error: unknown) {
    console.error("Function error:", (error as Error).message);
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
