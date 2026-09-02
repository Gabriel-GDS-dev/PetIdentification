/**
 * Vercel Web Analytics Integration
 * Initializes analytics tracking for the application
 * 
 * Note: For static deployments, we use the CDN script injection method
 * as recommended by Vercel for non-bundled applications.
 * The @vercel/analytics package is installed for type definitions and
 * compatibility with Vercel's build system.
 */

// Initialize Vercel Analytics using the CDN script
// This approach is recommended for static HTML/JavaScript applications
// that don't use a bundler
(function initAnalytics() {
  // Check if the script is already loaded
  if (window.vai || document.querySelector('script[src*="va.vercel-scripts.com"]')) {
    return;
  }

  const script = document.createElement('script');
  script.defer = true;
  script.src = 'https://va.vercel-scripts.com/v1/script.js';
  script.setAttribute('data-analytics', 'true');
  
  // Add error handling
  script.onerror = function() {
    console.warn('Failed to load Vercel Analytics script');
  };
  
  document.head.appendChild(script);
})();
