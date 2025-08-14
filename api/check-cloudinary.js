const { v2: cloudinary } = require('cloudinary');

export default async function handler(req, res) {
  try {
    // Configure Cloudinary
    cloudinary.config({
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
      api_key: process.env.CLOUDINARY_API_KEY,
      api_secret: process.env.CLOUDINARY_API_SECRET,
    });

    // List recent uploads from the Invoice-uploads folder
    const result = await cloudinary.api.resources({
      type: 'upload',
      prefix: 'Invoice-uploads/',
      max_results: 20,
      resource_type: 'image'
    });

    const uploads = result.resources.map(resource => ({
      public_id: resource.public_id,
      secure_url: resource.secure_url,
      created_at: resource.created_at,
      bytes: resource.bytes,
      format: resource.format
    }));

    res.status(200).json({
      message: 'Recent uploads from Cloudinary',
      count: uploads.length,
      uploads: uploads,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Cloudinary check error:', error);
    res.status(500).json({ 
      message: 'Failed to check Cloudinary', 
      error: error.message 
    });
  }
}