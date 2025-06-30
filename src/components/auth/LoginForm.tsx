import { Auth } from "@supabase/auth-ui-react";
import { ThemeSupa } from "@supabase/auth-ui-shared";
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useState, FormEvent } from "react";
import { useNavigate } from "react-router-dom";

interface LicenseDetails {
  license_type?: string;
  expires_at?: string;
  [key: string]: unknown;
}

type AuthView = "signIn" | "signUp" | "forgotPassword";

export const LoginForm = () => {
  const navigate = useNavigate();
  const [authView, setAuthView] = useState<AuthView>("signIn");
  
  // States for custom signup form
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [licenseKey, setLicenseKey] = useState("");
  const [signupError, setSignupError] = useState<string | null>(null);
  const [signupMessage, setSignupMessage] = useState<string | null>(null);
  const [isLoadingSignup, setIsLoadingSignup] = useState(false);

  // State for login/general auth errors
  const [authError, setAuthError] = useState<string | null>(null);

    useEffect(() => {
        const checkSessionAndLicense = async () => {
            const { data: { session }, error: sessionError } = await supabase.auth.getSession();
            if (sessionError) {
                console.error("Error getting session:", sessionError);
                if (sessionError.message.includes("Invalid Refresh Token")) {
                    await supabase.auth.signOut();
                }
                return;
            }
            if (session?.user) {
                const userMetaData = session.user.user_metadata;
                // License check removed as per new requirement
                console.log("User signed in, navigating to dashboard (license check skipped here). User:", session.user.id);
                navigate("/dashboard");
            }
        };

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      setAuthError(null);
      if (event === "SIGNED_IN" && session?.user) {
        // License check removed as per new requirement
        console.log("User signed in via onAuthStateChange, navigating to dashboard (license check skipped here). User:", session.user.id);
        navigate("/dashboard");
      } else if (event === "SIGNED_OUT") {
        setAuthView("signIn");
        navigate("/login");
      }
    });

    // Only check session if not on a signup view to prevent premature redirection
    if (authView === 'signIn') {
        checkSessionAndLicense();
    }

    return () => {
      subscription?.unsubscribe();
    };
  }, [navigate, authView]);

  const handleLicensedSignup = async (e: FormEvent) => {
    e.preventDefault();
    setSignupError(null);
    setSignupMessage(null);
    setIsLoadingSignup(true);

    if (!email || !password || !licenseKey) {
      setSignupError("Email, password, and license key are required.");
      setIsLoadingSignup(false);
      return;
    }

    try {
      const { data, error: invokeError } = await supabase.functions.invoke("licensed-signup", {
        body: { email, password, licenseKey },
      });

      if (invokeError) throw invokeError;
      if (data?.error) throw new Error(data.error);
      
      setSignupMessage("Signup successful! Please check your email to confirm your account, then you can log in.");
      setEmail("");
      setPassword("");
      setLicenseKey("");
      // setTimeout(() => setAuthView("signIn"), 3000); // Optionally switch to sign-in view
    } catch (err) {
      console.error("Signup error:", err);
      if (err instanceof Error) {
        setSignupError(err.message);
      } else {
        setSignupError("An unexpected error occurred during signup.");
      }
    } finally {
      setIsLoadingSignup(false);
    }
  };
  
  const commonUiWrapper = (content: JSX.Element, currentViewTitle: string) => (
     <div 
      className="min-h-screen flex flex-col items-center justify-center bg-cover bg-center"
      style={{
        backgroundImage: `url('${
          supabase.storage.from('assets').getPublicUrl('bg_chattalyst.png').data
            .publicUrl
        }')`,
      }}
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
            <h1 className="text-3xl font-bold tracking-tight mb-1">{currentViewTitle}</h1>
            <p className="text-muted-foreground text-sm">Communicate smarter, respond faster</p>
          </div>
        </div>
        {content}
        <div className="mt-8 text-center text-sm text-muted-foreground space-y-2">
          {authView === 'signIn' && (
            <>
              <p>
                Don't have an account?{' '}
                <button 
                    onClick={() => setAuthView('signUp')} 
                    className="font-bold text-primary hover:text-primary/80 focus:outline-none"
                >
                    Create account with license
                </button>
              </p>
              <p>
                <button 
                    onClick={() => setAuthView('forgotPassword')} 
                    className="font-bold text-primary hover:text-primary/80 focus:outline-none"
                >
                    Forgot your password?
                </button>
              </p>
            </>
          )}
          {authView === 'signUp' && (
            <p>
              Already have an account?{' '}
              <button 
                  onClick={() => setAuthView('signIn')} 
                  className="font-bold text-primary hover:text-primary/80 focus:outline-none"
              >
                  Sign In
              </button>
            </p>
          )}
          {authView === 'forgotPassword' && (
            <p>
              Remembered your password?{' '}
              <button 
                  onClick={() => setAuthView('signIn')} 
                  className="font-bold text-primary hover:text-primary/80 focus:outline-none"
              >
                  Sign In
              </button>
            </p>
          )}
        </div>
      </div>
    </div>
  );

  if (authView === "signUp") {
    return commonUiWrapper(
      <>
        {signupMessage && <div className="mb-4 p-3 rounded-md bg-green-100 text-green-700 text-sm">{signupMessage}</div>}
        {signupError && <div className="mb-4 p-3 rounded-md bg-red-100 text-red-700 text-sm">{signupError}</div>}
        <form onSubmit={handleLicensedSignup} className="space-y-6">
          <div>
            <label htmlFor="email-signup" className="block text-sm font-medium text-foreground">Email address</label>
            <input id="email-signup" name="email" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)}
              className="mt-1 block w-full px-3 py-2 border border-input rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary sm:text-sm bg-transparent" />
          </div>
          <div>
            <label htmlFor="password-signup" className="block text-sm font-medium text-foreground">Password</label>
            <input id="password-signup" name="password" type="password" autoComplete="new-password" required value={password} onChange={(e) => setPassword(e.target.value)}
              className="mt-1 block w-full px-3 py-2 border border-input rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary sm:text-sm bg-transparent" />
          </div>
          <div>
            <label htmlFor="licenseKey-signup" className="block text-sm font-medium text-foreground">License Key</label>
            <input id="licenseKey-signup" name="licenseKey" type="text" required value={licenseKey} onChange={(e) => setLicenseKey(e.target.value)}
              className="mt-1 block w-full px-3 py-2 border border-input rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary sm:text-sm bg-transparent" />
          </div>
          <div>
            <button 
              type="submit" 
              disabled={isLoadingSignup}
              className="w-full flex justify-center py-2 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium bg-primary hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary disabled:opacity-50"
              style={{
                // backgroundColor removed to rely on bg-primary class
                color: 'white'
              }}
            >
              {isLoadingSignup ? "Creating Account..." : "Create Account"}
            </button>
          </div>
        </form>
      </>,
      "Create Account"
    );
  }

  // Default to signIn or forgotPassword view
  return commonUiWrapper(
    <>
      <Auth
        supabaseClient={supabase}
        showLinks={false} // We manage all links manually now
        appearance={{
          theme: ThemeSupa,
          variables: {
            default: {
              colors: { brand: 'hsl(var(--primary))', brandAccent: 'hsl(var(--primary))', brandButtonText: 'hsl(0, 0%, 98%)', inputBackground: 'transparent' },
              borderWidths: { buttonBorderWidth: '1px', inputBorderWidth: '1px' },
              radii: { borderRadiusButton: '0.5rem', buttonBorderRadius: '0.5rem', inputBorderRadius: '0.5rem' },
            },
          },
          style: {
            button: { 
              border: '1px solid transparent', 
              fontSize: '14px', 
              padding: '8px 16px',
              // fontWeight: 'bold', // Reverted: Main buttons should not be bold by default via theme
              // Ensure text color matches the custom button by using --primary-foreground
              color: 'hsl(var(--primary-foreground))', 
              // Background is already set by variables.default.colors.brand to rgb(var(--primary))
            },
            input: { fontSize: '14px', color: 'inherit', background: 'transparent', border: '1px solid hsl(var(--input))' },
            anchor: { color: 'hsl(var(--primary))', fontSize: '14px' },
            message: { fontSize: '14px' },
            container: { color: 'inherit' },
          },
        }}
        providers={[]}
        redirectTo={`${window.location.origin}/dashboard`} // Ensure redirect goes to dashboard
        view={authView === "forgotPassword" ? "forgotten_password" : "sign_in"}
        localization={{
          variables: {
            sign_in: { email_label: 'Email address', password_label: 'Password', button_label: 'Sign in', social_provider_text: 'Sign in with {{provider}}', link_text: "Forgot your password?" },
            forgotten_password: { email_label: 'Email address', password_label: 'Password', button_label: 'Send reset instructions', link_text: "Remembered your password? Sign in" },
          }
        }}
      />
      {authError && <p className="mt-4 text-center text-sm text-red-600">{authError}</p>}
    </>,
    authView === "forgotPassword" ? "Reset Password" : "Chattalyst Login"
  );
};
