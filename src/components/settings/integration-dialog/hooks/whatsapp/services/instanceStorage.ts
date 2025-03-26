
/**
 * Local storage utilities for WhatsApp instances
 */

/**
 * Get saved instance data from localStorage
 */
export function getSavedInstanceData() {
  try {
    const savedInstanceStr = localStorage.getItem('whatsapp_instance');
    console.log('Raw saved instance from localStorage:', savedInstanceStr);
    
    if (!savedInstanceStr) {
      return null;
    }
    
    const savedInstance = JSON.parse(savedInstanceStr);
    console.log('Parsed saved instance:', savedInstance);
    
    return {
      id: savedInstance.id,
      token: savedInstance.token
    };
  } catch (e) {
    console.error('Error parsing saved instance:', e);
    return null;
  }
}
