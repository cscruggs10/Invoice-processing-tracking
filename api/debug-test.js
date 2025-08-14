export default function handler(req, res) {
  const testData = {
    message: 'Debug endpoint is working!',
    method: req.method,
    timestamp: new Date().toISOString(),
    environment: {
      NODE_ENV: process.env.NODE_ENV || 'unknown',
      VERCEL: process.env.VERCEL || 'false',
      hasCloudinary: {
        cloud_name: !!process.env.CLOUDINARY_CLOUD_NAME,
        api_key: !!process.env.CLOUDINARY_API_KEY,
        api_secret: !!process.env.CLOUDINARY_API_SECRET,
      }
    },
    headers: req.headers,
    body: req.body || 'No body'
  };
  
  console.log('Debug test called:', testData);
  
  res.status(200).json(testData);
}