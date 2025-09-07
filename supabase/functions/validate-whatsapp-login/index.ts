import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.5";

serve(async (req) => {
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
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
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

    const phoneNumber = loginData.phone_number;

    // 3. Find or create user by phone number
    // Note: Supabase Auth does not directly support phone number login for magic links.
    // We'll simulate it by finding/creating a user and then generating a session.
    // This assumes you have a way to link phone numbers to user accounts,
    // e.g., storing phone_number in user_metadata or a separate profile table.

    // For simplicity, let's assume we create a user if not found, and then sign them in.
    // In a real app, you might want to associate the phone number with an existing user.
    let user;
    const { data: users, error: userLookupError } = await supabaseClient
      .from("profiles") // Assuming you have a profiles table linked to auth.users
      .select("id, user_id")
      .eq("phone_number", phoneNumber);

    if (userLookupError) {
      console.error("User lookup error:", userLookupError);
      throw new Error("Failed to look up user.");
    }

    if (users && users.length > 0) {
      // User found
      user = users[0];
    } else {
      // User not found, create a new one (or link to an existing one if possible)
      // This part is highly dependent on your user management strategy.
      // For this example, we'll create a new auth user with a dummy email and link phone number.
      const dummyEmail = `${phoneNumber.replace(/\D/g, '')}@whatsapp.chattalyst.com`;
      const dummyPassword = crypto.randomUUID(); // Generate a strong random password

      const { data: newUserData, error: signUpError } = await supabaseClient.auth.signUp({
        email: dummyEmail,
        password: dummyPassword,
        options: {
          data: { phone_number: phoneNumber }, // Store phone number in user_metadata
        },
      });

      if (signUpError || !newUserData?.user) {
        console.error("User signup error:", signUpError);
        throw new Error("Failed to create new user.");
      }
      user = newUserData.user;
    }

    // 4. Generate a session for the user
    // This is a simplified approach. In a production environment, you might use
    // `supabase.auth.admin.generateLink` or similar admin-level functions
    // if you need to create a session directly without password.
    // For this example, we'll assume the client-side will handle the session
    // after receiving a success response.
    // The `setSession` call on the client side will effectively log them in.

    // Return a success message or user info (without sensitive data)
    return new Response(JSON.stringify({ message: "Login successful!", session: { access_token: "dummy", refresh_token: "dummy" } }), { // Dummy session for client to set
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
