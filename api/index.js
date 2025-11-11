// Vercel serverless function - handles all API routes
const app = require('../server.js');

module.exports = async (req, res) => {
  // Vercel routes /api/* to this function
  // The path might have /api stripped, so we need to add it back if missing
  const originalPath = req.url || req.path || '/';
  
  // If path doesn't start with /api, add it back
  if (!originalPath.startsWith('/api')) {
    req.url = '/api' + (originalPath.startsWith('/') ? originalPath : '/' + originalPath);
    req.path = '/api' + (originalPath.startsWith('/') ? originalPath : '/' + originalPath);
  }
  
  return app(req, res);
};
