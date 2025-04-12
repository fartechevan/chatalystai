/**
 * Local storage utilities for WhatsApp instances
 */
import { WHATSAPP_INSTANCE } from "./config"; // Correct path now

/**
 * Get saved instance data from localStorage
 */
export function getSavedInstanceData() {
  try {
    const savedInstanceStr = localStorage.getItem(WHATSAPP_INSTANCE); // Use renamed constant
    // console.log('Raw saved instance from localStorage:', savedInstanceStr); // Removed log
    
    if (!savedInstanceStr) {
      return null;
    }
    
    const savedInstance = JSON.parse(savedInstanceStr);
    // console.log('Parsed saved instance:', savedInstance); // Removed log
    
    // Return the full parsed object
    return savedInstance; 
  } catch (e) {
    console.error('Error parsing saved instance:', e);
    return null;
  }
}
