/**
 * Generate Google OAuth Authorization URL
 * 
 * Run this script to get an authorization URL that will let you
 * generate a refresh token for Google Sheets access.
 * 
 * Usage:
 * 1. Set your GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in your .env file
 * 2. Run: npx ts-node scripts/generate-google-auth-url.ts
 * 3. Visit the URL shown
 * 4. Complete the OAuth consent flow
 * 5. Copy the refresh token from the callback URL
 */

import { getAuthUrl } from '../src/lib/google';

console.log('=== Google OAuth Authorization URL Generator ===\n');

try {
  const authUrl = getAuthUrl();
  
  console.log('Authorization URL:');
  console.log(authUrl);
  console.log('\n');
  console.log('Next steps:');
  console.log('1. Copy the URL above and paste it in your browser');
  console.log('2. Complete the Google OAuth consent flow');
  console.log('3. You will be redirected to your callback URL');
  console.log('4. The callback URL will contain a "code" parameter');
  console.log('5. You will need to exchange this code for a refresh token');
  console.log('\n');
  console.log('Note: For production, you should use a proper OAuth callback handler');
  console.log('to automatically exchange the code for tokens.');
  
} catch (error: any) {
  console.error('Error generating authorization URL:');
  console.error(error.message);
  console.log('\n');
  console.log('Make sure you have these environment variables set:');
  console.log('- GOOGLE_CLIENT_ID');
  console.log('- GOOGLE_CLIENT_SECRET');
  console.log('- GOOGLE_REDIRECT_URI (optional, defaults to localhost)');
}
