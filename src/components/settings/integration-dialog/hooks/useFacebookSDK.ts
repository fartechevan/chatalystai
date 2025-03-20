
import { useEffect, useState } from "react";

// Define interface for the FB global object
interface FacebookSDK {
  init: (options: { appId: string; cookie: boolean; xfbml: boolean; version: string }) => void;
  login: (callback: (response: { authResponse?: { accessToken: string } }) => void) => void;
  api: (path: string, callback: (response: { name: string }) => void) => void;
  getAuthResponse: () => { accessToken: string };
}

// Extend Window interface without redeclaring FB
declare global {
  interface Window {
    fbAsyncInit: () => void;
    FB: FacebookSDK;
  }
}

export function useFacebookSDK() {
  const [isFBInitialized, setIsFBInitialized] = useState(false);

  useEffect(() => {
    // Load the Facebook SDK
    window.fbAsyncInit = function() {
      window.FB.init({
        appId      : 'your-app-id', // Replace with your Facebook app ID
        cookie     : true,
        xfbml      : true,
        version    : 'v12.0'
      });
      setIsFBInitialized(true);
    };

    (function(d, s, id){
      const fjs = d.getElementsByTagName(s)[0];
      if (d.getElementById(id)) {return;}
      const js = d.createElement(s) as HTMLScriptElement; js.id = id;
      js.src = "https://connect.facebook.net/en_US/sdk.js";
      fjs.parentNode?.insertBefore(js, fjs);
    }(document, 'script', 'facebook-jssdk'));
  }, []);

  const handleConnectWithFacebook = () => {
    if (isFBInitialized) {
      window.FB.login(function(response) {
        if (response.authResponse) {
          console.log('Welcome! Fetching your information.... ');
          window.FB.api('/me', function(response) {
            console.log('Good to see you, ' + response.name + '.');
            // Here you can handle the access token and link it to the WhatsApp system user
            const accessToken = window.FB.getAuthResponse().accessToken;
            console.log('Access Token:', accessToken);
            // Link the access token to the WhatsApp system user
          });
        } else {
          console.log('User cancelled login or did not fully authorize.');
        }
      });
    } else {
      console.log('Facebook SDK not initialized yet.');
    }
  };

  return { isFBInitialized, handleConnectWithFacebook };
}
