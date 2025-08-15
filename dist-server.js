#!/usr/bin/env node
import { createRequire } from 'module';
import { fileURLToPath } from 'url';
import path from 'path';

const require = createRequire(import.meta.url);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
import dotenv from 'dotenv';
dotenv.config();

console.log('Starting production server...');
console.log('PORT:', process.env.PORT || 5000);
console.log('Environment variables loaded:', {
  DATABASE_URL: !!process.env.DATABASE_URL,
  SESSION_SECRET: !!process.env.SESSION_SECRET,
  CLOUDINARY_CLOUD_NAME: !!process.env.CLOUDINARY_CLOUD_NAME,
});

// Import the built server
import('./dist/index.js').then(() => {
  console.log('Server module loaded successfully');
}).catch(err => {
  console.error('Failed to start server:', err);
  console.error('Stack trace:', err.stack);
  process.exit(1);
});