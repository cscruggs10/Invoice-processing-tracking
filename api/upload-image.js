const { v2: cloudinary } = require('cloudinary');

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    // Get the base64 image from the request
    const { image, filename, mimetype } = req.body;
    
    if (!image) {
      return res.status(400).json({ message: 'No image data provided' });
    }

    // Upload to Cloudinary
    const result = await cloudinary.uploader.upload(image, {
      folder: 'Invoice-uploads',
      resource_type: 'auto',
      public_id: `invoice-${Date.now()}`,
    });

    // Return success
    const response = {
      id: Date.now(),
      filename: result.public_id,
      originalName: filename || 'upload',
      mimeType: mimetype || 'image/jpeg',
      fileSize: result.bytes,
      filePath: result.secure_url,
      uploadedBy: 1,
      uploadedAt: new Date().toISOString(),
    };
    
    res.status(200).json(response);
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ 
      message: 'File upload failed', 
      error: error.message 
    });
  }
}