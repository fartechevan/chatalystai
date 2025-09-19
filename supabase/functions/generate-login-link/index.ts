// deno-lint-ignore-file no-explicit-any
// @ts-ignore: Ignore TypeScript errors for Deno-specific modules
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders } from '../_shared/cors.ts';
import { createSupabaseServiceRoleClient } from '../_shared/supabaseClient.ts';

interface LoginLinkRequest {
  email: string;
  phone_number?: string;
  redirect_to?: string;
}

serve(async (req: Request) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    if (req.method !== 'POST') {
      return new Response(
        JSON.stringify({ error: 'Method not allowed' }),
        { 
          status: 405, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    const { email, phone_number, redirect_to }: LoginLinkRequest = await req.json();

    if (!email) {
      return new Response(
        JSON.stringify({ error: 'Email is required' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Create Supabase service role client
    const supabase = createSupabaseServiceRoleClient();

    // Generate magic link
    const { data, error } = await supabase.auth.admin.generateLink({
      type: 'magiclink',
      email: email,
      options: {
        redirectTo: redirect_to || 'https://app.chattalyst.com/dashboard'
      }
    });

    if (error) {
      console.error('Error generating magic link:', error);
      return new Response(
        JSON.stringify({ 
          error: 'Failed to generate magic link', 
          details: error.message 
        }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Generate a unique token for WhatsApp validation
    let validationToken = null;
    if (phone_number) {
      try {
        // Generate a unique token
        validationToken = crypto.randomUUID();
        
        const { error: logError } = await supabase
          .from('whatsapp_logins')
          .insert({
            phone_number: phone_number,
            token: validationToken,
            expires_at: new Date(Date.now() + 60 * 60 * 1000).toISOString(), // 1 hour from now
            created_at: new Date().toISOString()
          });

        if (logError) {
          console.error('Error logging WhatsApp login:', logError);
          // Don't fail the request if logging fails
          validationToken = null;
        }
      } catch (logErr) {
        console.error('Unexpected error logging WhatsApp login:', logErr);
        validationToken = null;
      }
    }

    const response: any = {
      success: true,
      magic_link: data.properties.action_link,
      email: email,
      expires_in: 3600 // 1 hour
    };
    
    // Include validation token if generated
    if (validationToken) {
      response.token = validationToken;
    }
    
    return new Response(
      JSON.stringify(response),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Unexpected error in generate-login-link:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error', 
        details: (error as Error).message 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});