import React from 'react';

interface WhatsAppLoginButtonProps {
  phoneNumber: string;
  prefillText: string;
}

export const WhatsAppLoginButton: React.FC<WhatsAppLoginButtonProps> = ({ phoneNumber, prefillText }) => {
  const whatsappUrl = `https://wa.me/${phoneNumber}?text=${encodeURIComponent(prefillText)}`;

  const handleClick = () => {
    window.open(whatsappUrl, '_blank');
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      className="w-full flex justify-center py-2 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-green-500 hover:bg-green-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
    >
      Login with WhatsApp
    </button>
  );
};
