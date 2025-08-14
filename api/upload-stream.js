const { v2: cloudinary } = require('cloudinary');
const formidable = require('formidable');

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
    // Use formidable to parse multipart data (works better in serverless)
    const form = formidable({
      maxFileSize: 10 * 1024 * 1024, // 10MB
      keepExtensions: true,
    });

    const [fields, files] = await form.parse(req);
    const file = files.file?.[0];

    if (!file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    // Stream upload to Cloudinary (this was the key for DealMachine)
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder: 'Invoice-uploads',
        resource_type: 'auto',
        transformation: [{ width: 2000, height: 2000, crop: 'limit' }],
      },
      (error, result) => {
        if (error) {
          console.error('Cloudinary error:', error);
          return res.status(500).json({ 
            message: 'Upload failed', 
            error: error.message 
          });
        }

        // Success response
        const response = {
          id: Date.now(),
          filename: result.public_id,
          originalName: file.originalFilename,
          mimeType: file.mimetype,
          fileSize: result.bytes,
          filePath: result.secure_url,
          uploadedBy: 1,
          uploadedAt: new Date().toISOString(),
        };

        res.status(200).json(response);
      }
    );

    // Pipe the file to Cloudinary
    const fs = require('fs');
    fs.createReadStream(file.filepath).pipe(uploadStream);

  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ 
      message: 'File upload failed', 
      error: error.message 
    });
  }
}

// Disable body parser for file uploads
export const config = {
  api: {
    bodyParser: false,
  },
};