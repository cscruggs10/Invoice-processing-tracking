export default function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  // Return Cloudinary configuration for frontend
  const config = {
    cloudName: process.env.CLOUDINARY_CLOUD_NAME,
    uploadPreset: 'invoice_uploads' // We'll create this unsigned preset
  };

  res.status(200).json(config);
}