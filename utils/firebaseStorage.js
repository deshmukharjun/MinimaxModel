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
        console.log('Firebase initialized successfully with service account');
      } else {
        console.warn('Firebase not configured - missing FIREBASE_SERVICE_ACCOUNT or FIREBASE_STORAGE_BUCKET');
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
    const firebaseBucket = initializeFirebase();
    
    if (!firebaseBucket) {
      throw new Error('Firebase Storage not initialized');
    }

    const file = firebaseBucket.file(`videos/${filename}`);
    
    // Upload the file
    await file.save(videoBuffer, {
      metadata: {
        contentType: 'video/mp4',
        cacheControl: 'public, max-age=31536000',
      },
    });

    // Make the file publicly accessible
    await file.makePublic();

    // Get the public URL
    const publicUrl = `https://storage.googleapis.com/${firebaseBucket.name}/videos/${filename}`;
    
    return publicUrl;
  } catch (error) {
    console.error('Error uploading video to Firebase:', error);
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
};

