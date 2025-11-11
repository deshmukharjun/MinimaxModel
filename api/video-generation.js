// Vercel serverless function for video generation
const app = require('../server.js');

module.exports = async (req, res) => {
  // Set the path to match Express route
  req.url = '/api/video-generation';
  req.path = '/api/video-generation';
  
  return app(req, res);
};

