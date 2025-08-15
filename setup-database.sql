-- Create invoices table for Railway PostgreSQL
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
);

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(status);
CREATE INDEX IF NOT EXISTS idx_invoices_created_at ON invoices(created_at DESC);

-- Insert a test record to verify everything works
INSERT INTO invoices (
  invoice_number, vendor_name, vendor_number, 
  invoice_date, invoice_amount, due_date, 
  vin, invoice_type, description, status, uploaded_by
) VALUES (
  'TEST-001', 'Test Vendor', 'TV001',
  NOW(), 100.00, NOW() + INTERVAL '30 days',
  'TEST123', 'Parts', 'Test invoice for Railway setup',
  'pending_entry', 1
) ON CONFLICT DO NOTHING;