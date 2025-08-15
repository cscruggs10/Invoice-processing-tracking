import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import formidable from 'formidable';
import postgres from 'postgres';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = process.env.PORT || 8080;

// Database connection
let sql = null;
try {
  if (process.env.DATABASE_URL) {
    console.log('Setting up database connection...');
    sql = postgres(process.env.DATABASE_URL, {
      ssl: { rejectUnauthorized: false },
      max: 5,
      idle_timeout: 20,
      connect_timeout: 10,
      onnotice: () => {}, // suppress notices
    });
    console.log('Database connection initialized');
  } else {
    console.log('No DATABASE_URL environment variable');
  }
} catch (error) {
  console.error('Database setup error:', error);
  sql = null;
}

// Basic middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: false, limit: '10mb' }));

// CORS headers for debugging
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

// Log all requests
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} ${req.method} ${req.path}`);
  next();
});

// Serve static files
app.use(express.static(path.join(__dirname, 'dist/public')));

// Basic health check (no database)
app.get('/health', (req, res) => {
  res.status(200).send('OK');
});

// Debug endpoint
app.get('/api/debug', (req, res) => {
  try {
    res.json({
      env: {
        NODE_ENV: process.env.NODE_ENV || 'not_set',
        PORT: process.env.PORT || 'not_set',
        hasDB: !!process.env.DATABASE_URL,
        dbUrl: process.env.DATABASE_URL ? 'SET' : 'NOT_SET',
        sqlObject: !!sql
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Debug endpoint error:', error);
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/health', async (req, res) => {
  try {
    let dbStatus = 'not_configured';
    let dbError = null;
    
    if (process.env.DATABASE_URL) {
      if (sql) {
        try {
          // Test database connection
          await sql`SELECT 1 as test`;
          dbStatus = 'connected';
        } catch (err) {
          dbStatus = 'error';
          dbError = err.message;
        }
      } else {
        dbStatus = 'not_connected';
      }
    }
    
    res.json({ 
      status: 'OK',
      timestamp: new Date().toISOString(),
      env: {
        hasDatabase: !!process.env.DATABASE_URL,
        dbStatus: dbStatus,
        dbError: dbError,
        hasCloudinary: !!process.env.CLOUDINARY_CLOUD_NAME
      }
    });
  } catch (error) {
    console.error('Health check error:', error);
    res.status(500).json({
      status: 'ERROR',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Test if endpoint is even reachable
app.get('/api/upload-test', (req, res) => {
  console.log('Upload test GET endpoint hit');
  res.json({ message: 'Upload endpoint is reachable', timestamp: new Date().toISOString() });
});

// Simple upload handler
app.post('/api/upload-stream', (req, res) => {
  console.log('Upload POST endpoint hit at:', new Date().toISOString());
  console.log('Request method:', req.method);
  console.log('Request URL:', req.url);
  
  // Just respond immediately without any async operations
  res.json({
    id: Date.now(),
    filename: 'mock-upload',
    originalName: 'test.jpg',
    mimeType: 'image/jpeg',
    fileSize: 1000,
    filePath: 'https://via.placeholder.com/150',
    uploadedBy: 1,
    uploadedAt: new Date().toISOString(),
  });
  
  console.log('Mock upload response sent');
});

// Real invoice endpoints with database
app.post('/api/invoices', async (req, res) => {
  console.log('Creating invoice:', req.body);
  
  try {
    if (!sql) {
      return res.status(503).json({ error: 'Database not available' });
    }
    
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
    
    console.log('Invoice created in database:', result[0]);
    res.json(result[0]);
  } catch (error) {
    console.error('Error creating invoice:', error);
    res.status(500).json({ error: 'Failed to create invoice', details: error.message });
  }
});

app.get('/api/invoices', async (req, res) => {
  try {
    if (!sql) {
      return res.json([]);
    }
    const allInvoices = await sql`SELECT * FROM invoices ORDER BY created_at DESC`;
    res.json(allInvoices);
  } catch (error) {
    console.error('Error fetching invoices:', error);
    res.status(500).json({ error: 'Failed to fetch invoices' });
  }
});

app.get('/api/data-entry-queue', async (req, res) => {
  try {
    if (!sql) {
      return res.json([]);
    }
    const pendingInvoices = await sql`
      SELECT * FROM invoices 
      WHERE status = 'pending_entry' 
      ORDER BY created_at DESC
    `;
    console.log('Data entry queue:', pendingInvoices.length, 'invoices');
    res.json(pendingInvoices);
  } catch (error) {
    console.error('Error fetching data entry queue:', error);
    res.status(500).json({ error: 'Failed to fetch data entry queue' });
  }
});

app.patch('/api/files/:fileId/invoice', (req, res) => {
  res.json({ success: true });
});

// Catch all
app.get('*', (req, res) => {
  const indexPath = path.join(__dirname, 'dist/public/index.html');
  if (require('fs').existsSync(indexPath)) {
    res.sendFile(indexPath);
  } else {
    res.status(404).send('Not found');
  }
});

// Start server with error handling
const server = app.listen(port, '0.0.0.0', () => {
  console.log(`Server running on port ${port}`);
  console.log('Environment:', {
    NODE_ENV: process.env.NODE_ENV,
    PORT: port,
    hasDB: !!process.env.DATABASE_URL,
    hasCloudinary: !!process.env.CLOUDINARY_CLOUD_NAME
  });
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, closing server gracefully');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
  
  // Force exit after 10 seconds
  setTimeout(() => {
    console.error('Forced exit');
    process.exit(1);
  }, 10000);
});

process.on('SIGINT', () => {
  console.log('SIGINT received, closing server gracefully');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

// Catch errors
process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
  // Don't exit - try to keep running
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  // Don't exit - try to keep running
});

console.log('Server initialization complete');