// Vercel serverless function - handles all API routes
const app = require('../server.js');

module.exports = async (req, res) => {
  // Vercel routes all /api/* requests to this function
  // We need to preserve the original URL path
  
  // Get the original URL from various possible sources
  let originalPath = req.url || req.path;
  
  // If Vercel stripped /api, we need to reconstruct it
  // Check if the path already includes /api
  if (!originalPath.startsWith('/api')) {
    // Try to get from headers or query
    const xPath = req.headers['x-vercel-path'] || req.headers['x-path'];
    if (xPath) {
      originalPath = xPath;
    } else {
      // Reconstruct: Vercel sends /api/* to /api, so req.url might be the path after /api
      // We need to check the original request
      const originalUrl = req.headers['x-vercel-original-url'] || req.headers['x-original-url'];
      if (originalUrl) {
        // Extract path from full URL
        try {
          const url = new URL(originalUrl);
          originalPath = url.pathname;
        } catch {
          originalPath = '/api' + (originalPath.startsWith('/') ? originalPath : '/' + originalPath);
        }
      } else {
        // Last resort: reconstruct assuming /api was stripped
        originalPath = '/api' + (originalPath.startsWith('/') ? originalPath : '/' + originalPath);
      }
    }
  }
  
  // Update request for Express
  req.url = originalPath;
  req.path = originalPath;
  
  // Ensure method is preserved
  if (req.method) {
    req.method = req.method;
  }
  
  return app(req, res);
};
