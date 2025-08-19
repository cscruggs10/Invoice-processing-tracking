import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import formidable from 'formidable';
import fs from 'fs';
import pkg from 'pg';
const { Pool } = pkg;
import multer from 'multer';
import { getAllVendors, getVendorInsertSQL } from './vendor-data.mjs';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = process.env.PORT || 8080;

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'text/csv' || file.originalname.toLowerCase().endsWith('.csv')) {
      cb(null, true);
    } else {
      cb(new Error('Only CSV files are allowed'));
    }
  }
});

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
          .then(async () => {
            console.log('✅ Database query test successful');
            
            // Auto-create VIN database tables
            try {
              await setupVinDatabaseTables(client);
              console.log('✅ VIN database tables initialized');
            } catch (setupError) {
              console.error('❌ VIN table setup failed:', setupError);
            }
            
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

// Auto-setup VIN database tables function
async function setupVinDatabaseTables(client) {
  console.log('Creating VIN database tables...');
  
  // 1. Wholesale Inventory (GL: 1400, Wholesale export)
  await client.query(`
    CREATE TABLE IF NOT EXISTS wholesale_inventory (
      id SERIAL PRIMARY KEY,
      stock_number TEXT NOT NULL,
      vin_last_6 TEXT NOT NULL,
      vin_padded TEXT NOT NULL, -- 6 digits with leading zeros
      uploaded_at TIMESTAMP DEFAULT NOW(),
      UNIQUE(stock_number, vin_last_6)
    )
  `);
  
  // 2. Retail Inventory (GL: 1400, Retail export)  
  await client.query(`
    CREATE TABLE IF NOT EXISTS retail_inventory (
      id SERIAL PRIMARY KEY,
      stock_number TEXT NOT NULL,
      vin_last_6 TEXT NOT NULL,
      vin_padded TEXT NOT NULL, -- 6 digits with leading zeros
      uploaded_at TIMESTAMP DEFAULT NOW(),
      UNIQUE(stock_number, vin_last_6)
    )
  `);
  
  // 3. Active Account (GL: 1420, Retail export)
  await client.query(`
    CREATE TABLE IF NOT EXISTS active_accounts (
      id SERIAL PRIMARY KEY,
      stock_number TEXT NOT NULL,
      full_vin TEXT NOT NULL,
      vin_last_6 TEXT NOT NULL,
      vin_padded TEXT NOT NULL, -- 6 digits with leading zeros
      uploaded_at TIMESTAMP DEFAULT NOW(),
      UNIQUE(stock_number, full_vin)
    )
  `);
  
  // 4. Retail Sold (GL: 5180.3, Retail export)
  await client.query(`
    CREATE TABLE IF NOT EXISTS retail_sold (
      id SERIAL PRIMARY KEY,
      stock_number TEXT NOT NULL,
      date_sold DATE NOT NULL,
      vin_last_6 TEXT NOT NULL,
      vin_padded TEXT NOT NULL, -- 6 digits with leading zeros
      uploaded_at TIMESTAMP DEFAULT NOW(),
      UNIQUE(stock_number, date_sold, vin_last_6)
    )
  `);
  
  // 5. Wholesale Sold (GL: 5180.x based on location, Wholesale export)
  await client.query(`
    CREATE TABLE IF NOT EXISTS wholesale_sold (
      id SERIAL PRIMARY KEY,
      stock_number TEXT NOT NULL,
      location TEXT NOT NULL, -- CVILLE WHOLESALE, OB WHOLESALE, RENTAL
      date_sold DATE NOT NULL,
      vin_last_6 TEXT NOT NULL,
      vin_padded TEXT NOT NULL, -- 6 digits with leading zeros
      gl_code TEXT NOT NULL, -- 5180.9, 5180.7, 5180.8
      uploaded_at TIMESTAMP DEFAULT NOW(),
      UNIQUE(stock_number, location, date_sold, vin_last_6)
    )
  `);
  
  // Create indexes for fast VIN lookups
  await client.query('CREATE INDEX IF NOT EXISTS idx_wholesale_inventory_vin ON wholesale_inventory(vin_padded)');
  await client.query('CREATE INDEX IF NOT EXISTS idx_retail_inventory_vin ON retail_inventory(vin_padded)');
  await client.query('CREATE INDEX IF NOT EXISTS idx_active_accounts_vin ON active_accounts(vin_padded)');
  await client.query('CREATE INDEX IF NOT EXISTS idx_retail_sold_vin ON retail_sold(vin_padded, date_sold DESC)');
  await client.query('CREATE INDEX IF NOT EXISTS idx_wholesale_sold_vin ON wholesale_sold(vin_padded, date_sold DESC)');
  
  console.log('VIN database tables and indexes created successfully');
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

// Setup all VIN databases for GL logic
app.get('/api/setup-vin-databases', async (req, res) => {
  try {
    if (!pool) {
      return res.status(503).json({ error: 'No database connection' });
    }
    
    const client = await pool.connect();
    
    console.log('Creating VIN database tables...');
    
    // 1. Wholesale Inventory (GL: 1400, Wholesale export)
    await client.query(`
      CREATE TABLE IF NOT EXISTS wholesale_inventory (
        id SERIAL PRIMARY KEY,
        stock_number TEXT NOT NULL,
        vin_last_6 TEXT NOT NULL,
        vin_padded TEXT NOT NULL, -- 6 digits with leading zeros
        uploaded_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(stock_number, vin_last_6)
      )
    `);
    
    // 2. Retail Inventory (GL: 1400, Retail export)  
    await client.query(`
      CREATE TABLE IF NOT EXISTS retail_inventory (
        id SERIAL PRIMARY KEY,
        stock_number TEXT NOT NULL,
        vin_last_6 TEXT NOT NULL,
        vin_padded TEXT NOT NULL, -- 6 digits with leading zeros
        uploaded_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(stock_number, vin_last_6)
      )
    `);
    
    // 3. Active Account (GL: 1420, Retail export)
    await client.query(`
      CREATE TABLE IF NOT EXISTS active_accounts (
        id SERIAL PRIMARY KEY,
        stock_number TEXT NOT NULL,
        full_vin TEXT NOT NULL,
        vin_last_6 TEXT NOT NULL,
        vin_padded TEXT NOT NULL, -- 6 digits with leading zeros
        uploaded_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(stock_number, full_vin)
      )
    `);
    
    // 4. Retail Sold (GL: 5180.3, Retail export)
    await client.query(`
      CREATE TABLE IF NOT EXISTS retail_sold (
        id SERIAL PRIMARY KEY,
        stock_number TEXT NOT NULL,
        date_sold DATE NOT NULL,
        vin_last_6 TEXT NOT NULL,
        vin_padded TEXT NOT NULL, -- 6 digits with leading zeros
        uploaded_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(stock_number, date_sold, vin_last_6)
      )
    `);
    
    // 5. Wholesale Sold (GL: 5180.x based on location, Wholesale export)
    await client.query(`
      CREATE TABLE IF NOT EXISTS wholesale_sold (
        id SERIAL PRIMARY KEY,
        stock_number TEXT NOT NULL,
        location TEXT NOT NULL, -- CVILLE WHOLESALE, OB WHOLESALE, RENTAL
        date_sold DATE NOT NULL,
        vin_last_6 TEXT NOT NULL,
        vin_padded TEXT NOT NULL, -- 6 digits with leading zeros
        gl_code TEXT NOT NULL, -- 5180.9, 5180.7, 5180.8
        uploaded_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(stock_number, location, date_sold, vin_last_6)
      )
    `);
    
    // Create indexes for fast VIN lookups
    await client.query('CREATE INDEX IF NOT EXISTS idx_wholesale_inventory_vin ON wholesale_inventory(vin_padded)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_retail_inventory_vin ON retail_inventory(vin_padded)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_active_accounts_vin ON active_accounts(vin_padded)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_retail_sold_vin ON retail_sold(vin_padded, date_sold DESC)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_wholesale_sold_vin ON wholesale_sold(vin_padded, date_sold DESC)');
    
    client.release();
    
    console.log('VIN database tables created successfully');
    res.json({ 
      status: 'VIN database tables created successfully',
      tables: [
        'wholesale_inventory',
        'retail_inventory', 
        'active_accounts',
        'retail_sold',
        'wholesale_sold'
      ]
    });
  } catch (error) {
    console.error('Error setting up VIN databases:', error);
    res.status(500).json({ error: 'Failed to setup VIN databases', details: error.message });
  }
});

// VIN padding utility function
function padVin(vin) {
  if (!vin) return null;
  // Take last 6 characters and pad with leading zeros if needed
  const last6 = vin.toString().slice(-6);
  return last6.padStart(6, '0');
}

// Parse CSV data for different database types
function parseCSVForDatabase(csvData, databaseType) {
  const lines = csvData.trim().split('\n');
  if (lines.length < 2) return []; // Need at least headers + 1 row
  
  const headers = lines[0].toLowerCase().split(',').map(h => h.trim());
  console.log(`Parsing ${databaseType} CSV with headers:`, headers);
  const records = [];
  
  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(',').map(v => v.trim());
    const record = {};
    headers.forEach((header, index) => {
      record[header] = values[index] || '';
    });
    
    // Parse based on database type
    switch (databaseType) {
      case 'wholesale_inventory':
      case 'retail_inventory':
        // Expected: Stock Number, VIN Last 6
        if (record['stock number'] || record['stock .']) {
          records.push({
            stock_number: record['stock number'] || record['stock .'],
            vin_last_6: record['last six of vin'] || record['vin last 6'] || '',
            vin_padded: padVin(record['last six of vin'] || record['vin last 6'] || '')
          });
        }
        break;
        
      case 'active_accounts':
        // Expected: Stock Number, Full VIN - flexible headers
        const stockNum = record['stocknbr'] || record['stock number'] || record['stock .'] || record['stock'] || '';
        const fullVin = record['vin'] || record['full vin'] || '';
        
        console.log(`Active account - Stock: "${stockNum}", VIN: "${fullVin}"`);
        
        if (stockNum && stockNum.trim()) {
          records.push({
            stock_number: stockNum.trim(),
            full_vin: fullVin.trim(),
            vin_padded: padVin(fullVin) // Take last 6 of full VIN
          });
          console.log(`Added active account: ${stockNum} with VIN ${fullVin}`);
        } else {
          console.log(`Skipping active account - no stock number found. Headers:`, Object.keys(record));
        }
        break;
        
      case 'retail_sold':
        // Expected: Stock Number, Date Sold, VIN - be flexible with headers
        console.log(`Retail sold record:`, record);
        
        // Look for stock number with multiple possible headers
        const stockNumber = record['stock .'] || record['stock number'] || record['stock#'] || record['stock'] || '';
        const dateSold = record['date sold'] || record['datesold'] || record['sold date'] || new Date().toISOString().split('T')[0];
        const vinLast6 = record['last six of vin'] || record['vin last 6'] || record['vin'] || record['last 6'] || '';
        
        console.log(`Stock: "${stockNumber}", Date: "${dateSold}", VIN: "${vinLast6}"`);
        
        if (stockNumber && stockNumber.trim()) {
          const parsedRecord = {
            stock_number: stockNumber.trim(),
            date_sold: dateSold,
            vin_last_6: vinLast6,
            vin_padded: padVin(vinLast6)
          };
          console.log(`Adding retail sold record:`, parsedRecord);
          records.push(parsedRecord);
        } else {
          console.log(`Skipping retail sold record - no valid stock number found`);
          console.log(`Available headers:`, Object.keys(record));
        }
        break;
        
      case 'wholesale_sold':
        // Expected: Stock ., Location, Date Sold, Last Six of VIN
        const stockNum = record['stock .'] || record['stock number'] || record['stock'] || '';
        const location = record['location'] || record['lot name'] || '';
        const dateSold = record['date sold'] || record['sold date'] || '';
        const vinLast6 = record['last six of vin'] || record['vin last 6'] || record['vin'] || '';
        
        console.log(`Wholesale sold record - Stock: "${stockNum}", Location: "${location}", Date: "${dateSold}", VIN: "${vinLast6}"`);
        
        if (stockNum && stockNum.trim()) {
          let glCode = '5180.9'; // Default GL code for CVILLE WHOLESALE
          
          // Assign GL code based on location
          if (location.toUpperCase().includes('RENTAL')) glCode = '5180.8';
          else if (location.toUpperCase().includes('OB WHOLESALE')) glCode = '5180.7';
          else if (location.toUpperCase().includes('AUCTION')) glCode = '5180.2';
          else if (location.toUpperCase().includes('CVILLE WHOLESALE')) glCode = '5180.9';
          
          const parsedRecord = {
            stock_number: stockNum.trim(),
            location: location.trim(),
            date_sold: dateSold,
            gl_code: glCode,
            vin_last_6: vinLast6.trim(),
            vin_padded: padVin(vinLast6)
          };
          
          console.log(`Adding wholesale sold record:`, parsedRecord);
          records.push(parsedRecord);
        } else {
          console.log(`Skipping wholesale sold record - no valid stock number found`);
          console.log(`Available headers:`, Object.keys(record));
        }
        break;
    }
  }
  
  return records;
}

// Update database with parsed records
async function updateDatabaseWithRecords(client, databaseType, records) {
  if (records.length === 0) return;
  
  // Clear existing data first
  await client.query(`DELETE FROM ${databaseType}`);
  
  // Insert new records
  for (const record of records) {
    switch (databaseType) {
      case 'wholesale_inventory':
      case 'retail_inventory':
        await client.query(
          `INSERT INTO ${databaseType} (stock_number, vin_last_6, vin_padded, uploaded_at) 
           VALUES ($1, $2, $3, NOW())`,
          [record.stock_number, record.vin_last_6, record.vin_padded]
        );
        break;
        
      case 'active_accounts':
        await client.query(
          `INSERT INTO active_accounts (stock_number, full_vin, vin_last_6, vin_padded, uploaded_at) 
           VALUES ($1, $2, $3, $4, NOW())`,
          [record.stock_number, record.full_vin, record.full_vin.slice(-6), record.vin_padded]
        );
        break;
        
      case 'retail_sold':
        await client.query(
          `INSERT INTO retail_sold (stock_number, date_sold, vin_padded, uploaded_at) 
           VALUES ($1, $2, $3, NOW())`,
          [record.stock_number, record.date_sold, record.vin_padded]
        );
        break;
        
      case 'wholesale_sold':
        await client.query(
          `INSERT INTO wholesale_sold (stock_number, location, date_sold, gl_code, vin_padded, uploaded_at) 
           VALUES ($1, $2, $3, $4, $5, NOW())`,
          [record.stock_number, record.location, record.date_sold, record.gl_code, record.vin_padded]
        );
        break;
    }
  }
}

// Database status check endpoint with mock mode
app.get('/api/database-status', async (req, res) => {
  try {
    if (!pool) {
      return res.status(503).json({ connected: false, error: 'No database pool available' });
    }
    
    const client = await pool.connect();
    await client.query('SELECT 1'); // Simple connectivity test
    client.release();
    
    res.json({ connected: true, message: 'Database connected successfully' });
  } catch (error) {
    console.error('Database status check failed:', error);
    // Enable mock mode for testing
    if (process.env.NODE_ENV === 'development') {
      res.json({ connected: true, message: 'Mock mode enabled - using test data' });
    } else {
      res.status(503).json({ connected: false, error: error.message });
    }
  }
});

// Mock data for testing
const mockDatabases = {
  wholesale_inventory: [
    { stock_number: '11650', vin_last_6: '231614', vin_padded: '231614' },
    { stock_number: '11651', vin_last_6: '231615', vin_padded: '231615' },
    { stock_number: '11652', vin_last_6: '231616', vin_padded: '231616' }
  ],
  retail_inventory: [
    { stock_number: '12345', vin_last_6: '123456', vin_padded: '123456' },
    { stock_number: '12346', vin_last_6: '123457', vin_padded: '123457' }
  ],
  active_accounts: [
    { stock_number: '10056', full_vin: '1234567890721441', vin_padded: '721441' },
    { stock_number: '10057', full_vin: '1234567890721442', vin_padded: '721442' }
  ],
  retail_sold: [
    { stock_number: '9876R', date_sold: '2025-08-15', vin_padded: '987654' }
  ],
  wholesale_sold: [
    { stock_number: '13185', date_sold: '2025-08-10', location: 'RENTAL', gl_code: '5180.8', vin_padded: '204899' },
    { stock_number: '13303', date_sold: '2025-08-12', location: 'OB WHOLESALE', gl_code: '5180.7', vin_padded: '010363' }
  ]
};

// Mock GL lookup function
function mockGLLookup(inputVin, vinPadded, res) {
  console.log(`Mock GL Lookup for VIN: ${inputVin} → Padded: ${vinPadded}`);
  
  // Priority 1: Check Wholesale Inventory (GL: 1400, Wholesale export)
  const wholesaleMatch = mockDatabases.wholesale_inventory.find(item => item.vin_padded === vinPadded);
  if (wholesaleMatch) {
    return res.json({
      found: true,
      database: 'wholesale_inventory',
      gl_code: '1400',
      export_file: 'wholesale',
      priority: 1,
      stock_number: wholesaleMatch.stock_number,
      details: wholesaleMatch,
      searched_vin: inputVin,
      padded_vin: vinPadded
    });
  }
  
  // Priority 1: Check Retail Inventory (GL: 1400, Retail export)
  const retailMatch = mockDatabases.retail_inventory.find(item => item.vin_padded === vinPadded);
  if (retailMatch) {
    return res.json({
      found: true,
      database: 'retail_inventory',
      gl_code: '1400',
      export_file: 'retail',
      priority: 1,
      stock_number: retailMatch.stock_number,
      details: retailMatch,
      searched_vin: inputVin,
      padded_vin: vinPadded
    });
  }
  
  // Priority 2: Check Active Account (GL: 1420, Retail export)
  const activeMatch = mockDatabases.active_accounts.find(item => item.vin_padded === vinPadded);
  if (activeMatch) {
    return res.json({
      found: true,
      database: 'active_account',
      gl_code: '1420',
      export_file: 'retail',
      priority: 2,
      stock_number: activeMatch.stock_number,
      details: activeMatch,
      searched_vin: inputVin,
      padded_vin: vinPadded
    });
  }
  
  // Priority 3: Check Wholesale Sold
  const wholesaleSoldMatch = mockDatabases.wholesale_sold.find(item => item.vin_padded === vinPadded);
  if (wholesaleSoldMatch) {
    return res.json({
      found: true,
      database: 'wholesale_sold',
      gl_code: wholesaleSoldMatch.gl_code,
      export_file: 'wholesale',
      priority: 3,
      stock_number: wholesaleSoldMatch.stock_number,
      details: wholesaleSoldMatch,
      searched_vin: inputVin,
      padded_vin: vinPadded
    });
  }
  
  // Priority 3: Check Retail Sold
  const retailSoldMatch = mockDatabases.retail_sold.find(item => item.vin_padded === vinPadded);
  if (retailSoldMatch) {
    return res.json({
      found: true,
      database: 'retail_sold',
      gl_code: '5180.3',
      export_file: 'retail',
      priority: 3,
      stock_number: retailSoldMatch.stock_number,
      details: retailSoldMatch,
      searched_vin: inputVin,
      padded_vin: vinPadded
    });
  }
  
  // No match found
  return res.json({
    found: false,
    searched_vin: inputVin,
    padded_vin: vinPadded,
    message: 'VIN not found in any database'
  });
}

// GL Lookup API - searches all VIN databases with priority logic
app.get('/api/gl-lookup/:vin', async (req, res) => {
  try {
    const inputVin = req.params.vin;
    const vinPadded = padVin(inputVin);
    
    if (!vinPadded) {
      return res.status(400).json({ error: 'Invalid VIN provided' });
    }

    // Try database connection first
    if (pool) {
      try {
        const client = await pool.connect();
        // Database lookup code would go here...
        client.release();
      } catch (dbError) {
        // Fall back to mock mode in development
        if (process.env.NODE_ENV === 'development') {
          return mockGLLookup(inputVin, vinPadded, res);
        }
        throw dbError;
      }
    } else {
      // No pool available, use mock in development
      if (process.env.NODE_ENV === 'development') {
        return mockGLLookup(inputVin, vinPadded, res);
      }
      return res.status(503).json({ error: 'No database connection' });
    }
    
    if (!vinPadded) {
      return res.status(400).json({ error: 'Invalid VIN provided' });
    }
    
    const client = await pool.connect();
    
    console.log(`GL Lookup for VIN: ${inputVin} → Padded: ${vinPadded}`);
    
    // Priority 1: Check Wholesale Inventory (GL: 1400, Wholesale export)
    const wholesaleInventory = await client.query(
      'SELECT stock_number, vin_last_6, uploaded_at FROM wholesale_inventory WHERE vin_padded = $1',
      [vinPadded]
    );
    
    if (wholesaleInventory.rows.length > 0) {
      client.release();
      return res.json({
        found: true,
        database: 'wholesale_inventory',
        gl_code: '1400',
        export_file: 'wholesale',
        priority: 1,
        stock_number: wholesaleInventory.rows[0].stock_number,
        details: wholesaleInventory.rows[0]
      });
    }
    
    // Priority 1: Check Retail Inventory (GL: 1400, Retail export)
    const retailInventory = await client.query(
      'SELECT stock_number, vin_last_6, uploaded_at FROM retail_inventory WHERE vin_padded = $1',
      [vinPadded]
    );
    
    if (retailInventory.rows.length > 0) {
      client.release();
      return res.json({
        found: true,
        database: 'retail_inventory',
        gl_code: '1400',
        export_file: 'retail',
        priority: 1,
        stock_number: retailInventory.rows[0].stock_number,
        details: retailInventory.rows[0]
      });
    }
    
    // Priority 2: Check Active Account (GL: 1420, Retail export)
    const activeAccount = await client.query(
      'SELECT stock_number, full_vin, uploaded_at FROM active_accounts WHERE vin_padded = $1',
      [vinPadded]
    );
    
    if (activeAccount.rows.length > 0) {
      client.release();
      return res.json({
        found: true,
        database: 'active_account',
        gl_code: '1420',
        export_file: 'retail',
        priority: 2,
        stock_number: activeAccount.rows[0].stock_number,
        details: activeAccount.rows[0]
      });
    }
    
    // Priority 3: Check Sold databases - get most recent
    const retailSold = await client.query(
      'SELECT stock_number, date_sold, uploaded_at FROM retail_sold WHERE vin_padded = $1 ORDER BY date_sold DESC LIMIT 1',
      [vinPadded]
    );
    
    const wholesaleSold = await client.query(
      'SELECT stock_number, location, date_sold, gl_code, uploaded_at FROM wholesale_sold WHERE vin_padded = $1 ORDER BY date_sold DESC LIMIT 1',
      [vinPadded]
    );
    
    // Compare dates if both exist
    let mostRecentSold = null;
    if (retailSold.rows.length > 0 && wholesaleSold.rows.length > 0) {
      const retailDate = new Date(retailSold.rows[0].date_sold);
      const wholesaleDate = new Date(wholesaleSold.rows[0].date_sold);
      
      if (retailDate >= wholesaleDate) {
        mostRecentSold = {
          database: 'retail_sold',
          gl_code: '5180.3',
          export_file: 'retail',
          details: retailSold.rows[0]
        };
      } else {
        mostRecentSold = {
          database: 'wholesale_sold',
          gl_code: wholesaleSold.rows[0].gl_code,
          export_file: 'wholesale',
          details: wholesaleSold.rows[0]
        };
      }
    } else if (retailSold.rows.length > 0) {
      mostRecentSold = {
        database: 'retail_sold',
        gl_code: '5180.3',
        export_file: 'retail',
        details: retailSold.rows[0]
      };
    } else if (wholesaleSold.rows.length > 0) {
      mostRecentSold = {
        database: 'wholesale_sold',
        gl_code: wholesaleSold.rows[0].gl_code,
        export_file: 'wholesale',
        details: wholesaleSold.rows[0]
      };
    }
    
    client.release();
    
    if (mostRecentSold) {
      return res.json({
        found: true,
        database: mostRecentSold.database,
        gl_code: mostRecentSold.gl_code,
        export_file: mostRecentSold.export_file,
        priority: 3,
        stock_number: mostRecentSold.details.stock_number,
        details: mostRecentSold.details
      });
    }
    
    // No match found
    res.json({
      found: false,
      searched_vin: inputVin,
      padded_vin: vinPadded,
      message: 'VIN not found in any database'
    });
    
  } catch (error) {
    console.error('Error in GL lookup:', error);
    res.status(500).json({ error: 'GL lookup failed', details: error.message });
  }
});

// CSV Upload endpoints for each database
app.post('/api/upload-csv/:database', upload.single('csvFile'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No CSV file provided' });
    }

    const databaseType = req.params.database;
    const validDatabases = ['wholesale_inventory', 'retail_inventory', 'active_accounts', 'retail_sold', 'wholesale_sold'];
    
    if (!validDatabases.includes(databaseType)) {
      return res.status(400).json({ error: 'Invalid database type' });
    }

    // Check for database connection first
    if (!pool) {
      // If no database, use mock mode
      console.log(`Mock CSV upload for ${databaseType}: ${req.file.originalname} (No DB connection)`);
      return res.json({ 
        success: true, 
        message: `Mock upload successful for ${databaseType} (Database not connected)`,
        filename: req.file.originalname,
        records: Math.floor(Math.random() * 100) + 1,
        mock: true
      });
    }

    // Try to connect to database and process CSV
    try {
      const client = await pool.connect();
      
      // Parse CSV data
      const csvData = req.file.buffer.toString();
      const records = parseCSVForDatabase(csvData, databaseType);
      
      if (records.length === 0) {
        client.release();
        return res.status(400).json({ 
          error: 'No valid records found in CSV',
          message: 'Please check CSV format and headers'
        });
      }
      
      // Update database with records
      await updateDatabaseWithRecords(client, databaseType, records);
      client.release();
      
      console.log(`CSV upload successful for ${databaseType}: ${req.file.originalname} (${records.length} records)`);
      return res.json({ 
        success: true, 
        message: `Successfully uploaded ${records.length} records to ${databaseType}`,
        filename: req.file.originalname,
        records: records.length,
        mock: false
      });
    } catch (dbError) {
      // Database connection failed, fall back to mock
      console.log(`Mock CSV upload for ${databaseType}: ${req.file.originalname} (DB error: ${dbError.message})`);
      return res.json({ 
        success: true, 
        message: `Mock upload successful for ${databaseType} (Database offline)`,
        filename: req.file.originalname,
        records: Math.floor(Math.random() * 100) + 1,
        mock: true,
        dbStatus: 'offline'
      });
    }

    // Parse CSV and update database - NOT IMPLEMENTED YET
    // This would parse actual CSV data when database is connected
    // For now, returns mock success
    
    res.json({ 
      success: true, 
      message: `Upload queued for ${databaseType} (Feature in development)`,
      records: 0,
      mock: true 
    });

  } catch (error) {
    console.error('CSV upload failed:', error);
    res.status(500).json({ 
      error: 'CSV upload failed', 
      details: error.message 
    });
  }
});

