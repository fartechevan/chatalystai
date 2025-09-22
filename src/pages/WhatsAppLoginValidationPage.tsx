import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';

export const WhatsAppLoginValidationPage: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [message, setMessage] = useState('Validating your login...');
  const [debugInfo, setDebugInfo] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isUserNotFound, setIsUserNotFound] = useState(false);

  useEffect(() => {
    const validateLogin = async () => {
      const params = new URLSearchParams(location.search);
      const token = params.get('token');
      
      setDebugInfo(`URL: ${window.location.href}\nToken: ${token || 'NOT FOUND'}`);

      if (!token) {
        setError('No login token found in URL.');
        setMessage('Login failed.');
        console.error('WhatsAppLoginValidationPage: No token found in URL parameters.');
        return;
      }

      console.log('WhatsAppLoginValidationPage: Attempting to validate token:', token);
      console.log('WhatsAppLoginValidationPage: Current URL:', window.location.href);
      setMessage('Token found, validating...');

      try {
        const { data, error: invokeError } = await supabase.functions.invoke('validate-whatsapp-login', {
          body: { token: token }, // Ensure token is explicitly passed in the body
        });

        if (invokeError) throw invokeError;
        if (data?.error) throw new Error(data.error);

        // The function returns a magic_link for authentication
        if (data?.magic_link) {
          setMessage('Login successful! Redirecting to complete authentication...');
          // Redirect to the magic link to complete the authentication process
          window.location.href = data.magic_link;
        } else {
          setError('Validation failed: No magic link returned.');
          setMessage('Login failed.');
        }
      } catch (err) {
        console.error('WhatsApp login validation error:', err);
        if (err instanceof Error) {
          setError(err.message);
          // Check if it's a user not found error
          if (err.message.includes('User not found') || err.message.includes('No user found')) {
            setIsUserNotFound(true);
          }
        } else {
          setError('An unexpected error occurred during validation.');
        }
        setMessage('Login failed.');
      }
    };

    validateLogin();
  }, [location.search, navigate]);

  const handleGoBackToLogin = () => {
    navigate('/');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="bg-white p-8 rounded-lg shadow-md text-center max-w-md">
        <h1 className="text-2xl font-bold mb-4">WhatsApp Login</h1>
        {debugInfo && (
          <div className="mb-4 p-2 bg-gray-100 text-xs text-left whitespace-pre-wrap">
            <strong>Debug Info:</strong>\n{debugInfo}
          </div>
        )}
        
        {isUserNotFound ? (
          <div className="text-center">
            <div className="mb-4">
              <svg className="mx-auto h-16 w-16 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.314 18.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Account Not Found</h2>
            <p className="text-gray-600 mb-6">
              We couldn't find an account associated with this phone number. Please make sure you have registered an account with Chattalyst first.
            </p>
            <button
              onClick={handleGoBackToLogin}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg transition duration-200"
            >
              Go Back to Login
            </button>
          </div>
        ) : error ? (
          <div className="text-center">
            <div className="mb-4">
              <svg className="mx-auto h-16 w-16 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Login Failed</h2>
            <p className="text-red-500 mb-6">{error}</p>
            <button
              onClick={handleGoBackToLogin}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg transition duration-200"
            >
              Go Back to Login
            </button>
          </div>
        ) : (
          <div className="text-center">
            <p className="text-gray-700 mb-4">{message}</p>
            <div className="mt-4">
              <svg className="animate-spin h-8 w-8 text-blue-500 mx-auto" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
