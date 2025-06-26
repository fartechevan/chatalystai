import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";
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
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { email, password, licenseKey } = await req.json();

    if (!email || !password || !licenseKey) {
      return new Response(
        JSON.stringify({ error: "Email, password, and licenseKey are required." }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 400,
        }
      );
    }

    const supabaseAdminClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const newJwtSecret = Deno.env.get("JWT_SECRET_NEW") ?? "";
    const oldJwtSecret = Deno.env.get("JWT_SECRET") ?? "";

    // Log the retrieved secrets to check their exact values
    console.log(`Retrieved JWT_SECRET_NEW for decoding: '${newJwtSecret}' (length: ${newJwtSecret?.length})`);
    if (oldJwtSecret) {
      console.log(`Retrieved JWT_SECRET (old) for decoding: '${oldJwtSecret}' (length: ${oldJwtSecret?.length})`);
    }

    let licenseClaims: LicenseClaims | null = null;
    let isValidLicense = false;

    if (!newJwtSecret) {
        console.error("JWT_SECRET_NEW is not set in environment variables.");
        if (oldJwtSecret && typeof oldJwtSecret === 'string') {
            console.log(`Attempting to prepare oldJwtSecret (primary due to new missing): '${oldJwtSecret}' for JWT verification.`);
            try {
                console.log(`Received licenseKey for verification with old secret (primary): '${licenseKey}'`); // Log the licenseKey
                const oldKeyData = oldJwtSecret.trim();
                const oldCryptoKey = await crypto.subtle.importKey(
                  "raw",
                  new TextEncoder().encode(oldKeyData),
                  { name: "HMAC", hash: "SHA-256" },
                  false, // extractable
                  ["verify"] // key usages
                );
                licenseClaims = await verify(licenseKey, oldCryptoKey) as LicenseClaims;
                isValidLicense = true;
                console.log("License verified with old JWT secret (new secret was not set) using CryptoKey.");
            } catch (e) {
                console.error(`License verification failed with old JWT secret (new secret was not set): ${e.message}`);
            }
        } else {
            if (!oldJwtSecret) console.error("Old JWT_SECRET is also not set.");
            else console.error("Old JWT_SECRET is not a string.");
            
            return new Response(
                JSON.stringify({ error: "JWT secret configuration error. Neither new nor old secret is properly configured." }),
                { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
            );
        }
    } else { // newJwtSecret IS set
        try {
            if (typeof newJwtSecret !== 'string') { 
                throw new Error(`JWT_SECRET_NEW is not a valid string. Value: ${newJwtSecret}`);
            }
            console.log(`Attempting to prepare newJwtSecret: '${newJwtSecret}' for JWT verification.`);
            console.log(`Received licenseKey for verification with new secret: '${licenseKey}'`); // Log the licenseKey
                    const newKeyData = newJwtSecret.trim();
                    const newCryptoKey = await crypto.subtle.importKey(
                      "raw",
                      new TextEncoder().encode(newKeyData),
                      { name: "HMAC", hash: "SHA-256" },
                      false, // extractable
                      ["verify"] // key usages
                    );
            licenseClaims = await verify(licenseKey, newCryptoKey) as LicenseClaims; // djwt infers alg from CryptoKey
            isValidLicense = true;
            console.log("License verified with new JWT secret using CryptoKey.");
        } catch (e) { // Failed with newJwtSecret
            console.warn(`License verification with new JWT secret failed: ${e.message}`);
            if (oldJwtSecret && typeof oldJwtSecret === 'string') {
                console.log(`Attempting to prepare oldJwtSecret (fallback): '${oldJwtSecret}' for JWT verification.`);
                try {
                    console.log(`Received licenseKey for verification with old secret (fallback): '${licenseKey}'`); // Log the licenseKey
                    const oldKeyDataFallback = oldJwtSecret.trim();
                    const oldCryptoKeyFallback = await crypto.subtle.importKey(
                      "raw",
                      new TextEncoder().encode(oldKeyDataFallback),
                      { name: "HMAC", hash: "SHA-256" },
                      false, // extractable
                      ["verify"] // key usages
                    );
                    licenseClaims = await verify(licenseKey, oldCryptoKeyFallback) as LicenseClaims;
                    isValidLicense = true;
                    console.log("License verified with old JWT secret (fallback) using CryptoKey.");
                } catch (e2) {
                    console.error(`License verification failed with old JWT secret (fallback): ${e2.message}`);
                }
            } else {
                console.log("Old JWT_SECRET not available for fallback or not a string.");
            }
        }
    }
    

    if (!isValidLicense || !licenseClaims) {
      return new Response(
        JSON.stringify({ error: "Invalid or expired license key." }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 403, // Forbidden
        }
      );
    }

    // Optional: Further validation of claims (e.g., check expires_at)
    if (licenseClaims.expires_at) {
      try {
        const expiresAt = new Date(licenseClaims.expires_at);
        if (expiresAt < new Date()) {
          return new Response(
            JSON.stringify({ error: "License key has expired." }),
            {
              headers: { ...corsHeaders, "Content-Type": "application/json" },
              status: 403,
            }
          );
        }
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

    // Create the user
    const { data: userData, error: userError } = await supabaseAdminClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // Auto-confirm email, or handle confirmation flow
      user_metadata: {
        license_details: licenseClaims, // Store validated license claims
      },
    });

    if (userError) {
      console.error("Error creating user:", userError);
      return new Response(JSON.stringify({ error: userError.message }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: userError.status || 400,
      });
    }

    // Optionally, sign in the user and return a session
    // This part might be complex if you want to return a client-side usable session directly
    // For simplicity, we'll just return the user data for now.
    // The client can then attempt to sign in with the credentials.

    return new Response(JSON.stringify({ user: userData.user }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 201, // Created
    });

  } catch (error) {
    console.error("Unhandled error:", error);
    return new Response(JSON.stringify({ error: error.message || "Internal server error." }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
