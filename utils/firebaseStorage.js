// Firebase Storage utility for video storage
const admin = require('firebase-admin');

let bucket = null;
let isInitialized = false;

// Initialize Firebase Admin if not already initialized
function initializeFirebase() {
  if (isInitialized) {
    return bucket;
  }

  if (!admin.apps.length) {
    try {
      // For Vercel, use environment variables for Firebase config
      let serviceAccount = null;
      
      if (process.env.FIREBASE_SERVICE_ACCOUNT) {
        try {
          // Try to parse the JSON string
          const jsonString = process.env.FIREBASE_SERVICE_ACCOUNT.trim();
          serviceAccount = JSON.parse(jsonString);
        } catch (parseError) {
          console.error('Error parsing FIREBASE_SERVICE_ACCOUNT JSON:', parseError.message);
          console.error('JSON string length:', process.env.FIREBASE_SERVICE_ACCOUNT?.length);
          throw new Error('Invalid FIREBASE_SERVICE_ACCOUNT JSON format');
        }
      }

      if (serviceAccount && process.env.FIREBASE_STORAGE_BUCKET) {
        admin.initializeApp({
          credential: admin.credential.cert(serviceAccount),
          storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
        });
        bucket = admin.storage().bucket();
        isInitialized = true;
        console.log('✓ Firebase initialized successfully with service account');
        console.log(`  Storage bucket: ${process.env.FIREBASE_STORAGE_BUCKET}`);
        console.log(`  Project ID: ${serviceAccount.project_id}`);
      } else {
        console.warn('⚠ Firebase not configured');
        console.warn(`  FIREBASE_SERVICE_ACCOUNT: ${process.env.FIREBASE_SERVICE_ACCOUNT ? 'SET' : 'NOT SET'}`);
        console.warn(`  FIREBASE_STORAGE_BUCKET: ${process.env.FIREBASE_STORAGE_BUCKET || 'NOT SET'}`);
        isInitialized = true; // Mark as initialized to prevent retries
      }
    } catch (error) {
      console.error('Firebase initialization error:', error.message);
      isInitialized = true; // Mark as initialized to prevent retries
    }
  } else {
    // Already initialized
    bucket = admin.storage().bucket();
    isInitialized = true;
  }

  return bucket;
}

/**
 * Upload video to Firebase Storage
 * @param {Buffer} videoBuffer - Video file buffer
 * @param {string} filename - Filename for the video
 * @returns {Promise<string>} Public URL of the uploaded video
 */
async function uploadVideo(videoBuffer, filename) {
  try {
    console.log(`Starting Firebase upload for: ${filename}`);
    const firebaseBucket = initializeFirebase();
    
    if (!firebaseBucket) {
      throw new Error('Firebase Storage not initialized - check environment variables');
    }

    console.log(`Using bucket: ${firebaseBucket.name}`);
    const file = firebaseBucket.file(`videos/${filename}`);
    console.log(`Uploading to path: videos/${filename}`);
    
    // Upload the file
    console.log(`Uploading ${videoBuffer.length} bytes...`);
    await file.save(videoBuffer, {
      metadata: {
        contentType: 'video/mp4',
        cacheControl: 'public, max-age=31536000',
      },
    });
    console.log('✓ File uploaded successfully');

    // Make the file publicly accessible
    console.log('Making file publicly accessible...');
    try {
      await file.makePublic();
      console.log('✓ File is now public');
    } catch (makePublicError) {
      console.warn('⚠ Warning: Could not make file public:', makePublicError.message);
      console.warn('  This might be due to Storage rules. File uploaded but may not be publicly accessible.');
    }

    // Get the public URL using Firebase Storage API format
    const bucketName = firebaseBucket.name;
    // Encode the path: videos/filename.mp4 -> videos%2Ffilename.mp4
    const encodedPath = encodeURIComponent(`videos/${filename}`).replace(/%2F/g, '%2F');
    
    // Use Firebase Storage API format for public URLs
    const publicUrl = `https://firebasestorage.googleapis.com/v0/b/${bucketName}/o/${encodedPath}?alt=media`;
    
    console.log(`✓ Public URL: ${publicUrl}`);
    
    return publicUrl;
  } catch (error) {
    console.error('✗ Error uploading video to Firebase:');
    console.error(`  Message: ${error.message}`);
    console.error(`  Code: ${error.code || 'N/A'}`);
    if (error.stack) {
      console.error(`  Stack: ${error.stack}`);
    }
    throw error;
  }
}

/**
 * Make an existing file public (useful for files uploaded before makePublic was called)
 * @param {string} filename - Filename to make public
 */
async function makeVideoPublic(filename) {
  try {
    const firebaseBucket = initializeFirebase();
    
    if (!firebaseBucket) {
      throw new Error('Firebase Storage not initialized');
    }

    const file = firebaseBucket.file(`videos/${filename}`);
    await file.makePublic();
    console.log(`✓ Made ${filename} public`);
  } catch (error) {
    console.error(`Error making ${filename} public:`, error);
    throw error;
  }
}

/**
 * List all videos from Firebase Storage
 * @returns {Promise<Array>} Array of video objects with metadata
 */
async function listAllVideos() {
  try {
    const firebaseBucket = initializeFirebase();
    
    if (!firebaseBucket) {
      throw new Error('Firebase Storage not initialized');
    }

    console.log('Listing all videos from Firebase Storage...');
    const [files] = await firebaseBucket.getFiles({
      prefix: 'videos/',
    });

    console.log(`Found ${files.length} videos in Firebase Storage`);

    const bucketName = firebaseBucket.name;
    const videos = await Promise.all(
      files
        .filter(file => file.name.endsWith('.mp4'))
        .map(async (file) => {
          try {
            const [metadata] = await file.getMetadata();
            const filename = file.name.replace('videos/', '');
            
            // Generate public URL using Firebase Storage API format
            // Encode the path: videos/filename.mp4 -> videos%2Ffilename.mp4
            const encodedPath = encodeURIComponent(file.name).replace(/%2F/g, '%2F');
            const publicUrl = `https://firebasestorage.googleapis.com/v0/b/${bucketName}/o/${encodedPath}?alt=media`;
            
            return {
              filename,
              url: publicUrl,
              size: metadata.size,
              contentType: metadata.contentType,
              timeCreated: metadata.timeCreated,
              updated: metadata.updated,
              // Extract task ID from filename if it's in the format: taskId.mp4
              taskId: filename.replace('.mp4', ''),
            };
          } catch (error) {
            console.error(`Error getting metadata for ${file.name}:`, error);
            return null;
          }
        })
    );

    // Filter out null values
    return videos.filter(video => video !== null);
  } catch (error) {
    console.error('Error listing videos from Firebase:', error);
    throw error;
  }
}

/**
 * Delete video from Firebase Storage
 * @param {string} filename - Filename to delete
 */
async function deleteVideo(filename) {
  try {
    const firebaseBucket = initializeFirebase();
    
    if (!firebaseBucket) {
      throw new Error('Firebase Storage not initialized');
    }

    const file = firebaseBucket.file(`videos/${filename}`);
    await file.delete();
  } catch (error) {
    console.error('Error deleting video from Firebase:', error);
    throw error;
  }
}

module.exports = {
  uploadVideo,
  deleteVideo,
  listAllVideos,
  makeVideoPublic,
  initializeFirebase, // Export for testing
};

