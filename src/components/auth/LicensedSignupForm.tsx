import { useState, FormEvent } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client"; // Assuming supabase client is here

export const LicensedSignupForm = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [licenseKey, setLicenseKey] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setMessage(null);
    setIsLoading(true);

    if (!email || !password || !licenseKey) {
      setError("Email, password, and license key are required.");
      setIsLoading(false);
      return;
    }

    try {
      const { data, error: invokeError } = await supabase.functions.invoke("licensed-signup", {
        body: { email, password, licenseKey },
      });

      if (invokeError) {
        throw invokeError;
      }

      if (data?.error) {
        throw new Error(data.error);
      }
      
      setMessage("Signup successful! Please check your email to confirm your account, then you can log in.");
      // Optionally, attempt to sign in the user here if the function returns a session
      // or redirect to login page after a delay.
      // For now, just show a message.
      // Example: navigate("/login"); after user creation and email confirmation.

    } catch (err) {
      console.error("Signup error:", err);
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("An unexpected error occurred during signup.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
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
            <h1 className="text-3xl font-bold tracking-tight mb-1">Create Account</h1>
            <p className="text-muted-foreground text-sm">Join Chattalyst with your license</p>
          </div>
        </div>

        {message && <div className="mb-4 p-3 rounded-md bg-green-100 text-green-700 text-sm">{message}</div>}
        {error && <div className="mb-4 p-3 rounded-md bg-red-100 text-red-700 text-sm">{error}</div>}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-foreground">Email address</label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 block w-full px-3 py-2 border border-input rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary sm:text-sm bg-transparent"
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-foreground">Password</label>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="new-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1 block w-full px-3 py-2 border border-input rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary sm:text-sm bg-transparent"
            />
          </div>

          <div>
            <label htmlFor="licenseKey" className="block text-sm font-medium text-foreground">License Key</label>
            <input
              id="licenseKey"
              name="licenseKey"
              type="text"
              required
              value={licenseKey}
              onChange={(e) => setLicenseKey(e.target.value)}
              className="mt-1 block w-full px-3 py-2 border border-input rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary sm:text-sm bg-transparent"
            />
          </div>

          <div>
            <button
              type="submit"
              disabled={isLoading}
              className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-primary-foreground bg-primary hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary disabled:opacity-50"
            >
              {isLoading ? "Creating Account..." : "Create Account"}
            </button>
          </div>
        </form>
        <p className="mt-8 text-center text-sm text-muted-foreground">
          Already have an account?{' '}
          <Link to="/login" className="font-medium text-primary hover:text-primary/80">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
};
