const express = require('express');
const cors = require('cors');
const axios = require('axios');
const path = require('path');
const fs = require('fs').promises;
const fsSync = require('fs');
require('dotenv').config();

// Import Firebase Storage utility (optional - only if Firebase is configured)
let firebaseStorage = null;
try {
  firebaseStorage = require('./utils/firebaseStorage');
} catch (error) {
  log('Firebase Storage not configured, using local storage');
}

const app = express();
const PORT = process.env.PORT || 3000;

// Logging helper function
const log = (message, data = null) => {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] ${message}`);
  if (data) {
    console.log(JSON.stringify(data, null, 2));
  }
};

// In-memory storage for task statuses (in production, use a database)
const taskStatuses = new Map();

// Create videos directory if it doesn't exist (skip on Vercel - use /tmp instead)
const VIDEOS_DIR = process.env.VERCEL === '1' 
  ? path.join('/tmp', 'videos')
  : path.join(__dirname, 'videos');
if (!fsSync.existsSync(VIDEOS_DIR)) {
  try {
    fsSync.mkdirSync(VIDEOS_DIR, { recursive: true });
    log('Created videos directory:', VIDEOS_DIR);
  } catch (error) {
    log('Warning: Could not create videos directory:', error.message);
  }
}

// Check environment variables on startup
log('=== Server Starting ===');
log('Environment check:');
log(`  PORT: ${PORT}`);
log(`  MINIMAX_API_KEY: ${process.env.MINIMAX_API_KEY ? 'SET (' + process.env.MINIMAX_API_KEY.substring(0, 10) + '...)' : 'NOT SET - ERROR!'}`);

if (!process.env.MINIMAX_API_KEY) {
  console.error('ERROR: MINIMAX_API_KEY is not set in .env file!');
}

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' })); // Increase limit for base64 images
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Request logging middleware
app.use((req, res, next) => {
  log(`Incoming ${req.method} request: ${req.path}`);
  if (req.body && Object.keys(req.body).length > 0) {
    const bodyCopy = { ...req.body };
    // Truncate large image data for logging
    if (bodyCopy.first_frame_image) {
      const imgData = bodyCopy.first_frame_image;
      if (imgData.length > 100) {
        bodyCopy.first_frame_image = imgData.substring(0, 50) + '...[' + (imgData.length - 50) + ' more chars]';
      }
    }
    log('Request body:', bodyCopy);
  }
  next();
});

// API endpoint to create video generation task
app.post('/api/video-generation', async (req, res) => {
  log('=== Video Generation Request Started ===');
  try {
    const {
      mode, // 'text-to-video', 'image-to-video', 'first-last-frame', 'subject-reference'
      model,
      first_frame_image,
      last_frame_image,
      subject_reference,
      prompt,
      prompt_optimizer,
      fast_pretreatment,
      duration,
      resolution,
      callback_url
    } = req.body;

    log('Extracted request parameters:');
    log(`  mode: ${mode || 'image-to-video (default)'}`);
    log(`  model: ${model}`);
    log(`  first_frame_image: ${first_frame_image ? (first_frame_image.substring(0, 50) + '...[' + (first_frame_image.length - 50) + ' chars]') : 'MISSING'}`);
    log(`  last_frame_image: ${last_frame_image ? (last_frame_image.substring(0, 50) + '...[' + (last_frame_image.length - 50) + ' chars]') : 'not provided'}`);
    log(`  subject_reference: ${subject_reference ? JSON.stringify(subject_reference).substring(0, 100) + '...' : 'not provided'}`);
    log(`  prompt: ${prompt ? prompt.substring(0, 100) + (prompt.length > 100 ? '...' : '') : 'not provided'}`);
    log(`  prompt_optimizer: ${prompt_optimizer}`);
    log(`  fast_pretreatment: ${fast_pretreatment}`);
    log(`  duration: ${duration}`);
    log(`  resolution: ${resolution}`);
    log(`  callback_url: ${callback_url || 'not provided'}`);

    // Validate required fields based on mode
    const videoMode = mode || 'image-to-video'; // Default to image-to-video for backward compatibility
    
    if (!model) {
      return res.status(400).json({
        error: 'Missing required field: model is required'
      });
    }

    // Mode-specific validation
    if (videoMode === 'text-to-video') {
      // Only model and prompt are required
      if (!prompt) {
        return res.status(400).json({
          error: 'Missing required field: prompt is required for text-to-video mode'
        });
      }
    } else if (videoMode === 'image-to-video') {
      if (!first_frame_image) {
        return res.status(400).json({
          error: 'Missing required field: first_frame_image is required for image-to-video mode'
        });
      }
    } else if (videoMode === 'first-last-frame') {
      if (!first_frame_image || !last_frame_image) {
        return res.status(400).json({
          error: 'Missing required fields: first_frame_image and last_frame_image are required for first-last-frame mode'
        });
      }
    } else if (videoMode === 'subject-reference') {
      if (!subject_reference || !Array.isArray(subject_reference) || subject_reference.length === 0) {
        return res.status(400).json({
          error: 'Missing required field: subject_reference array is required for subject-reference mode'
        });
      }
    }

    log('Validation passed');

    // Prepare request payload based on mode
    const payload = {
      model,
      ...(prompt && { prompt }),
      ...(prompt_optimizer !== undefined && { prompt_optimizer }),
      ...(fast_pretreatment !== undefined && { fast_pretreatment }),
      ...(duration && { duration }),
      ...(resolution && { resolution }),
      ...(callback_url && { callback_url })
    };

    // Add mode-specific fields
    if (videoMode === 'image-to-video' || videoMode === 'first-last-frame') {
      payload.first_frame_image = first_frame_image;
    }
    
    if (videoMode === 'first-last-frame') {
      payload.last_frame_image = last_frame_image;
    }
    
    if (videoMode === 'subject-reference') {
      payload.subject_reference = subject_reference;
    }

    log('Prepared payload for Minimax API:');
    const payloadLog = { ...payload };
    if (payloadLog.first_frame_image) {
      payloadLog.first_frame_image = payloadLog.first_frame_image.substring(0, 50) + '...[' + (payloadLog.first_frame_image.length - 50) + ' chars]';
    }
    log('Payload:', payloadLog);

    log('Making request to Minimax API...');
    log(`  URL: https://api.minimax.io/v1/video_generation`);
    log(`  API Key present: ${!!process.env.MINIMAX_API_KEY}`);
    log(`  API Key prefix: ${process.env.MINIMAX_API_KEY ? process.env.MINIMAX_API_KEY.substring(0, 10) + '...' : 'MISSING'}`);

    // Make request to Minimax API
    const response = await axios.post(
      'https://api.minimax.io/v1/video_generation',
      payload,
      {
        headers: {
          'Authorization': `Bearer ${process.env.MINIMAX_API_KEY}`,
          'Content-Type': 'application/json'
        }
      }
    );

    log('Minimax API Response received:');
    log('Response status:', response.status);
    log('Response data:', response.data);

    if (response.data.base_resp) {
      log(`  Status code: ${response.data.base_resp.status_code}`);
      log(`  Status message: ${response.data.base_resp.status_msg}`);
      
      // Check if API returned an error (status_code !== 0 means error)
      if (response.data.base_resp.status_code !== 0) {
        log('=== API Error Detected (non-zero status_code) ===');
        log(`  Error code: ${response.data.base_resp.status_code}`);
        log(`  Error message: ${response.data.base_resp.status_msg}`);
        
        return res.status(400).json({
          error: response.data.base_resp.status_msg || 'API request failed',
          status_code: response.data.base_resp.status_code,
          base_resp: response.data.base_resp
        });
      }
    }

    if (response.data.task_id) {
      log(`  Task ID: ${response.data.task_id}`);
      // Initialize task status in memory
      taskStatuses.set(response.data.task_id, {
        status: 'processing',
        task_id: response.data.task_id,
        mode: videoMode,
        created_at: new Date().toISOString()
      });
    } else {
      log('WARNING: No task_id in response');
    }

    log('=== Video Generation Request Completed Successfully ===');
    res.json(response.data);
  } catch (error) {
    log('=== ERROR in Video Generation Request ===');
    log('Error type:', error.constructor.name);
    log('Error message:', error.message);
    
    if (error.response) {
      log('Error response status:', error.response.status);
      log('Error response headers:', error.response.headers);
      log('Error response data:', error.response.data);
    } else if (error.request) {
      log('Error: No response received from Minimax API');
      log('Request config:', {
        url: error.config?.url,
        method: error.config?.method,
        headers: error.config?.headers ? Object.keys(error.config.headers) : 'none'
      });
    } else {
      log('Error setting up request:', error.message);
    }

    log('Full error stack:', error.stack);

    const errorResponse = {
      error: error.response?.data?.base_resp?.status_msg || error.message || 'Failed to create video generation task',
      status_code: error.response?.data?.base_resp?.status_code || error.response?.status || 500
    };

    log('Sending error response:', errorResponse);
    res.status(error.response?.status || 500).json(errorResponse);
  }
});

