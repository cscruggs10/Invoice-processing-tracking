import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import formidable from 'formidable';
import fs from 'fs';
import pkg from 'pg';
const { Pool } = pkg;
import { getAllVendors, getVendorInsertSQL } from './vendor-data.mjs';

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
        client.query('SELECT NOW()')
          .then(() => {
            console.log('✅ Database query test successful');
            client.release();
          })
          .catch(err => {
            console.error('❌ Database query failed:', err);
            client.release();
          });
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
        poolObject: !!pool
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
      if (pool) {
        try {
          // Test database connection
          const client = await pool.connect();
          await client.query('SELECT 1 as test');
          client.release();
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

// Add image_url column to existing database
app.get('/api/add-image-column', async (req, res) => {
  try {
    console.log('Adding image_url column to invoices table...');
    
    if (!pool) {
      return res.status(503).json({ error: 'No database connection' });
    }
    
    const client = await pool.connect();
    
    // Add image_url column if it doesn't exist
    await client.query(`
      ALTER TABLE invoices 
      ADD COLUMN IF NOT EXISTS image_url TEXT
    `);
    
    console.log('✅ image_url column added successfully');
    
    client.release();
    
    res.json({ 
      status: 'Success',
      message: 'image_url column added to invoices table',
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('Database migration error:', error);
    res.status(500).json({ 
      error: 'Migration failed',
      details: error.message 
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

// Real upload handler with Cloudinary
app.post('/api/upload-stream', async (req, res) => {
  console.log('Upload endpoint hit at:', new Date().toISOString());
  
  try {
    // Import Cloudinary
    const { v2: cloudinary } = await import('cloudinary');
    
    // Configure Cloudinary
    cloudinary.config({
      cloud_name: 'dcpy2x17s',
      api_key: '898359299891889',
      api_secret: 'UyIHA__rvf0D3SYtEK9IhkviMAY'
    });
    
    // Parse the form data
    const form = formidable({
      maxFileSize: 10 * 1024 * 1024, // 10MB
      keepExtensions: true,
    });
    
    const [fields, files] = await form.parse(req);
    const file = files.file?.[0];
    
    if (!file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }
    
    console.log('Uploading to Cloudinary:', file.originalFilename);
    
    // Upload to Cloudinary using stream
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder: 'Invoice-uploads',
        resource_type: 'auto',
      },
      (error, result) => {
        if (error) {
          console.error('Cloudinary error:', error);
          return res.status(500).json({ 
            message: 'Upload failed', 
            error: error.message 
          });
        }
        
        console.log('Upload successful:', result.public_id);
        
        // Return success response
        res.json({
          id: Date.now(),
          filename: result.public_id,
          originalName: file.originalFilename,
          mimeType: file.mimetype,
          fileSize: result.bytes,
          filePath: result.secure_url, // This is the Cloudinary URL
          uploadedBy: 1,
          uploadedAt: new Date().toISOString(),
        });
      }
    );
    
    // Stream the file to Cloudinary
    fs.createReadStream(file.filepath).pipe(uploadStream);
    
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ 
      message: 'Upload failed', 
      error: error.message 
    });
  }
});

// Real invoice endpoints with database
app.post('/api/invoices', async (req, res) => {
  console.log('Creating invoice:', req.body);
  
  try {
    if (!pool) {
      return res.status(503).json({ error: 'Database not available' });
    }
    
    const client = await pool.connect();
    
    // Check if image_url column exists
    const checkColumn = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'invoices' 
      AND column_name = 'image_url'
    `);
    
    const hasImageColumn = checkColumn.rows.length > 0;
    
    let result;
    if (hasImageColumn) {
      // Use new schema with image_url column
      result = await client.query(`
        INSERT INTO invoices (
          invoice_number, vendor_name, vendor_number, 
          invoice_date, invoice_amount, due_date, 
          vin, invoice_type, description, 
          uploaded_by, status, image_url
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12) 
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
        req.body.status || 'pending_entry',
        req.body.imageUrl || null  // Store the Cloudinary URL here
      ]);
    } else {
      // Fallback to old schema without image_url
      result = await client.query(`
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
        req.body.description + (req.body.imageUrl ? ` - Image: ${req.body.imageUrl}` : ''),
        req.body.uploadedBy || 1,
        req.body.status || 'pending_entry'
      ]);
    }
    
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

// Vendors API endpoints
app.get('/api/vendors', async (req, res) => {
  try {
    if (!pool) {
      return res.json([]);
    }
    
    const client = await pool.connect();
    
    // First check if vendors table exists
    const tableCheck = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'vendors'
      )
    `);
    
    if (!tableCheck.rows[0].exists) {
      client.release();
      return res.json([]);
    }
    
    // Build query based on parameters
    let query = 'SELECT * FROM vendors WHERE 1=1';
    const params = [];
    let paramCount = 0;
    
    // Filter by active status if requested
    if (req.query.active === 'true') {
      paramCount++;
      query += ` AND is_active = $${paramCount}`;
      params.push(true);
    }
    
    // Search by vendor name or number
    if (req.query.search) {
      paramCount++;
      query += ` AND (vendor_name ILIKE $${paramCount} OR vendor_number ILIKE $${paramCount})`;
      params.push(`%${req.query.search}%`);
    }
    
    query += ' ORDER BY vendor_name ASC';
    
    const result = await client.query(query, params);
    client.release();
    
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching vendors:', error);
    res.json([]); // Return empty array instead of error
  }
});

// Setup vendors table with ALL 754 unique vendors from CSV files
app.get('/api/setup-vendors', async (req, res) => {
  try {
    if (!pool) {
      return res.status(503).json({ error: 'No database connection' });
    }
    
    const client = await pool.connect();
    
    console.log('Creating vendors table...');
    // Drop and recreate table to ensure clean structure
    await client.query('DROP TABLE IF EXISTS vendors CASCADE');
    
    // Create simplified vendors table (only vendor_number, vendor_name, is_active)
    await client.query(`
      CREATE TABLE vendors (
        id SERIAL PRIMARY KEY,
        vendor_number TEXT NOT NULL UNIQUE,
        vendor_name TEXT NOT NULL,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);
    
    // No need to clear since we dropped the table
    
    console.log('Inserting all 754 unique vendors from CSV files...');
    
    // Get vendor chunks
    const vendorChunks = getVendorInsertSQL();
    let totalInserted = 0;
    
    // Insert vendors in chunks
    for (let i = 0; i < vendorChunks.length; i++) {
      const chunk = vendorChunks[i];
      const sql = `
        INSERT INTO vendors (vendor_number, vendor_name, is_active)
        VALUES ${chunk.join(',\n')}
        ON CONFLICT (vendor_number) DO UPDATE SET
          vendor_name = EXCLUDED.vendor_name,
          updated_at = NOW()
      `;
      
      await client.query(sql);
      totalInserted += chunk.length;
      console.log(`Inserted chunk ${i + 1}/${vendorChunks.length} (${totalInserted} vendors so far)`);
    }
    
    // Get final count
    const countResult = await client.query('SELECT COUNT(*) as count FROM vendors');
    const vendorCount = countResult.rows[0].count;
    
    client.release();
    
    console.log(`Vendors table setup completed with ${vendorCount} vendors`);
    res.json({ 
      status: 'All unique vendors loaded successfully',
      vendorsCreated: vendorCount,
      totalFromCSV: getAllVendors().length
    });
  } catch (error) {
    console.error('Error setting up vendors:', error);
    res.status(500).json({ error: 'Failed to setup vendors', details: error.message });
  }
});

// Test vendor search endpoint  
app.get('/api/vendors/search/:term', async (req, res) => {
  try {
    if (!pool) {
      return res.json([]);
    }
    
    const client = await pool.connect();
    const searchTerm = req.params.term;
    
    const result = await client.query(`
      SELECT id, vendor_number, vendor_name, is_active 
      FROM vendors 
      WHERE vendor_name ILIKE $1 OR vendor_number ILIKE $1
      ORDER BY vendor_name ASC 
      LIMIT 10
    `, [`%${searchTerm}%`]);
    
    client.release();
    
    res.json(result.rows);
  } catch (error) {
    console.error('Error searching vendors:', error);
    res.json([]);
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

console.log('Server initialization complete - NEON DATABASE VERSION 3.0 - FIXED URL');