import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from '@/components/ui/label';

const ConfirmInvitePage: React.FC = () => {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    // Check if the user is already fully authenticated and perhaps redirect
    // For invite flow, user is usually in a session that needs password update.
    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        // If no user session, they might not have come from a valid invite link
        // or the session expired.
        toast({
          title: 'Error',
          description: 'Invalid session. Please ensure you have clicked a valid invitation link.',
          variant: 'destructive',
        });
        navigate('/login'); // Redirect to login or an error page
      } else {
        // Check if user needs to set a password (common after invite)
        // Supabase doesn't explicitly flag this, but if they landed here, they likely do.
        setMessage(`Welcome! Please set your password to complete your account setup for ${session.user.email}.`);
      }
    };
    checkUser();
  }, [navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setMessage(null);

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    if (password.length < 6) { // Example: Enforce minimum password length
      setError('Password must be at least 6 characters long.');
      return;
    }

    setLoading(true);
    try {
      const { error: updateError } = await supabase.auth.updateUser({ password });
      if (updateError) {
        throw updateError;
      }
      toast({
        title: 'Success!',
        description: 'Your password has been set. You will be redirected to the dashboard.',
      });
      // Redirect to dashboard or login page after a short delay
      setTimeout(() => {
        navigate('/dashboard'); // Or your desired post-login page
      }, 2000);
    } catch (err: unknown) {
      console.error('Error updating password:', err);
      let errorMessage = 'Failed to update password.';
      if (err instanceof Error) {
        errorMessage = err.message;
      } else if (typeof err === 'object' && err !== null && 'message' in err && typeof (err as {message?: unknown}).message === 'string') {
        errorMessage = (err as {message: string}).message;
      }
      setError(errorMessage);
      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-2xl">Set Your Password</CardTitle>
          <CardDescription>
            {message || 'Complete your account setup by creating a password.'}
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="password">New Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                placeholder="••••••••"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm New Password</Label>
              <Input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                placeholder="••••••••"
              />
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
          </CardContent>
          <CardFooter>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Setting Password...' : 'Set Password & Log In'}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
};

export default ConfirmInvitePage;
