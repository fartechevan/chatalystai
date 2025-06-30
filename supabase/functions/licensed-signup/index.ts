import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "./cors.ts";
import { verify } from "https://deno.land/x/djwt@v2.8/mod.ts"; // Ensure you have a compatible djwt version
import { decode as base64Decode } from "https://deno.land/std@0.168.0/encoding/base64.ts";

interface LicenseClaims {
  // Define expected claims in your license JWT
  app_name?: string;
  expires_at?: string; // ISO 8601 date string
  // Add other claims as needed
  [key: string]: unknown;
}

serve(async (req) => {
  console.log("licensed-signup function invoked.");

  if (req.method === "OPTIONS") {
    console.log("Handling OPTIONS preflight request.");
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    console.log("Parsing request body.");
    const { email, password, licenseKey } = await req.json();
    console.log(`Request body parsed. Email: ${email}, License Key provided: ${!!licenseKey}`);

    if (!email || !password || !licenseKey) {
      console.error("Missing required fields: email, password, or licenseKey.");
      return new Response(
        JSON.stringify({ error: "Email, password, and licenseKey are required." }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 400,
        }
      );
    }

    console.log("Initializing Supabase admin client.");
    const supabaseAdminClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );
    console.log("Supabase admin client initialized.");

    const newJwtSecret = Deno.env.get("JWT_SECRET_NEW") ?? "";
    const oldJwtSecret = Deno.env.get("JWT_SECRET") ?? "";

    console.log(`Retrieved JWT_SECRET_NEW: ${newJwtSecret ? 'found' : 'not found'} (length: ${newJwtSecret?.length})`);
    console.log(`Retrieved JWT_SECRET (old): ${oldJwtSecret ? 'found' : 'not found'} (length: ${oldJwtSecret?.length})`);

    let licenseClaims: LicenseClaims | null = null;
    let isValidLicense = false;

    if (!newJwtSecret) {
        console.error("JWT_SECRET_NEW is not set. Falling back to old secret.");
        if (oldJwtSecret && typeof oldJwtSecret === 'string') {
            try {
                console.log("Verifying license with old JWT secret (primary).");
                const oldKeyData = oldJwtSecret.trim();
                const oldCryptoKey = await crypto.subtle.importKey("raw", new TextEncoder().encode(oldKeyData), { name: "HMAC", hash: "SHA-256" }, false, ["verify"]);
                licenseClaims = await verify(licenseKey, oldCryptoKey) as LicenseClaims;
                isValidLicense = true;
                console.log("License verified successfully with old JWT secret.");
            } catch (e) {
                console.error(`License verification failed with old JWT secret: ${e.message}`);
            }
        } else {
            console.error("Old JWT_SECRET is not available or not a string. Cannot verify license.");
            return new Response(
                JSON.stringify({ error: "JWT secret configuration error." }),
                { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
            );
        }
    } else {
        try {
            console.log("Verifying license with new JWT secret.");
            if (typeof newJwtSecret !== 'string') { throw new Error("JWT_SECRET_NEW is not a valid string."); }
            const newKeyData = newJwtSecret.trim();
            const newCryptoKey = await crypto.subtle.importKey("raw", new TextEncoder().encode(newKeyData), { name: "HMAC", hash: "SHA-256" }, false, ["verify"]);
            licenseClaims = await verify(licenseKey, newCryptoKey) as LicenseClaims;
            isValidLicense = true;
            console.log("License verified successfully with new JWT secret.");
        } catch (e) {
            console.warn(`License verification with new JWT secret failed: ${e.message}. Trying fallback.`);
            if (oldJwtSecret && typeof oldJwtSecret === 'string') {
                try {
                    console.log("Verifying license with old JWT secret (fallback).");
                    const oldKeyDataFallback = oldJwtSecret.trim();
                    const oldCryptoKeyFallback = await crypto.subtle.importKey("raw", new TextEncoder().encode(oldKeyDataFallback), { name: "HMAC", hash: "SHA-256" }, false, ["verify"]);
                    licenseClaims = await verify(licenseKey, oldCryptoKeyFallback) as LicenseClaims;
                    isValidLicense = true;
                    console.log("License verified successfully with old JWT secret (fallback).");
                } catch (e2) {
                    console.error(`License verification failed with old JWT secret (fallback): ${e2.message}`);
                }
            } else {
                console.log("Old JWT_SECRET not available for fallback.");
            }
        }
    }

    if (!isValidLicense || !licenseClaims) {
      console.error("License is invalid or verification failed.");
      return new Response(
        JSON.stringify({ error: "Invalid or expired license key." }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 403,
        }
      );
    }
    console.log("License is valid. Proceeding to check expiration.");

    if (licenseClaims.expires_at) {
      try {
        const expiresAt = new Date(licenseClaims.expires_at);
        if (expiresAt < new Date()) {
          console.error("License key has expired.");
          return new Response(
            JSON.stringify({ error: "License key has expired." }),
            {
              headers: { ...corsHeaders, "Content-Type": "application/json" },
              status: 403,
            }
          );
        }
        console.log("License expiration check passed.");
      } catch (e) {
        console.error("Error parsing expires_at:", e);
        return new Response(
          JSON.stringify({ error: "Invalid expires_at format." }),
          {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 400,
          }
        );
      }
    }

    console.log("Creating user in Supabase.");
    const { data: userData, error: userError } = await supabaseAdminClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        license_details: licenseClaims,
      },
    });

    if (userError) {
      console.error("Error creating user:", userError.message);
      return new Response(JSON.stringify({ error: userError.message }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: userError.status || 400,
      });
    }

    console.log("User created successfully:", userData.user.id);
    return new Response(JSON.stringify({ user: userData.user }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 201,
    });

  } catch (error) {
    console.error("Unhandled error in licensed-signup function:", error.message);
    return new Response(JSON.stringify({ error: error.message || "Internal server error." }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
