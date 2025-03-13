import { createRoot } from 'react-dom/client'
import App from './App.tsx'
window.fbAsyncInit = function() {
  FB.init({
    appId      : 'YOUR_APP_ID', // Replace with your app id
    cookie     : true,
    xfbml      : true,
    version    : 'v19.0'
  });

};

(function(d, s, id){
   let js, fjs = d.getElementsByTagName(s)[0];
   if (d.getElementById(id)) {return;}
   js = d.createElement(s); js.id = id;
   js.src = "https://connect.facebook.net/en_US/sdk.js";
   fjs.parentNode.insertBefore(js, fjs);
 }(document, 'script', 'facebook-jssdk'));

import './index.css'

createRoot(document.getElementById("root")!).render(<App />);
