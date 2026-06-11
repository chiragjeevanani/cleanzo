import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import admin from 'firebase-admin';

// Load environmental variables
dotenv.config();

console.log('🔍 Starting FCM Backend Diagnostics...\n');

// 1. Check Env Values
const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
const serviceAccountPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH;

console.log('📦 Environment Configuration Status:');
console.log(`- FIREBASE_SERVICE_ACCOUNT_JSON: ${serviceAccountJson ? 'Set (Length: ' + serviceAccountJson.length + ' chars)' : 'NOT SET'}`);
console.log(`- FIREBASE_SERVICE_ACCOUNT_PATH: ${serviceAccountPath ? 'Set ("' + serviceAccountPath + '")' : 'NOT SET'}\n`);

if (!serviceAccountJson && !serviceAccountPath) {
  console.error('❌ ERROR: Neither FIREBASE_SERVICE_ACCOUNT_JSON nor FIREBASE_SERVICE_ACCOUNT_PATH is set in your .env file!');
  process.exit(1);
}

// 2. Parse and Validate Credentials
let serviceAccount = null;

if (serviceAccountJson) {
  try {
    console.log('⚙️  Attempting to parse FIREBASE_SERVICE_ACCOUNT_JSON...');
    serviceAccount = JSON.parse(serviceAccountJson);
    console.log('✅ Successfully parsed JSON service account.');
    console.log(`   - Project ID: ${serviceAccount.project_id}`);
    console.log(`   - Client Email: ${serviceAccount.client_email}`);
    console.log(`   - Private Key ID: ${serviceAccount.private_key_id}`);
  } catch (err) {
    console.error('❌ ERROR: Failed to parse FIREBASE_SERVICE_ACCOUNT_JSON as JSON! Please check for formatting issues, missing quotes, or incorrect newline characters.');
    console.error(`   Details: ${err.message}\n`);
  }
}

if (!serviceAccount && serviceAccountPath) {
  try {
    const resolvedPath = path.resolve(process.cwd(), serviceAccountPath);
    console.log(`⚙️  Attempting to read file from path: ${resolvedPath}...`);
    if (!fs.existsSync(resolvedPath)) {
      console.error(`❌ ERROR: File does not exist at path: ${resolvedPath}`);
    } else {
      const content = fs.readFileSync(resolvedPath, 'utf8');
      serviceAccount = JSON.parse(content);
      console.log('✅ Successfully read and parsed service account file.');
      console.log(`   - Project ID: ${serviceAccount.project_id}`);
      console.log(`   - Client Email: ${serviceAccount.client_email}`);
    }
  } catch (err) {
    console.error('❌ ERROR: Failed to read/parse service account file from path!');
    console.error(`   Details: ${err.message}\n`);
  }
}

if (!serviceAccount) {
  console.error('❌ FATAL: Could not load any valid service account credentials. Aborting.');
  process.exit(1);
}

// 3. Initialize Firebase Admin SDK
console.log('\n⚙️  Initializing Firebase Admin SDK...');
try {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
  console.log('✅ Firebase Admin SDK initialized successfully!');
} catch (err) {
  console.error('❌ ERROR: Failed to initialize Firebase Admin SDK.');
  console.error(`   Details: ${err.message}`);
  process.exit(1);
}

// 4. Test connection via Dry Run
console.log('\n⚙️  Testing FCM connectivity via API dry-run...');
const dummyToken = 'APA91bF_dummy_token_for_diagnostic_purposes_only_12345678901234567890_to_verify_connection_to_fcm_servers';

const testMessage = {
  notification: {
    title: 'Cleanzo Connection Test',
    body: 'This is a dry-run test to verify FCM connectivity.',
  },
  token: dummyToken,
};

// dry-run = true allows validating the request without actually sending it to a real device
admin.messaging().send(testMessage, true)
  .then((response) => {
    console.log('✅ FCM Dry Run Success! Message successfully sent & validated by FCM API.');
    console.log(`   Response Identifier: ${response}`);
    console.log('\n🎉 ALL BACKEND CHECKS PASSED SUCCESSFULLY!');
    process.exit(0);
  })
  .catch((err) => {
    // If the token is invalid (which is expected because it's a dummy token),
    // but the error is "registration-token-not-registered" or "invalid-argument",
    // it means FCM successfully authorized our request!
    const errCode = err.code || '';
    if (errCode === 'messaging/registration-token-not-registered' || errCode === 'messaging/invalid-argument' || err.message.includes('not registered')) {
      console.log('✅ FCM Connectivity Verified! (Received expected token validation response)');
      console.log(`   FCM Response Code: ${errCode || 'Success'}`);
      console.log(`   FCM Response Message: ${err.message}`);
      console.log('\n🎉 ALL BACKEND CHECKS PASSED SUCCESSFULLY! The credentials are valid and can connect to Firebase FCM.');
      process.exit(0);
    } else {
      console.error('❌ ERROR: FCM Dry Run failed due to authentication or network error!');
      console.error(`   Error Code: ${errCode}`);
      console.error(`   Details: ${err.message}`);
      process.exit(1);
    }
  });
