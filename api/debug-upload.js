const logs = [];

function addLog(message, data = null) {
  const logEntry = {
    timestamp: new Date().toISOString(),
    message,
    data: data ? JSON.stringify(data, null, 2) : null
  };
  logs.push(logEntry);
  console.log(`[DEBUG] ${message}`, data || '');
  return logEntry;
}

export default async function handler(req, res) {
  // Clear previous logs
  logs.length = 0;
  
  addLog('Debug upload endpoint called', {
    method: req.method,
    headers: Object.keys(req.headers),
    hasBody: !!req.body,
    bodyKeys: req.body ? Object.keys(req.body) : []
  });

  if (req.method === 'GET') {
    // Return current logs
    return res.status(200).json({
      message: 'Debug logs',
      logs: logs,
      timestamp: new Date().toISOString()
    });
  }

  if (req.method !== 'POST') {
    addLog('Invalid method', { method: req.method });
    return res.status(405).json({ 
      message: 'Method not allowed',
      logs: logs 
    });
  }

  try {
    addLog('Starting upload process');

    // Check environment variables
    const envCheck = {
      CLOUDINARY_CLOUD_NAME: !!process.env.CLOUDINARY_CLOUD_NAME,
      CLOUDINARY_API_KEY: !!process.env.CLOUDINARY_API_KEY,
      CLOUDINARY_API_SECRET: !!process.env.CLOUDINARY_API_SECRET,
    };
    addLog('Environment variables check', envCheck);

    // Check request body
    if (!req.body) {
      addLog('ERROR: No request body');
      return res.status(400).json({ 
        message: 'No request body',
        logs: logs 
      });
    }

    const { image, filename, mimetype } = req.body;
    addLog('Request body parsed', {
      hasImage: !!image,
      imageType: typeof image,
      imageLength: image ? image.length : 0,
      filename,
      mimetype
    });

    if (!image) {
      addLog('ERROR: No image data provided');
      return res.status(400).json({ 
        message: 'No image data provided',
        logs: logs 
      });
    }

    // Try to import Cloudinary
    let cloudinary;
    try {
      const cloudinaryModule = require('cloudinary');
      cloudinary = cloudinaryModule.v2;
      addLog('Cloudinary module loaded successfully');
    } catch (error) {
      addLog('ERROR: Failed to load Cloudinary module', { error: error.message });
      return res.status(500).json({
        message: 'Failed to load Cloudinary',
        error: error.message,
        logs: logs
      });
    }

    // Configure Cloudinary
    try {
      cloudinary.config({
        cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
        api_key: process.env.CLOUDINARY_API_KEY,
        api_secret: process.env.CLOUDINARY_API_SECRET,
      });
      addLog('Cloudinary configured successfully');
    } catch (error) {
      addLog('ERROR: Failed to configure Cloudinary', { error: error.message });
      return res.status(500).json({
        message: 'Failed to configure Cloudinary',
        error: error.message,
        logs: logs
      });
    }

    // Attempt upload to Cloudinary
    try {
      addLog('Starting Cloudinary upload...');
      const result = await cloudinary.uploader.upload(image, {
        folder: 'Invoice-uploads',
        resource_type: 'auto',
        public_id: `invoice-${Date.now()}`,
      });
      
      addLog('Cloudinary upload successful', {
        public_id: result.public_id,
        secure_url: result.secure_url,
        bytes: result.bytes,
        format: result.format
      });

      // Create response
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
      
      addLog('Response created successfully', response);
      
      res.status(200).json({
        ...response,
        debug: {
          logs: logs,
          success: true
        }
      });

    } catch (uploadError) {
      addLog('ERROR: Cloudinary upload failed', { 
        error: uploadError.message,
        stack: uploadError.stack
      });
      return res.status(500).json({
        message: 'Cloudinary upload failed',
        error: uploadError.message,
        logs: logs
      });
    }

  } catch (error) {
    addLog('ERROR: General upload error', { 
      error: error.message,
      stack: error.stack 
    });
    res.status(500).json({ 
      message: 'File upload failed', 
      error: error.message,
      logs: logs
    });
  }
}