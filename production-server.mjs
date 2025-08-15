import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import { eq } from 'drizzle-orm';
import { v2 as cloudinary } from 'cloudinary';
import formidable from 'formidable';
import fs from 'fs';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = process.env.PORT || 5000;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Database connection with error handling
let sql;
let db;

try {
  if (!process.env.DATABASE_URL) {
    console.error('DATABASE_URL is not set!');
    // Continue without database for now
  } else {
    sql = postgres(process.env.DATABASE_URL, {
      ssl: { rejectUnauthorized: false },
      max: 10, // connection pool size
      idle_timeout: 20,
      connect_timeout: 10,
      onnotice: () => {}, // suppress notices
    });
    db = drizzle(sql);
    console.log('Database connected successfully');
  }
} catch (error) {
  console.error('Database connection error:', error);
  // Continue without database
}

// Serve static files
app.use(express.static(path.join(__dirname, 'dist/public')));

// Root health check for Railway
app.get('/health', (req, res) => {
  res.status(200).send('OK');
});

// API Health check
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK',
    timestamp: new Date().toISOString(),
    env: {
      hasDatabase: !!process.env.DATABASE_URL,
      hasCloudinary: !!process.env.CLOUDINARY_CLOUD_NAME,
      dbConnected: !!sql
    }
  });
});

// Test endpoint (no database required)
app.get('/api/test', (req, res) => {
  res.json({
    message: 'Server is running',
    time: new Date().toISOString(),
    port: port
  });
});

