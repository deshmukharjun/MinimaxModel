# Fix Firebase Storage Access Denied Error

You're getting an "Access Denied" error because Firebase Storage rules are blocking public access. Here's how to fix it:

## Quick Fix: Update Firebase Storage Rules

1. **Go to Firebase Console**: https://console.firebase.google.com/
2. **Select your project**: `minimaxstorage-cd2d8` (or your project name)
3. **Navigate to Storage**: Click "Storage" in the left sidebar
4. **Go to Rules tab**: Click the "Rules" tab at the top
5. **Replace the rules** with this:

```javascript
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /videos/{videoId} {
      // Allow public read access to all videos
      allow read: if true;
      
      // Allow writes (your server uses service account, so this works)
      allow write: if true;
    }
  }
}
```

6. **Click "Publish"** to save the rules

## Why This Works

- `allow read: if true;` - Makes all videos in the `videos/` folder publicly readable
- `allow write: if true;` - Allows your server (using service account) to upload videos

## After Updating Rules

1. **Wait 1-2 minutes** for the rules to propagate
2. **Try accessing a video URL** directly in your browser
3. **Refresh the History tab** in your app

## Make Existing Videos Public

If you have videos that were uploaded before, you can make them public using the API:

```bash
POST /api/firebase-videos/{filename}/make-public
```

Or they should automatically be accessible once the rules are updated.

## For Production (More Secure)

Once everything is working, you can restrict write access:

```javascript
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /videos/{videoId} {
      // Public read access
      allow read: if true;
      
      // Only service account can write (your server)
      allow write: if request.auth != null;
    }
  }
}
```

## Verify It's Working

1. Go to Firebase Console → Storage → Files
2. Click on a video file
3. Copy the "File location" URL
4. Paste it in a new browser tab (or incognito window)
5. The video should play/download without errors

If you still see "Access Denied", wait a few more minutes for the rules to propagate, or check that you're using the correct bucket name format.

