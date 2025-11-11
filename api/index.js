// Vercel serverless function - exports the Express app as a handler
const app = require('../server.js');

// Export as Vercel serverless function handler
module.exports = (req, res) => {
  // Remove /api prefix from path for Express routing
  req.url = req.url.replace(/^\/api/, '') || '/';
  return app(req, res);
};
