// Vercel serverless function - handles all API routes
const app = require('../server.js');

module.exports = async (req, res) => {
  // Debug: Log what Vercel is sending
  console.log('=== Vercel Serverless Function Called ===');
  console.log('Method:', req.method);
  console.log('URL:', req.url);
  console.log('Path:', req.path);
  console.log('Query:', req.query);
  console.log('Headers:', {
    'x-vercel-path': req.headers['x-vercel-path'],
    'x-vercel-original-url': req.headers['x-vercel-original-url'],
    'x-original-url': req.headers['x-original-url'],
  });
  
  // Vercel routes all /api/* requests to this function
  // The rewrite sends /api/* to /api, so we need to reconstruct the full path
  let originalPath = req.url || req.path || '/';
  
  // Try to get the original path from Vercel headers
  const vercelPath = req.headers['x-vercel-path'] || req.headers['x-path'];
  if (vercelPath) {
    originalPath = vercelPath;
  } else {
    // If no header, check if path already has /api
    if (!originalPath.startsWith('/api')) {
      // Reconstruct: assume /api was stripped by the rewrite
      originalPath = '/api' + (originalPath.startsWith('/') ? originalPath : '/' + originalPath);
    }
  }
  
  console.log('Reconstructed path:', originalPath);
  
  // Update request for Express
  req.url = originalPath;
  req.path = originalPath;
  
  // Call Express app
  return app(req, res);
};