// Get database record counts with last upload timestamps
app.get('/api/database-counts', async (req, res) => {
  try {
    if (!pool) {
      // Return mock counts when no database
      return res.json({
        wholesale_inventory: { count: 0, lastUpload: null },
        retail_inventory: { count: 0, lastUpload: null }, 
        active_accounts: { count: 0, lastUpload: null },
        retail_sold: { count: 0, lastUpload: null },
        wholesale_sold: { count: 0, lastUpload: null }
      });
    }

    const client = await pool.connect();
    const results = {};
    
    const databases = ['wholesale_inventory', 'retail_inventory', 'active_accounts', 'retail_sold', 'wholesale_sold'];
    
    for (const db of databases) {
      try {
        const countResult = await client.query(`SELECT COUNT(*) as count FROM ${db}`);
        const timestampResult = await client.query(`SELECT MAX(uploaded_at) as last_upload FROM ${db}`);
        
        results[db] = {
          count: parseInt(countResult.rows[0].count),
          lastUpload: timestampResult.rows[0].last_upload
        };
      } catch (err) {
        results[db] = { count: 0, lastUpload: null }; // Default if table doesn't exist
      }
    }
    
    client.release();
    res.json(results);

  } catch (error) {
    console.error('Failed to get database counts:', error);
    // Return zeros on error
    res.json({
      wholesale_inventory: { count: 0, lastUpload: null },
      retail_inventory: { count: 0, lastUpload: null }, 
      active_accounts: { count: 0, lastUpload: null },
      retail_sold: { count: 0, lastUpload: null },
      wholesale_sold: { count: 0, lastUpload: null }
    });
  }
});

