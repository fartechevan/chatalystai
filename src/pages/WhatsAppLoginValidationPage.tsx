import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';

export const WhatsAppLoginValidationPage: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [message, setMessage] = useState('Validating your login...');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const validateLogin = async () => {
      const params = new URLSearchParams(location.search);
      const token = params.get('token');

      if (!token) {
        setError('No login token found in URL.');
        setMessage('Login failed.');
        console.error('WhatsAppLoginValidationPage: No token found in URL parameters.');
        return;
      }

      console.log('WhatsAppLoginValidationPage: Attempting to validate token:', token);

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
        } else {
          setError('An unexpected error occurred during validation.');
        }
        setMessage('Login failed.');
      }
    };

    validateLogin();
  }, [location.search, navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="bg-white p-8 rounded-lg shadow-md text-center">
        <h1 className="text-2xl font-bold mb-4">WhatsApp Login</h1>
        {error ? (
          <p className="text-red-500">{error}</p>
        ) : (
          <p className="text-gray-700">{message}</p>
        )}
        {!error && (
          <div className="mt-4">
            <svg className="animate-spin h-8 w-8 text-blue-500 mx-auto" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
          </div>
        )}
      </div>
    </div>
  );
};
