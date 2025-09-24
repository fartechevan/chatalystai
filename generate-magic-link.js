import { createClient } from '@supabase/supabase-js';

// Supabase credentials from .env file
const SUPABASE_URL = 'https://yrnbbkljrdwoyqjpswtv.supabase.co';

// ❌ IMPORTANT: The key below is the ANON key, not the SERVICE ROLE key!
// You need to get the SERVICE ROLE key from Supabase Dashboard
// Go to: Project Settings > API > Project API keys > service_role secret
// The service role key should start with 'eyJ...' and have role: 'service_role' in the JWT payload
const SUPABASE_SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlybmJia2xqcmR3b3lxanBzd3R2Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MDkyNzM1MiwiZXhwIjoyMDY2NTAzMzUyfQ.a_iEokr3vnoOKcK0Yhpshf-tPQ6mcsGIPKC3_iQIeDs'; // Replace with actual service role key

// Email to generate magic link for
const EMAIL = 'imexlight@gmail.com';

async function generateMagicLink() {
  try {
    // Create Supabase client with service role key
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

    // Generate magic link
    const { data, error } = await supabase.auth.admin.generateLink({
      type: 'magiclink',
      email: EMAIL,
      options: {
        redirectTo: 'https://app.chattalyst.com/dashboard' // or your preferred redirect URL
      }
    });

    if (error) {
      console.error('Error generating magic link:', error);
      return;
    }

    console.log('\n🎉 Magic Link Generated Successfully!');
    console.log('📧 Email:', EMAIL);
    console.log('🔗 Magic Link:', data.properties.action_link);
    console.log('\n📋 You can copy and use this link to login to Supabase.');
    console.log('⚠️  Note: This link will expire in 1 hour.');
    
  } catch (err) {
    console.error('Unexpected error:', err);
  }
}

// Check if service role key is set
if (SUPABASE_SERVICE_ROLE_KEY === 'YOUR_SERVICE_ROLE_KEY_HERE') {
  console.log('❌ Please update the SUPABASE_SERVICE_ROLE_KEY in this script.');
  console.log('\n📝 To get your service role key:');
  console.log('1. Go to https://supabase.com/dashboard/project/yrnbbkljrdwoyqjpswtv');
  console.log('2. Navigate to Settings > API');
  console.log('3. Copy the "service_role" secret key');
  console.log('4. Replace YOUR_SERVICE_ROLE_KEY_HERE in this script');
  console.log('5. Run: node generate-magic-link.js');
} else {
  generateMagicLink();
}