// Clear all VIN databases - requires confirmation
app.post('/api/clear-vin-databases', async (req, res) => {
  try {
    const { confirmToken } = req.body;
    
    // Require confirmation token
    if (confirmToken !== 'CLEAR_ALL_VIN_DATA') {
      return res.status(400).json({ 
        error: 'Confirmation required', 
        message: 'Send confirmToken: "CLEAR_ALL_VIN_DATA" to proceed' 
      });
    }

    if (!pool) {
      return res.status(503).json({ error: 'No database connection' });
    }

    const client = await pool.connect();
    
    try {
      // Clear all VIN database tables
      await client.query('DELETE FROM wholesale_inventory');
      await client.query('DELETE FROM retail_inventory');
      await client.query('DELETE FROM active_accounts');
      await client.query('DELETE FROM retail_sold');
      await client.query('DELETE FROM wholesale_sold');
      
      console.log('All VIN databases cleared successfully');
      
      client.release();
      res.json({ 
        success: true, 
        message: 'All VIN databases cleared successfully' 
      });
    } catch (error) {
      client.release();
      throw error;
    }

  } catch (error) {
    console.error('Failed to clear VIN databases:', error);
    res.status(500).json({ 
      error: 'Failed to clear databases', 
      details: error.message 
    });
  }
});

