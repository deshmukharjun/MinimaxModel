# Firebase Storage Setup Guide

This guide will help you set up Firebase Storage for video storage in your Minimax AI application.

## Prerequisites

1. A Google account
2. A Firebase project

## Step 1: Create a Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click "Add project" or select an existing project
3. Follow the setup wizard

## Step 2: Enable Firebase Storage

1. In your Firebase project, go to **Storage** in the left sidebar
2. Click "Get started"
3. Start in **production mode** (or test mode for development)
4. Choose a Cloud Storage location (preferably close to your users)
5. Click "Done"

## Step 3: Create a Service Account

1. Go to **Project Settings** (gear icon) → **Service accounts**
2. Click "Generate new private key"
3. Download the JSON file (this is your service account key)
4. **Keep this file secure!** Never commit it to git.

## Step 4: Set Up Environment Variables

### For Vercel:

1. Go to your Vercel project settings
2. Navigate to **Environment Variables**
3. Add the following variables:

   - `FIREBASE_SERVICE_ACCOUNT`: Paste the entire contents of the service account JSON file
   - `FIREBASE_STORAGE_BUCKET`: Your Firebase storage bucket name (format: `your-project-id.appspot.com`)

### For Local Development:

Create a `.env` file in the root directory:

```env
FIREBASE_SERVICE_ACCOUNT={"type":"service_account","project_id":"...","private_key":"...","client_email":"..."}
FIREBASE_STORAGE_BUCKET=your-project-id.appspot.com
```

**Note:** The `FIREBASE_SERVICE_ACCOUNT` should be a single-line JSON string. You can use a tool like [JSON Minifier](https://jsonformatter.org/json-minify) to convert the multi-line JSON to a single line.

## Step 5: Set Storage Rules (Optional but Recommended)

In Firebase Console → Storage → Rules, you can set rules like:

```javascript
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /videos/{videoId} {
      allow read: if true;  // Public read access
      allow write: if request.auth != null;  // Only authenticated users can write
    }
  }
}
```

For development, you can use:
```javascript
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /{allPaths=**} {
      allow read, write: if true;
    }
  }
}
```

## Step 6: Test the Setup

1. Deploy your application to Vercel
2. Generate a video
3. Check Firebase Console → Storage to see if videos are being uploaded

## Troubleshooting

### Videos not uploading to Firebase

1. Check that environment variables are set correctly in Vercel
2. Verify the service account JSON is valid (single-line format)
3. Check Firebase Storage rules allow writes
4. Check Vercel function logs for errors

### Service Account Format

The `FIREBASE_SERVICE_ACCOUNT` environment variable must be a **single-line JSON string**. If you have a multi-line JSON file, convert it:

```bash
# On Linux/Mac
cat service-account.json | jq -c

# Or use an online tool
```

## Security Notes

- Never commit your service account key to git
- Use environment variables for all sensitive data
- Regularly rotate service account keys
- Use Firebase Storage rules to restrict access

## Cost Considerations

Firebase Storage has a free tier:
- 5 GB storage
- 1 GB/day downloads
- 20,000 operations/day

Beyond that, you'll be charged. Monitor your usage in the Firebase Console.

