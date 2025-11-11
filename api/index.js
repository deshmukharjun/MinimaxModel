// Vercel serverless function - handles all API routes
const app = require('../server.js');

module.exports = async (req, res) => {
  // Vercel routes all /api/* requests to this function
  // The original URL path is preserved in req.url
  // We need to ensure Express sees the full path including /api
  
  // Get the original path from the request
  const originalUrl = req.url || req.path || '/';
  
  // Vercel might strip /api, so check if we need to add it back
  // The rewrite sends /api/* to /api, so req.url might be just the path after /api
  // We need to reconstruct the full path
  let fullPath = originalUrl;
  
  // If the path doesn't start with /api, it means Vercel stripped it
  // We need to get it from the original request
  if (!fullPath.startsWith('/api')) {
    // Try to get from query or reconstruct
    // Vercel passes the original path in different ways
    const queryPath = req.query.path || req.query.url;
    if (queryPath) {
      fullPath = queryPath.startsWith('/') ? queryPath : '/' + queryPath;
    } else {
      // Reconstruct from the original URL
      fullPath = '/api' + (originalUrl.startsWith('/') ? originalUrl : '/' + originalUrl);
    }
  }
  
  // Update the request URL and path for Express
  req.url = fullPath;
  req.path = fullPath;
  
  // Also preserve the original method
  req.method = req.method || 'GET';
  
  return app(req, res);
};