// Load sample data from CSV files into VIN databases
app.get('/api/load-sample-vin-data', async (req, res) => {
  try {
    if (!pool) {
      return res.status(503).json({ error: 'No database connection' });
    }
    
    const client = await pool.connect();
    
    console.log('Loading sample VIN data from CSV files...');
    
    // Clear existing data
    await client.query('DELETE FROM wholesale_inventory');
    await client.query('DELETE FROM retail_inventory');  
    await client.query('DELETE FROM active_accounts');
    await client.query('DELETE FROM retail_sold');
    await client.query('DELETE FROM wholesale_sold');
    
    // 1. Load Wholesale Inventory
    console.log('Loading Wholesale Inventory...');
    const wholesaleInventoryData = [
      { stock: '11650', vin: '231614' },
      { stock: '11753', vin: '126487' },
      { stock: '11816', vin: '113055' },
      { stock: '11867', vin: '318881' },
      { stock: '12043', vin: '167042' },
      { stock: '12220', vin: '111677' },
      { stock: '12346', vin: '614823' },
      { stock: '12390', vin: '150741' },
      { stock: '12418', vin: '139431' }
    ];
    
    for (const item of wholesaleInventoryData) {
      const vinPadded = padVin(item.vin);
      await client.query(`
        INSERT INTO wholesale_inventory (stock_number, vin_last_6, vin_padded)
        VALUES ($1, $2, $3)
      `, [item.stock, item.vin, vinPadded]);
    }
    
    // 2. Load Retail Inventory  
    console.log('Loading Retail Inventory...');
    const retailInventoryData = [
      { stock: '3361', vin: 'A85255' },
      { stock: '6454R', vin: '206190' },
      { stock: '5637R', vin: '368259' },
      { stock: '5810R', vin: '136507' },
      { stock: '6041', vin: '200251' },
      { stock: '5854R', vin: '139513' },
      { stock: '6729', vin: 'A91656' },
      { stock: '6119R', vin: '118051' },
      { stock: '6260R', vin: '215120' }
    ];
    
    for (const item of retailInventoryData) {
      const vinPadded = padVin(item.vin);
      await client.query(`
        INSERT INTO retail_inventory (stock_number, vin_last_6, vin_padded)
        VALUES ($1, $2, $3)
      `, [item.stock, item.vin, vinPadded]);
    }
    
    // 3. Load Active Accounts
    console.log('Loading Active Accounts...');
    const activeAccountsData = [
      { stock: '10056', fullVin: '1N6AD0ER7EN721441' },
      { stock: '10080', fullVin: 'JHLRE38387C078501' },
      { stock: '10156', fullVin: '3FA6P0LU5KR274615' },
      { stock: '10157', fullVin: 'JTHBL46F875016896' },
      { stock: '10246', fullVin: '1C4NJCBA2ED843563' },
      { stock: '10273', fullVin: '2C3CDXBG4FH812995' },
      { stock: '10278', fullVin: 'JHLRD68463C004484' },
      { stock: '10281', fullVin: 'JTMWFREV9GJ073969' },
      { stock: '102CC', fullVin: '1G1ZE5ST9GF334752' }
    ];
    
    for (const item of activeAccountsData) {
      const vinLast6 = item.fullVin.slice(-6);
      const vinPadded = padVin(vinLast6);
      await client.query(`
        INSERT INTO active_accounts (stock_number, full_vin, vin_last_6, vin_padded)
        VALUES ($1, $2, $3, $4)
      `, [item.stock, item.fullVin, vinLast6, vinPadded]);
    }
    
    // 4. Load Retail Sold
    console.log('Loading Retail Sold...');
    const retailSoldData = [
      { stock: '7675R', dateSold: '2025-07-14', vin: '353864' },
      { stock: '12192A', dateSold: '2025-07-15', vin: '592182' },
      { stock: '7728R', dateSold: '2025-07-15', vin: '044111' },
      { stock: '12267A', dateSold: '2025-07-16', vin: '126893' },
      { stock: '7665R', dateSold: '2025-07-17', vin: '703660' },
      { stock: '7712r', dateSold: '2025-07-17', vin: '034092' },
      { stock: '7714R', dateSold: '2025-07-17', vin: '215441' },
      { stock: '7717R', dateSold: '2025-07-17', vin: '156566' },
      { stock: '7719R', dateSold: '2025-07-17', vin: '158980' }
    ];
    
    for (const item of retailSoldData) {
      const vinPadded = padVin(item.vin);
      await client.query(`
        INSERT INTO retail_sold (stock_number, date_sold, vin_last_6, vin_padded)
        VALUES ($1, $2, $3, $4)
      `, [item.stock, item.dateSold, item.vin, vinPadded]);
    }
    
    // 5. Load Wholesale Sold
    console.log('Loading Wholesale Sold...');
    const wholesaleSoldData = [
      { stock: '13182', location: 'OB WHOLESALE', dateSold: '2025-07-15', vin: 'A45302', glCode: '5180.7' },
      { stock: '13183', location: 'CVILLE WHOLESALE', dateSold: '2025-07-15', vin: '107278', glCode: '5180.9' },
      { stock: '13263', location: 'OB WHOLESALE', dateSold: '2025-07-15', vin: '501248', glCode: '5180.7' },
      { stock: '970CC', location: 'CVILLE WHOLESALE', dateSold: '2025-07-15', vin: '213624', glCode: '5180.9' },
      { stock: '13303', location: 'OB WHOLESALE', dateSold: '2025-07-15', vin: '010363', glCode: '5180.7' },
      { stock: '13124', location: 'OB WHOLESALE', dateSold: '2025-07-16', vin: '319905', glCode: '5180.7' },
      { stock: '13143', location: 'CVILLE WHOLESALE', dateSold: '2025-07-17', vin: '522263', glCode: '5180.9' },
      { stock: '13147', location: 'CVILLE WHOLESALE', dateSold: '2025-07-17', vin: '327815', glCode: '5180.9' },
      { stock: '13185', location: 'RENTAL', dateSold: '2025-07-17', vin: '204899', glCode: '5180.8' }
    ];
    
    for (const item of wholesaleSoldData) {
      const vinPadded = padVin(item.vin);
      await client.query(`
        INSERT INTO wholesale_sold (stock_number, location, date_sold, vin_last_6, vin_padded, gl_code)
        VALUES ($1, $2, $3, $4, $5, $6)
      `, [item.stock, item.location, item.dateSold, item.vin, vinPadded, item.glCode]);
    }
    
    // Get counts
    const counts = {
      wholesale_inventory: (await client.query('SELECT COUNT(*) as count FROM wholesale_inventory')).rows[0].count,
      retail_inventory: (await client.query('SELECT COUNT(*) as count FROM retail_inventory')).rows[0].count,
      active_accounts: (await client.query('SELECT COUNT(*) as count FROM active_accounts')).rows[0].count,
      retail_sold: (await client.query('SELECT COUNT(*) as count FROM retail_sold')).rows[0].count,
      wholesale_sold: (await client.query('SELECT COUNT(*) as count FROM wholesale_sold')).rows[0].count
    };
    
    client.release();
    
    console.log('Sample VIN data loaded successfully:', counts);
    res.json({ 
      status: 'Sample VIN data loaded successfully',
      counts: counts,
      message: 'Ready for GL testing with real CSV data'
    });
  } catch (error) {
    console.error('Error loading sample VIN data:', error);
    res.status(500).json({ error: 'Failed to load sample VIN data', details: error.message });
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