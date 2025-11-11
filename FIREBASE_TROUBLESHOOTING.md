# Firebase Storage Troubleshooting Guide

## Videos Not Appearing in Firebase Storage

If videos are being generated but not appearing in Firebase Storage, check the following:

### 1. Check Vercel Function Logs

1. Go to your Vercel project → **Deployments** → Latest deployment
2. Click on **Functions** tab
3. Find the `/api` function and click it
4. Look for logs when you generate a video

You should see logs like:
- `Checking Firebase configuration...`
- `firebaseStorage available: true/false`
- `FIREBASE_STORAGE_BUCKET: SET / NOT SET`
- `Attempting to upload video to Firebase Storage...`
- Or error messages if upload fails

### 2. Verify Environment Variables

In Vercel → Settings → Environment Variables, ensure:
- `FIREBASE_SERVICE_ACCOUNT`: Should be a long JSON string (single line)
- `FIREBASE_STORAGE_BUCKET`: Should match your Firebase bucket name

**Important:** The bucket name can be either:
- `your-project-id.appspot.com` (old format)
- `your-project-id.firebasestorage.app` (new format)

Both should work, but try using the exact format shown in your Firebase Console.

### 3. Check Firebase Storage Rules

In Firebase Console → Storage → Rules, ensure writes are allowed:

```javascript
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /videos/{videoId} {
      allow read: if true;
      allow write: if true;  // For testing - restrict in production
    }
  }
}
```

### 4. Check Service Account Permissions

1. Go to Firebase Console → Project Settings → Service Accounts
2. Verify your service account has "Storage Admin" or "Storage Object Admin" role
3. If not, go to Google Cloud Console → IAM & Admin → IAM
4. Find your service account and ensure it has proper Storage permissions

### 5. Check Browser Console

Open browser DevTools (F12) → Console tab and look for:
- `Starting video download and storage...`
- `Video download response:`
- `✓ Video uploaded to Firebase Storage:` (success)
- `⚠ Video saved locally` (Firebase failed)

### 6. Common Issues

**Issue: "Firebase Storage not initialized"**
- Solution: Check that `FIREBASE_SERVICE_ACCOUNT` is valid JSON (single line)
- Solution: Verify `FIREBASE_STORAGE_BUCKET` is set correctly

**Issue: "Permission denied"**
- Solution: Check Firebase Storage rules allow writes
- Solution: Verify service account has Storage permissions

**Issue: "Bucket not found"**
- Solution: Use the exact bucket name from Firebase Console
- Solution: Try both `.appspot.com` and `.firebasestorage.app` formats

**Issue: Videos appear in history but not in Firebase**
- This means the upload is failing silently
- Check Vercel function logs for error messages
- Check browser console for warnings

### 7. Test Firebase Upload Manually

You can test if Firebase is working by checking the Vercel function logs. Look for:
- `✓ Firebase initialized successfully`
- `✓ Video successfully uploaded to Firebase`
- Or error messages explaining why it failed

### 8. Update Bucket Name Format

If your Firebase Console shows `minimaxstorage-cd2d8.firebasestorage.app`, try updating the environment variable to use that format instead of `.appspot.com`.

