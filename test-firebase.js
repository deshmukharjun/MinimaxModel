// Test Firebase initialization
require('dotenv').config();

console.log('Testing Firebase initialization...');
console.log('FIREBASE_STORAGE_BUCKET:', process.env.FIREBASE_STORAGE_BUCKET ? 'SET' : 'NOT SET');
console.log('FIREBASE_SERVICE_ACCOUNT:', process.env.FIREBASE_SERVICE_ACCOUNT ? `SET (${process.env.FIREBASE_SERVICE_ACCOUNT.length} chars)` : 'NOT SET');

if (process.env.FIREBASE_SERVICE_ACCOUNT) {
  try {
    const json = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT.trim());
    console.log('✓ JSON parsed successfully');
    console.log('Project ID:', json.project_id);
  } catch (e) {
    console.error('✗ JSON parse error:', e.message);
    console.error('Error at position:', e.message.match(/position (\d+)/)?.[1]);
  }
}

try {
  const firebaseStorage = require('./utils/firebaseStorage');
  console.log('✓ Firebase Storage module loaded');
} catch (e) {
  console.error('✗ Error loading Firebase Storage:', e.message);
  console.error(e.stack);
}

