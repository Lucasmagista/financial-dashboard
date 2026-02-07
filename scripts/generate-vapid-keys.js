#!/usr/bin/env node

/**
 * Script to generate VAPID keys for Web Push notifications
 * Run with: node scripts/generate-vapid-keys.js
 */

const webpush = require('web-push');

console.log('\n🔑 Generating VAPID Keys for Web Push Notifications...\n');

const vapidKeys = webpush.generateVAPIDKeys();

console.log('✅ Keys generated successfully!\n');
console.log('Add these to your .env file:\n');
console.log('─────────────────────────────────────────────────────────');
console.log(`NEXT_PUBLIC_VAPID_PUBLIC_KEY=${vapidKeys.publicKey}`);
console.log(`VAPID_PUBLIC_KEY=${vapidKeys.publicKey}`);
console.log(`VAPID_PRIVATE_KEY=${vapidKeys.privateKey}`);
console.log('─────────────────────────────────────────────────────────\n');

console.log('⚠️  IMPORTANT: Keep the private key secret!\n');
