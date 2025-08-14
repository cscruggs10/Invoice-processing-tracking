const { v2: cloudinary } = require('cloudinary');

export default async function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    // Configure Cloudinary
    cloudinary.config({
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
      api_key: process.env.CLOUDINARY_API_KEY,
      api_secret: process.env.CLOUDINARY_API_SECRET,
    });

    // Generate a signed upload URL for frontend to upload directly to Cloudinary
    const timestamp = Math.round(new Date().getTime() / 1000);
    const params = {
      timestamp: timestamp,
      folder: 'Invoice-uploads',
      upload_preset: 'invoice_uploads' // We'll need to create this
    };

    const signature = cloudinary.utils.api_sign_request(params, process.env.CLOUDINARY_API_SECRET);

    const uploadConfig = {
      url: `https://api.cloudinary.com/v1_1/${process.env.CLOUDINARY_CLOUD_NAME}/image/upload`,
      params: {
        ...params,
        signature: signature,
        api_key: process.env.CLOUDINARY_API_KEY
      }
    };

    res.status(200).json(uploadConfig);

  } catch (error) {
    console.error('Upload config error:', error);
    res.status(500).json({ 
      message: 'Failed to generate upload config', 
      error: error.message 
    });
  }
}

// Increase body size limit
export const config = {
  api: {
    bodyParser: {
      sizeLimit: '1mb',
    },
  },
};