// Callback endpoint for Minimax to send status updates
app.post('/api/video-generation/callback', async (req, res) => {
  log('=== Callback Received from Minimax ===');
  log('Callback data:', req.body);
  
  try {
    const { challenge, task_id, status, file_id, file_url, base_resp } = req.body;

    // Handle challenge validation (for callback URL setup)
    if (challenge !== undefined) {
      log('Challenge validation request received');
      log(`  Challenge: ${challenge}`);
      return res.json({ challenge });
    }

    // Handle status update
    if (task_id) {
      log(`Updating status for task: ${task_id}`);
      log(`  Status: ${status}`);
      log(`  File ID: ${file_id || 'not provided'}`);
      log(`  File URL: ${file_url || 'not provided'}`);

      // Update stored status
      const currentStatus = taskStatuses.get(task_id) || {};
      taskStatuses.set(task_id, {
        ...currentStatus,
        task_id,
        status: status || 'processing',
        file_id,
        file_url,
        base_resp,
        updated_at: new Date().toISOString()
      });

      log('Task status updated in memory');
    }

    return res.json({ status: 'success' });
  } catch (error) {
    log('Error processing callback:', error);
    return res.status(500).json({ error: 'Callback processing failed' });
  }
});

// API endpoint to get video URL from file_id
app.get('/api/video-file/:fileId', async (req, res) => {
  const { fileId } = req.params;
  log(`=== Video File Request Started for File ID: ${fileId} ===`);
  
  try {
    if (!fileId) {
      return res.status(400).json({
        error: 'File ID is required',
        status_code: 400
      });
    }

    if (!process.env.MINIMAX_API_KEY) {
      return res.status(500).json({
        error: 'API key not configured',
        status_code: 500
      });
    }

    // Try different endpoint formats for retrieving video file
    // Format 1: /v1/files/retrieve?file_id={fileId}
    let url = `https://api.minimax.io/v1/files/retrieve?file_id=${fileId}`;
    log(`  Trying Request URL (query param): ${url}`);

    let response;
    try {
      response = await axios.get(
        url,
        {
          headers: {
            'Authorization': `Bearer ${process.env.MINIMAX_API_KEY}`
          }
        }
      );
      log('  Success with query parameter format');
    } catch (error) {
      if (error.response?.status === 404) {
        // Try Format 2: /v1/file/{fileId}
        log(`  Query param format failed (404), trying path parameter...`);
        url = `https://api.minimax.io/v1/file/${fileId}`;
        log(`  Trying Request URL (path param): ${url}`);
        
        try {
          response = await axios.get(
            url,
            {
              headers: {
                'Authorization': `Bearer ${process.env.MINIMAX_API_KEY}`
              }
            }
          );
          log('  Success with path parameter format');
        } catch (error2) {
          log('  Both formats failed');
          throw error2;
        }
      } else {
        throw error;
      }
    }

    log('Video file response received:');
    log('Response status:', response.status);
    log('Response data:', response.data);

    if (response.data.base_resp && response.data.base_resp.status_code !== 0) {
      log('  API returned error status code');
      return res.status(400).json({
        error: response.data.base_resp.status_msg || 'Failed to retrieve video file',
        status_code: response.data.base_resp.status_code
      });
    }

    // According to Minimax API docs, the response structure is:
    // { file: { file_id, bytes, created_at, filename, purpose, download_url }, base_resp: {...} }
    // So download_url is nested in response.data.file.download_url
    log('  Available fields in response:', Object.keys(response.data));
    if (response.data.file) {
      log('  File object fields:', Object.keys(response.data.file));
      if (response.data.file.download_url) {
        log(`  Download URL: ${response.data.file.download_url}`);
      }
    }
    
    // Also check for direct fields (for backward compatibility)
    if (response.data.download_url) {
      log(`  Download URL (direct): ${response.data.download_url}`);
    }
    if (response.data.url) {
      log(`  URL: ${response.data.url}`);
    }
    if (response.data.file_url) {
      log(`  File URL: ${response.data.file_url}`);
    }

    // Return the response - frontend will check both nested and direct paths
    res.json(response.data);
  } catch (error) {
    log('Error retrieving video file:', error);
    res.status(error.response?.status || 500).json({
      error: error.response?.data?.base_resp?.status_msg || 'Failed to retrieve video file',
      status_code: error.response?.data?.base_resp?.status_code || 500
    });
  }
});

