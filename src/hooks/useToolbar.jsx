import { useState, useEffect, useRef } from 'react';

export const useToolbar = () => {
  const [showToolbar, setShowToolbar] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);
  const timeoutRef = useRef(null);

  const controlToolbar = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    timeoutRef.current = setTimeout(() => {
      if (typeof window !== 'undefined') {
        if (window.scrollY > lastScrollY) {
          // if scroll down hide the toolbar
          setShowToolbar(false);
        } else {
          // if scroll up show the toolbar
          setShowToolbar(true);
        }
        // remember current page location to use in the next move
        setLastScrollY(window.scrollY);
      }
    }, 100); // 100ms debounce delay
  };

  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.addEventListener('scroll', controlToolbar);

      // cleanup function
      return () => {
        window.removeEventListener('scroll', controlToolbar);
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
        }
      };
    }
  }, [lastScrollY]);

  return { showToolbar };
};
