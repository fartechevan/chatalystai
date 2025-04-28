import { Auth } from "@supabase/auth-ui-react";
import { ThemeSupa } from "@supabase/auth-ui-shared";
import { supabase } from "@/integrations/supabase/client";
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

export const LoginForm = () => {
  const navigate = useNavigate();

  useEffect(() => {
    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        navigate("/dashboard");
      }
    };

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_IN" && session) {
        navigate("/dashboard");
      }
    });

    checkUser();

    return () => {
      subscription.unsubscribe();
    };
  }, [navigate]);

  return (
    <div 
      className="min-h-screen flex flex-col items-center justify-center bg-cover bg-center"
      style={{ backgroundImage: `url('https://vezdxxqzzcjkunoaxcxc.supabase.co/storage/v1/object/sign/fartech/Chatalyst_BG.png?token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1cmwiOiJmYXJ0ZWNoL0NoYXRhbHlzdF9CRy5wbmciLCJpYXQiOjE3NDU4MTk2NDIsImV4cCI6NDg2Nzg4MzY0Mn0.czUQsVuBqH4Ge7-ME48fiL1TBdC_racgRHDcE2zmd5k')` }}
    >
      <div className="w-full max-w-md px-8 py-12 rounded-xl bg-card/90 backdrop-blur-sm shadow-2xl animate-enter">
        <div className="flex flex-col items-center mb-8 space-y-4">
          <div className="w-12 h-12 rounded-xl bg-primary flex items-center justify-center animate-logo-spin">
            <svg 
              viewBox="0 0 24 24" 
              className="w-8 h-8 text-white"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
              <path d="M8 9h8" />
              <path d="M8 13h6" />
            </svg>
          </div>
          <div className="text-center">
            <h1 className="text-3xl font-bold tracking-tight mb-1">Chatalyst</h1>
            <p className="text-muted-foreground text-sm">Communicate smarter, respond faster</p>
          </div>
        </div>

        <Auth
          supabaseClient={supabase}
          appearance={{
            theme: ThemeSupa,
            variables: {
              default: {
                colors: {
                  brand: 'rgb(var(--primary))',
                  brandAccent: 'rgb(var(--primary))',
                  inputBackground: 'transparent',
                },
                borderWidths: {
                  buttonBorderWidth: '1px',
                  inputBorderWidth: '1px',
                },
                radii: {
                  borderRadiusButton: '0.5rem',
                  buttonBorderRadius: '0.5rem',
                  inputBorderRadius: '0.5rem',
                },
              },
            },
            style: {
              button: {
                border: '1px solid transparent',
                fontSize: '14px',
                padding: '8px 16px',
              },
              input: {
                fontSize: '14px',
                color: 'inherit',
                background: 'transparent',
                border: '1px solid hsl(var(--input))',
              },
              anchor: {
                color: 'rgb(var(--primary))',
                fontSize: '14px',
              },
              message: {
                fontSize: '14px',
              },
              container: {
                color: 'inherit',
              },
            },
          }}
          providers={[]}
          redirectTo={window.location.origin}
        />
      </div>
    </div>
  );
};
