// Firebase Storage utility for video storage
const admin = require('firebase-admin');

// Initialize Firebase Admin if not already initialized
if (!admin.apps.length) {
  try {
    // For Vercel, use environment variables for Firebase config
    const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT
      ? JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT)
      : null;

    if (serviceAccount) {
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
      });
    } else {
      // Fallback: try to use default credentials (for local development)
      admin.initializeApp({
        storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
      });
    }
  } catch (error) {
    console.error('Firebase initialization error:', error);
  }
}

const bucket = admin.storage().bucket();

/**
 * Upload video to Firebase Storage
 * @param {Buffer} videoBuffer - Video file buffer
 * @param {string} filename - Filename for the video
 * @returns {Promise<string>} Public URL of the uploaded video
 */
async function uploadVideo(videoBuffer, filename) {
  try {
    const file = bucket.file(`videos/${filename}`);
    
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
    const publicUrl = `https://storage.googleapis.com/${bucket.name}/videos/${filename}`;
    
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
    const file = bucket.file(`videos/${filename}`);
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

