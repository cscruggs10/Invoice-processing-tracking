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
import { invoices, uploadedFiles } from './shared/schema.js';

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

// Database connection
const sql = postgres(process.env.DATABASE_URL, {
  ssl: { rejectUnauthorized: false }
});
const db = drizzle(sql);

// Serve static files
app.use(express.static(path.join(__dirname, 'dist/public')));

// Health check
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK',
    env: {
      hasDatabase: !!process.env.DATABASE_URL,
      hasCloudinary: !!process.env.CLOUDINARY_CLOUD_NAME
    }
  });
});

// Upload endpoint (DealMachine-style streaming)
app.post('/api/upload-stream', async (req, res) => {
  console.log('Upload endpoint hit');
  console.log('Headers:', req.headers);
  
  try {
    const form = formidable({
      maxFileSize: 10 * 1024 * 1024, // 10MB
      keepExtensions: true,
    });

    console.log('Parsing form...');
    const [fields, files] = await form.parse(req);
    console.log('Files received:', files);
    const file = files.file?.[0];

    if (!file) {
      console.error('No file in request');
      return res.status(400).json({ message: 'No file uploaded' });
    }
    
    console.log('File details:', {
      name: file.originalFilename,
      size: file.size,
      type: file.mimetype
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

    // Pipe the file to Cloudinary
    fs.createReadStream(file.filepath).pipe(uploadStream);

  } catch (error) {
    console.error('Upload error:', error);
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
    
    // Insert invoice into database
    const [newInvoice] = await db.insert(invoices).values({
      invoiceNumber: req.body.invoiceNumber,
      vendorName: req.body.vendorName,
      vendorNumber: req.body.vendorNumber,
      invoiceDate: new Date(req.body.invoiceDate),
      invoiceAmount: req.body.invoiceAmount,
      dueDate: new Date(req.body.dueDate),
      vin: req.body.vin,
      invoiceType: req.body.invoiceType,
      description: req.body.description,
      uploadedBy: req.body.uploadedBy || 1,
      status: req.body.status || 'pending_entry'
    }).returning();
    
    console.log('Invoice created:', newInvoice);
    res.json(newInvoice);
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
    const allInvoices = await db.select().from(invoices);
    res.json(allInvoices);
  } catch (error) {
    console.error('Error fetching invoices:', error);
    res.status(500).json({ error: 'Failed to fetch invoices' });
  }
});

// Get data entry queue (pending invoices)
app.get('/api/data-entry-queue', async (req, res) => {
  try {
    const pendingInvoices = await db.select()
      .from(invoices)
      .where(eq(invoices.status, 'pending_entry'));
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

app.listen(port, '0.0.0.0', () => {
  console.log(`Production server running on port ${port}`);
  console.log('Environment check:', {
    DATABASE_URL: !!process.env.DATABASE_URL,
    CLOUDINARY: !!process.env.CLOUDINARY_CLOUD_NAME,
    API_KEY: !!process.env.CLOUDINARY_API_KEY
  });
});