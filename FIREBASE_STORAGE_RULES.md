# Firebase Storage Rules - Quick Setup

## Set These Rules in Firebase Console

1. Go to **Firebase Console** → Your Project → **Storage** → **Rules** tab
2. Replace the rules with the following:

```javascript
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /videos/{videoId} {
      // Allow public read access
      allow read: if true;
      
      // Allow writes (for testing - you can restrict this later)
      allow write: if true;
    }
  }
}
```

3. Click **Publish**

## For Production (More Secure)

```javascript
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /videos/{videoId} {
      // Allow public read access
      allow read: if true;
      
      // Only allow writes from authenticated service accounts
      // (Your server uses a service account, so this should work)
      allow write: if request.auth != null;
    }
  }
}
```

## Important Notes

- **For testing**, use `allow write: if true;` to ensure uploads work
- After confirming uploads work, you can restrict write permissions
- The service account from your environment variables should have permission to write

