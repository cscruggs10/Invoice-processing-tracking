import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import formidable from 'formidable';
import fs from 'fs';
import pkg from 'pg';
const { Pool } = pkg;

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = process.env.PORT || 8080;

// Database connection using Railway PostgreSQL
let pool = null;
try {
  if (process.env.DATABASE_URL) {
    console.log('Setting up Railway PostgreSQL connection...');
    console.log('DATABASE_URL starts with:', process.env.DATABASE_URL.substring(0, 30));
    
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.DATABASE_URL.includes('localhost') ? false : {
        rejectUnauthorized: false
      },
      max: 5,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 10000,
    });
    
    console.log('Railway PostgreSQL pool initialized');
    
    // Test connection on startup
    pool.connect()
      .then(client => {
        console.log('✅ Database connected successfully');
        return client.query('SELECT NOW()');
      })
      .then(() => {
        console.log('✅ Database query test successful');
      })
      .catch(err => {
        console.error('❌ Database connection failed:', err);
      });
    
    pool.on('error', (err) => {
      console.error('Database pool error:', err);
    });
    
  } else {
    console.log('No DATABASE_URL environment variable - database will not be available');
  }
} catch (error) {
  console.error('Database setup error:', error);
  pool = null;
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
  try {
    console.log('Upload test GET endpoint hit');
    res.json({ message: 'Upload endpoint is reachable', timestamp: new Date().toISOString() });
  } catch (error) {
    console.error('Upload test error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Test POST endpoint
app.post('/api/test-post', (req, res) => {
  try {
    console.log('Test POST endpoint hit');
    res.json({ message: 'POST endpoint works', timestamp: new Date().toISOString() });
  } catch (error) {
    console.error('Test POST error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Test database connection
app.get('/api/test-db', async (req, res) => {
  try {
    console.log('Testing database connection...');
    
    if (!pool) {
      return res.json({ status: 'No database pool' });
    }
    
    const client = await pool.connect();
    const result = await client.query('SELECT NOW() as current_time, 1 as test_number');
    client.release();
    
    res.json({ 
      status: 'Database connected',
      result: result.rows[0],
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Database test error:', error);
    res.status(500).json({ 
      status: 'Database error',
      error: error.message,
      code: error.code 
    });
  }
});

// Setup database tables (GET version for easy testing)
app.get('/api/setup-db', async (req, res) => {
  try {
    console.log('Setting up database tables...');
    
    if (!pool) {
      return res.status(503).json({ error: 'No database connection' });
    }
    
    const client = await pool.connect();
    
    // Create invoices table
    await client.query(`
      CREATE TABLE IF NOT EXISTS invoices (
        id SERIAL PRIMARY KEY,
        invoice_number TEXT NOT NULL,
        vendor_name TEXT NOT NULL,
        vendor_number TEXT NOT NULL,
        invoice_date TIMESTAMP NOT NULL,
        invoice_amount DECIMAL(10, 2) NOT NULL,
        due_date TIMESTAMP NOT NULL,
        vin TEXT NOT NULL,
        invoice_type TEXT NOT NULL,
        description TEXT,
        status TEXT NOT NULL DEFAULT 'pending_entry',
        uploaded_by INTEGER NOT NULL DEFAULT 1,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);
    
    // Create indexes
    await client.query(`CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(status)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_invoices_created_at ON invoices(created_at DESC)`);
    
    // Insert test record
    await client.query(`
      INSERT INTO invoices (
        invoice_number, vendor_name, vendor_number, 
        invoice_date, invoice_amount, due_date, 
        vin, invoice_type, description, status, uploaded_by
      ) VALUES (
        'RAILWAY-TEST-001', 'Railway Test Vendor', 'RTV001',
        NOW(), 100.00, NOW() + INTERVAL '30 days',
        'TEST123', 'Parts', 'Test invoice for Railway PostgreSQL setup',
        'pending_entry', 1
      ) ON CONFLICT DO NOTHING
    `);
    
    client.release();
    
    console.log('✅ Database setup completed successfully');
    res.json({ 
      status: 'Database setup completed',
      message: 'Tables created and test data inserted',
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('Database setup error:', error);
    res.status(500).json({ 
      error: 'Database setup failed',
      details: error.message 
    });
  }
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
    if (!pool) {
      return res.status(503).json({ error: 'Database not available' });
    }
    
    const client = await pool.connect();
    const result = await client.query(`
      INSERT INTO invoices (
        invoice_number, vendor_name, vendor_number, 
        invoice_date, invoice_amount, due_date, 
        vin, invoice_type, description, 
        uploaded_by, status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) 
      RETURNING *
    `, [
      req.body.invoiceNumber,
      req.body.vendorName,
      req.body.vendorNumber,
      new Date(req.body.invoiceDate),
      req.body.invoiceAmount,
      new Date(req.body.dueDate),
      req.body.vin,
      req.body.invoiceType,
      req.body.description,
      req.body.uploadedBy || 1,
      req.body.status || 'pending_entry'
    ]);
    client.release();
    
    console.log('Invoice created in database:', result.rows[0]);
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error creating invoice:', error);
    res.status(500).json({ error: 'Failed to create invoice', details: error.message });
  }
});

app.get('/api/invoices', async (req, res) => {
  try {
    console.log('Fetching invoices...');
    console.log('Pool exists:', !!pool);
    
    if (!pool) {
      console.log('No database pool, returning empty array');
      return res.json([]);
    }
    
    console.log('Attempting database query...');
    const client = await pool.connect();
    const result = await client.query('SELECT * FROM invoices ORDER BY created_at DESC');
    client.release();
    
    console.log('Query successful, found', result.rows.length, 'invoices');
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching invoices:', error);
    console.error('Error details:', {
      message: error.message,
      code: error.code,
      stack: error.stack
    });
    res.status(500).json({ 
      error: 'Failed to fetch invoices',
      details: error.message,
      code: error.code
    });
  }
});

app.get('/api/data-entry-queue', async (req, res) => {
  try {
    if (!pool) {
      return res.json([]);
    }
    
    const client = await pool.connect();
    const result = await client.query(`
      SELECT * FROM invoices 
      WHERE status = 'pending_entry' 
      ORDER BY created_at DESC
    `);
    client.release();
    
    console.log('Data entry queue:', result.rows.length, 'invoices');
    res.json(result.rows);
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

console.log('Server initialization complete - NEON DATABASE VERSION 2.0');