// API endpoint to download and save video (to Firebase or local storage)
app.post('/api/video-download', async (req, res) => {
  log('=== Video Download Request Started ===');
  try {
    const { download_url, task_id, file_id } = req.body;

    if (!download_url) {
      return res.status(400).json({
        error: 'download_url is required'
      });
    }

    log(`Downloading video from: ${download_url.substring(0, 100)}...`);
    
    // Download video from Minimax
    const videoResponse = await axios.get(download_url, {
      responseType: 'arraybuffer',
      timeout: 300000 // 5 minutes timeout
    });

    // Generate filename
    const filename = `${task_id || file_id || Date.now()}.mp4`;
    const videoBuffer = Buffer.from(videoResponse.data);

    let videoUrl;
    
    // Try Firebase Storage first if available, otherwise use local storage
    if (firebaseStorage && process.env.FIREBASE_STORAGE_BUCKET) {
      try {
        log('Uploading video to Firebase Storage...');
        videoUrl = await firebaseStorage.uploadVideo(videoBuffer, filename);
        log(`Video uploaded to Firebase: ${videoUrl}`);
      } catch (firebaseError) {
        log('Firebase upload failed, falling back to local storage:', firebaseError.message);
        // Fall back to local storage
        const filepath = path.join(VIDEOS_DIR, filename);
        await fs.writeFile(filepath, videoBuffer);
        videoUrl = `/api/videos/${filename}`;
        log(`Video saved locally: ${filepath}`);
      }
    } else {
      // Use local storage
      const filepath = path.join(VIDEOS_DIR, filename);
      await fs.writeFile(filepath, videoBuffer);
      videoUrl = `/api/videos/${filename}`;
      log(`Video saved locally: ${filepath}`);
    }

    res.json({
      success: true,
      local_url: videoUrl,
      filename: filename,
      is_firebase: videoUrl.startsWith('http')
    });
  } catch (error) {
    log('Error downloading video:', error);
    res.status(500).json({
      error: error.message || 'Failed to download and save video'
    });
  }
});