// Test upload endpoint (simple echo)
app.post('/api/test-upload', async (req, res) => {
  console.log('Test upload endpoint hit');
  try {
    const form = formidable({
      maxFileSize: 10 * 1024 * 1024,
      keepExtensions: true,
      uploadDir: '/tmp',
    });
    
    const [fields, files] = await form.parse(req);
    console.log('Test upload received files:', files);
    
    res.json({
      success: true,
      filesReceived: !!files.file,
      fileCount: files.file?.length || 0,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Test upload error:', error);
    res.status(500).json({ 
      success: false,
      error: error.message 
    });
  }
});

// Upload endpoint (DealMachine-style streaming)
app.post('/api/upload-stream', async (req, res) => {
  console.log('Upload endpoint hit at:', new Date().toISOString());
  console.log('Headers:', req.headers);
  
  try {
    // Check if Cloudinary is configured
    if (!process.env.CLOUDINARY_CLOUD_NAME || !process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_API_SECRET) {
      console.error('Cloudinary not configured');
      return res.status(503).json({ 
        message: 'Upload service not configured',
        error: 'Missing Cloudinary credentials' 
      });
    }
    
    const form = formidable({
      maxFileSize: 10 * 1024 * 1024, // 10MB
      keepExtensions: true,
      uploadDir: '/tmp', // Specify temp directory for Railway
    });

    console.log('Parsing form data...');
    let fields, files;
    try {
      [fields, files] = await form.parse(req);
    } catch (parseError) {
      console.error('Form parse error:', parseError);
      return res.status(400).json({ 
        message: 'Failed to parse upload',
        error: parseError.message 
      });
    }
    
    console.log('Files received:', files);
    const file = files.file?.[0];

    if (!file) {
      console.error('No file in request. Files object:', files);
      return res.status(400).json({ message: 'No file uploaded' });
    }
    
    console.log('File details:', {
      name: file.originalFilename,
      size: file.size,
      type: file.mimetype,
      path: file.filepath
    });

    console.log('Starting Cloudinary upload...');
    console.log('Cloudinary config:', {
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
      has_api_key: !!process.env.CLOUDINARY_API_KEY,
      has_api_secret: !!process.env.CLOUDINARY_API_SECRET
    });
    
    // Stream upload to Cloudinary
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder: 'Invoice-uploads',
        resource_type: 'auto',
        transformation: [{ width: 2000, height: 2000, crop: 'limit' }],
      },
      (error, result) => {
        if (error) {
          console.error('Cloudinary upload error:', error);
          return res.status(500).json({ 
            message: 'Upload failed', 
            error: error.message 
          });
        }
        
        console.log('Cloudinary upload success:', result.public_id);

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

    // Check if file exists before streaming
    if (!fs.existsSync(file.filepath)) {
      console.error('File not found at path:', file.filepath);
      return res.status(500).json({ 
        message: 'Upload failed - temporary file not found',
        error: 'File processing error' 
      });
    }
    
    // Pipe the file to Cloudinary
    const stream = fs.createReadStream(file.filepath);
    stream.on('error', (streamError) => {
      console.error('Stream error:', streamError);
      if (!res.headersSent) {
        res.status(500).json({ 
          message: 'File stream failed',
          error: streamError.message 
        });
      }
    });
    
    stream.pipe(uploadStream);

  } catch (error) {
    console.error('Upload endpoint error:', error);
    console.error('Error stack:', error.stack);
    res.status(500).json({ 
      message: 'File upload failed', 
      error: error.message 
    });
  }
});

// Create invoice in database
app.post('/api/invoices', async (req, res) => {
  try {
    console.log('Creating invoice with data:', req.body);
    
    if (!sql) {
      console.error('Database not connected');
      return res.status(503).json({ error: 'Database unavailable' });
    }
    
    // Use raw SQL for now to avoid schema import issues
    const result = await sql`
      INSERT INTO invoices (
        invoice_number, vendor_name, vendor_number, 
        invoice_date, invoice_amount, due_date, 
        vin, invoice_type, description, 
        uploaded_by, status
      ) VALUES (
        ${req.body.invoiceNumber},
        ${req.body.vendorName},
        ${req.body.vendorNumber},
        ${new Date(req.body.invoiceDate)},
        ${req.body.invoiceAmount},
        ${new Date(req.body.dueDate)},
        ${req.body.vin},
        ${req.body.invoiceType},
        ${req.body.description},
        ${req.body.uploadedBy || 1},
        ${req.body.status || 'pending_entry'}
      ) RETURNING *
    `;
    
    console.log('Invoice created:', result[0]);
    res.json(result[0]);
  } catch (error) {
    console.error('Error creating invoice:', error);
    res.status(500).json({ error: 'Failed to create invoice', details: error.message });
  }
});

// Link file to invoice
app.patch('/api/files/:fileId/invoice', async (req, res) => {
  try {
    // For now just return success since we're not tracking files separately
    res.json({ success: true });
  } catch (error) {
    console.error('Error linking file:', error);
    res.status(500).json({ error: 'Failed to link file' });
  }
});

// Get all invoices for data entry queue
app.get('/api/invoices', async (req, res) => {
  try {
    if (!sql) {
      return res.json([]); // Return empty array if no database
    }
    const allInvoices = await sql`SELECT * FROM invoices ORDER BY created_at DESC`;
    res.json(allInvoices);
  } catch (error) {
    console.error('Error fetching invoices:', error);
    res.status(500).json({ error: 'Failed to fetch invoices' });
  }
});

// Get data entry queue (pending invoices)
app.get('/api/data-entry-queue', async (req, res) => {
  try {
    if (!sql) {
      return res.json([]); // Return empty array if no database
    }
    const pendingInvoices = await sql`
      SELECT * FROM invoices 
      WHERE status = 'pending_entry' 
      ORDER BY created_at DESC
    `;
    res.json(pendingInvoices);
  } catch (error) {
    console.error('Error fetching data entry queue:', error);
    res.status(500).json({ error: 'Failed to fetch data entry queue' });
  }
});

// Get Cloudinary config (for frontend)
app.get('/api/cloudinary-config', (req, res) => {
  res.json({
    cloudName: process.env.CLOUDINARY_CLOUD_NAME,
    uploadPreset: 'invoice_uploads'
  });
});

// Catch all - serve index.html
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist/public/index.html'));
});

// Start server
const server = app.listen(port, '0.0.0.0', () => {
  console.log(`Production server running on port ${port}`);
  console.log('Environment check:', {
    DATABASE_URL: !!process.env.DATABASE_URL,
    CLOUDINARY: !!process.env.CLOUDINARY_CLOUD_NAME,
    API_KEY: !!process.env.CLOUDINARY_API_KEY
  });
});

// Handle graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM signal received: closing HTTP server');
  server.close(() => {
    console.log('HTTP server closed');
    process.exit(0);
  });
});

// Keep process alive
process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});