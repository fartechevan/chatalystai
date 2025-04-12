import { useState, useEffect } from "react";

/**
 * Custom hook that tracks the state of a CSS media query.
 * @param query - The media query string to watch (e.g., "(min-width: 768px)").
 * @returns `true` if the media query matches, `false` otherwise.
 */
export const useMediaQuery = (query: string): boolean => {
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    // Ensure window is defined (for SSR compatibility, though less likely needed in Vite/React)
    if (typeof window === 'undefined') {
      return;
    }

    const media = window.matchMedia(query);
    
    // Update state if the initial match state is different
    if (media.matches !== matches) {
      setMatches(media.matches);
    }

    // Listener function to update state on change
    const listener = () => {
      setMatches(media.matches);
    };

    // Add listener
    // Using addEventListener for modern browsers, fall back to addListener for older ones
    if (media.addEventListener) {
      media.addEventListener("change", listener);
    } else {
      // Deprecated but necessary for some older browser compatibility
      media.addListener(listener); 
    }

    // Cleanup function to remove the listener
    return () => {
      if (media.removeEventListener) {
        media.removeEventListener("change", listener);
      } else {
        media.removeListener(listener);
      }
    };
  }, [matches, query]); // Re-run effect if query changes or initial matches state was wrong

  return matches;
};
