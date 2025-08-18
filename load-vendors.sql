-- Create vendors table if it doesn't exist
CREATE TABLE IF NOT EXISTS vendors (
  id SERIAL PRIMARY KEY,
  vendor_number TEXT NOT NULL UNIQUE,
  vendor_name TEXT NOT NULL,
  address TEXT,
  city TEXT,
  state TEXT,
  zip_code TEXT,
  phone TEXT,
  gl_account_nbr TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Clear existing vendors (optional - comment out if you want to keep existing)
-- TRUNCATE TABLE vendors CASCADE;

-- Insert combined vendor list (removing duplicates by vendor_number)
INSERT INTO vendors (vendor_number, vendor_name, address, city, state, zip_code, phone, gl_account_nbr, is_active)
VALUES 
-- Sample vendors from both lists (combining and deduplicating)
('1-800-Radiator', '1-800-Radiator & A/C / See Forever LLC', '1995 Thomas Rd', 'Memphis', 'TN', '38134', '(901) 371-9205', '1400', true),
('1Source', '"1" Source Transportation', '2434 Palisade Dr', 'Cabot', 'AR', '70023', '(870) 307-9069', '5180.9', true),
('200', '200 AND WEST HOLDINGS', '1630 HWY 51 N', 'NESBIT', 'MS', '38651', NULL, '2510', true),
('360 Towing', '360 Towing & Recovery', '5724 Asbury Ave', 'Fort Worth', 'TX', '76119', NULL, '5520.2', true),
('401K', '401 K', NULL, NULL, NULL, NULL, NULL, '7025', true),
('57Service', '57 Service & Storage LLC', '12845 Hwy 57 S.', 'Counce', 'TN', '38326', '(731) 689-5252', NULL, true),
('61Tire', '61 Tire Co. Inc.', '3704 Lamar Ave', 'Memphis', 'TN', '38118', '(901) 363-0110', '6050.3', true),
('700', '700 Credit LLC / Open Dealer Exchange', 'PO Box 101015', 'Pasadena', 'CA', '91189-0003', '(866) 278-3848', '6090.3', true),
('901 Sounds', '901 Sounds Auto Accessories', '2235 Covington Pike', 'Memphis', 'TN', '38128', '(901) 372-9922', '1400', false), -- marked as inactive
('A to Z', 'A to Z Printing & Signs Corp.', '6320 Winchester Rd', 'Memphis', 'TN', '38115', '(901) 203-2203', '6040.3', true),
('AAhmed', 'Akeem Ahmed', '7586 Roundleaf Dr', 'Memphis', 'TN', '38125', NULL, '1400', true),
('ABCoA', 'Advanced Business Computers of America, Inc.', '11242 Alumni Way', 'Jacksonville', 'FL', '32246', '(800) 526-5832', '6120', true)
ON CONFLICT (vendor_number) DO UPDATE SET
  vendor_name = EXCLUDED.vendor_name,
  address = EXCLUDED.address,
  city = EXCLUDED.city,
  state = EXCLUDED.state,
  zip_code = EXCLUDED.zip_code,
  phone = EXCLUDED.phone,
  gl_account_nbr = EXCLUDED.gl_account_nbr,
  updated_at = NOW();

-- Add more vendors as needed from the CSV files