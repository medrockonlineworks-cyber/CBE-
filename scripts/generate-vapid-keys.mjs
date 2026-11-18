import { generateVAPIDKeys } from 'web-push';

const keys = generateVAPIDKeys();
console.log('# Generated VAPID Keys for CBE Mobil Web Push');
console.log('# Add these to your .env file (keep VAPID_PRIVATE_KEY secret on the server only)');
console.log(`VAPID_PUBLIC_KEY="${keys.publicKey}"`);
console.log(`VAPID_PRIVATE_KEY="${keys.privateKey}"`);
console.log('VAPID_SUBJECT="mailto:notifications@cbemobile.app"');
