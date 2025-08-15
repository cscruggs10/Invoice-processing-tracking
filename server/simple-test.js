import express from 'express';
import dotenv from 'dotenv';

dotenv.config();

console.log('Starting simple test server...');
console.log('Environment variables check:');
console.log('- PORT:', process.env.PORT || '5000');
console.log('- DATABASE_URL:', process.env.DATABASE_URL ? 'Set ✓' : 'Missing ✗');
console.log('- SESSION_SECRET:', process.env.SESSION_SECRET ? 'Set ✓' : 'Missing ✗');
console.log('- CLOUDINARY_CLOUD_NAME:', process.env.CLOUDINARY_CLOUD_NAME || 'Missing ✗');
console.log('- CLOUDINARY_API_KEY:', process.env.CLOUDINARY_API_KEY ? 'Set ✓' : 'Missing ✗');
console.log('- CLOUDINARY_API_SECRET:', process.env.CLOUDINARY_API_SECRET ? 'Set ✓' : 'Missing ✗');

const app = express();

app.get('/', (req, res) => {
  res.json({ 
    status: 'OK',
    message: 'Simple server is running',
    env: {
      hasDatabase: !!process.env.DATABASE_URL,
      hasSession: !!process.env.SESSION_SECRET,
      hasCloudinary: !!process.env.CLOUDINARY_CLOUD_NAME
    }
  });
});

app.get('/health', (req, res) => {
  res.json({ status: 'healthy' });
});

const port = process.env.PORT || 5000;
app.listen(port, '0.0.0.0', () => {
  console.log(`✓ Simple test server running on port ${port}`);
  console.log(`✓ Server is ready to accept connections`);
});