// API endpoint to serve locally stored videos
app.get('/api/videos/:filename', async (req, res) => {
  try {
    const { filename } = req.params;
    const filepath = path.join(VIDEOS_DIR, filename);

    // Check if file exists
    try {
      await fs.access(filepath);
    } catch {
      return res.status(404).json({ error: 'Video file not found' });
    }

    // Set appropriate headers
    res.setHeader('Content-Type', 'video/mp4');
    res.setHeader('Content-Disposition', `inline; filename="${filename}"`);
    
    // Stream the file
    const fileStream = fsSync.createReadStream(filepath);
    fileStream.pipe(res);
  } catch (error) {
    log('Error serving video file:', error);
    res.status(500).json({ error: 'Failed to serve video file' });
  }
});

// API endpoint to query task status
app.get('/api/video-generation/:taskId', async (req, res) => {
  const { taskId } = req.params;
  log(`=== Status Check Request Started for Task ID: ${taskId} ===`);
  
  try {
    if (!taskId) {
      log('ERROR: Task ID is missing');
      return res.status(400).json({
        error: 'Task ID is required',
        status_code: 400
      });
    }

    // First, check if we have stored status (from callback)
    const storedStatus = taskStatuses.get(taskId);
    if (storedStatus && (storedStatus.status === 'success' || storedStatus.status === 'failed')) {
      log('Returning stored status (from callback)');
      log('Stored status:', storedStatus);
      return res.json({
        task_id: taskId,
        status: storedStatus.status,
        file_id: storedStatus.file_id,
        file_url: storedStatus.file_url,
        base_resp: storedStatus.base_resp || { status_code: 0, status_msg: 'success' }
      });
    }

    log(`Querying status for task: ${taskId}`);
    log(`  API Key present: ${!!process.env.MINIMAX_API_KEY}`);
    log(`  API Key length: ${process.env.MINIMAX_API_KEY ? process.env.MINIMAX_API_KEY.length : 0}`);
    log(`  API Key prefix: ${process.env.MINIMAX_API_KEY ? process.env.MINIMAX_API_KEY.substring(0, 15) + '...' : 'MISSING'}`);

    // Validate API key is present
    if (!process.env.MINIMAX_API_KEY) {
      log('ERROR: MINIMAX_API_KEY is not set in environment');
      return res.status(500).json({
        error: 'API key not configured. Please set MINIMAX_API_KEY in .env file',
        status_code: 500
      });
    }

    // Use the correct Minimax query endpoint: GET /v1/query/video_generation?task_id={taskId}
    const url = `https://api.minimax.io/v1/query/video_generation?task_id=${taskId}`;
    log(`  Request URL: ${url}`);

    const authHeader = `Bearer ${process.env.MINIMAX_API_KEY}`;
    log(`  Authorization header present: ${!!authHeader}`);
    log(`  Authorization header length: ${authHeader.length}`);

    let response;
    try {
      response = await axios.get(
        url,
        {
          headers: {
            'Authorization': authHeader
          }
        }
      );
      log('  API request successful');
    } catch (error) {
      log('  API request failed');
      
      // Log detailed error information
      if (error.response) {
        log('  Error response status:', error.response.status);
        log('  Error response data:', error.response.data);
        
        // Check if it's an authentication error
        if (error.response.data?.base_resp?.status_code === 1004) {
          log('  Authentication error detected - checking API key configuration');
          log(`  API Key in env: ${process.env.MINIMAX_API_KEY ? 'SET' : 'NOT SET'}`);
          log(`  API Key value check: ${process.env.MINIMAX_API_KEY ? (process.env.MINIMAX_API_KEY.length > 0 ? 'Has value' : 'Empty string') : 'Undefined'}`);
        }
      }
      
      // If we have stored status, return it as fallback
      if (storedStatus) {
        log('  Returning stored status as fallback');
        return res.json({
          task_id: taskId,
          status: storedStatus.status,
          file_id: storedStatus.file_id,
          file_url: storedStatus.file_url,
          base_resp: storedStatus.base_resp || { status_code: 0, status_msg: 'success' }
        });
      } else {
        throw error;
      }
    }

    // Process the API response
    log('Status check response received:');
    log('Response status:', response.status);
    log('Response data:', response.data);

    if (response.data.base_resp) {
      log(`  Status code: ${response.data.base_resp.status_code}`);
      log(`  Status message: ${response.data.base_resp.status_msg}`);
      
      // Check if API returned an error (status_code !== 0 means error)
      if (response.data.base_resp.status_code !== 0) {
        log('=== API Error Detected in Status Check (non-zero status_code) ===');
        log(`  Error code: ${response.data.base_resp.status_code}`);
        log(`  Error message: ${response.data.base_resp.status_msg}`);
        
        return res.status(400).json({
          error: response.data.base_resp.status_msg || 'API request failed',
          status_code: response.data.base_resp.status_code,
          base_resp: response.data.base_resp
        });
      }
    }

    // Note: Minimax returns status as "Success", "Processing", "Fail", etc. (capitalized)
    // Map to lowercase for consistency with callback format
    const status = response.data.status;
    log(`  Task status: ${status}`);

    // Log all available fields in the response
    log('  All response fields:', Object.keys(response.data));
    
    if (response.data.file_id) {
      log(`  File ID: ${response.data.file_id}`);
    }
    
    if (response.data.file_url) {
      log(`  File URL (from status query): ${response.data.file_url}`);
    }
    
    if (response.data.download_url) {
      log(`  Download URL (from status query): ${response.data.download_url}`);
    }

    if (response.data.video_width && response.data.video_height) {
      log(`  Video dimensions: ${response.data.video_width}x${response.data.video_height}`);
    }

    // Update stored status with API response
    taskStatuses.set(taskId, {
      ...storedStatus,
      ...response.data,
      // Normalize status to lowercase for consistency
      status: status ? status.toLowerCase() : 'processing',
      updated_at: new Date().toISOString()
    });

    // Return response with normalized status
    const responseData = {
      ...response.data,
      status: status ? status.toLowerCase() : 'processing'
    };

    log('=== Status Check Completed Successfully ===');
    return res.json(responseData);
  } catch (error) {
    log('=== ERROR in Status Check Request ===');
    log('Error type:', error.constructor.name);
    log('Error message:', error.message);
    
    // If we have stored status, return it as fallback
    const storedStatus = taskStatuses.get(taskId);
    if (storedStatus) {
      log('Returning stored status as fallback due to API error');
      return res.json({
        task_id: taskId,
        status: storedStatus.status,
        file_id: storedStatus.file_id,
        file_url: storedStatus.file_url,
        base_resp: storedStatus.base_resp || { status_code: 0, status_msg: 'success' }
      });
    }
    
    if (error.response) {
      log('Error response status:', error.response.status);
      log('Error response data:', error.response.data);
      
      // Handle authentication errors specifically
      if (error.response.data?.base_resp?.status_code === 1004) {
        log('=== AUTHENTICATION ERROR (1004) ===');
        log('This usually means:');
        log('  1. API key is missing or not set in .env file');
        log('  2. API key is incorrect or expired');
        log('  3. API key format is wrong');
        log('Please check your .env file and ensure MINIMAX_API_KEY is set correctly');
      }
    } else if (error.request) {
      log('Error: No response received from Minimax API');
      log('Request URL:', error.config?.url);
    } else {
      log('Error setting up request:', error.message);
    }

    log('Full error stack:', error.stack);

    const errorResponse = {
      error: error.response?.data?.base_resp?.status_msg || error.message || 'Failed to query task status',
      status_code: error.response?.data?.base_resp?.status_code || error.response?.status || 500
    };

    // Add helpful message for auth errors
    if (error.response?.data?.base_resp?.status_code === 1004) {
      errorResponse.error = 'Authentication failed. Please check your API key in .env file. ' + (error.response.data.base_resp.status_msg || '');
    }

    log('Sending error response:', errorResponse);
    res.status(error.response?.status || 500).json(errorResponse);
  }
});

// Serve static files from dist directory (React build) - use dist for Vercel, public for local
const staticDir = fsSync.existsSync(path.join(__dirname, 'dist')) ? 'dist' : 'public';
app.use(express.static(staticDir));

// Serve React app for all non-API routes (must be last)
app.get('*', (req, res) => {
  // Skip API routes
  if (req.path.startsWith('/api')) {
    return res.status(404).json({ error: 'API endpoint not found' });
  }
  // Serve index.html for React app
  const indexPath = path.join(__dirname, staticDir, 'index.html');
  res.sendFile(indexPath);
});

// Only start server if not in Vercel serverless environment
if (process.env.VERCEL !== '1') {
  app.listen(PORT, () => {
    log(`=== Server Started Successfully ===`);
    log(`Server running on http://localhost:${PORT}`);
    log('Ready to accept requests');
  });
}

// Export for Vercel serverless functions
module.exports = app;

