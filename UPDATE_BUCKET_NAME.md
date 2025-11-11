# Update Firebase Storage Bucket Name

## Issue
Your Firebase Console shows the bucket as: `minimaxstorage-cd2d8.firebasestorage.app`
But we're currently using: `minimaxstorage-cd2d8.appspot.com`

While both formats should work, let's try using the exact format Firebase Console shows.

## Steps to Update

1. Go to **Vercel** → Your Project → **Settings** → **Environment Variables**

2. Find `FIREBASE_STORAGE_BUCKET`

3. Update the value from:
   ```
   minimaxstorage-cd2d8.appspot.com
   ```
   To:
   ```
   minimaxstorage-cd2d8.firebasestorage.app
   ```

4. Click **Save**

5. **Redeploy** your application (or wait for the next deployment)

6. Generate a new video and check if it appears in Firebase Storage

## Alternative: Try Both Formats

If the `.firebasestorage.app` format doesn't work, you can also try:
- `minimaxstorage-cd2d8.appspot.com` (current)
- `gs://minimaxstorage-cd2d8.firebasestorage.app` (with gs:// prefix)
- Just the project ID: `minimaxstorage-cd2d8` (Firebase Admin SDK will auto-detect)

## Verify

After updating, check `/api/firebase-status` to see the bucket name being used.

