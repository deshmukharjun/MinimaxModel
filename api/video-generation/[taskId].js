// Vercel serverless function for video generation status check
const app = require('../../server.js');

module.exports = async (req, res) => {
  // Get taskId from the path
  const taskId = req.query.taskId || req.url.split('/').pop();
  
  // Set the path to match Express route
  req.url = `/api/video-generation/${taskId}`;
  req.path = `/api/video-generation/${taskId}`;
  
  return app(req, res);
};

