import fs from 'fs';

// Read the CSV files
const salesVendors = fs.readFileSync('/Users/coreyscruggs/Downloads/Sales Vendor List.xlsx - Q_Default (1).csv', 'utf8');
const wholesaleVendors = fs.readFileSync('/Users/coreyscruggs/Downloads/wholesale vendor list.xlsx - Q_Default.csv', 'utf8');

// Parse CSV manually (simple approach for these files)
function parseCSV(content) {
  const lines = content.split('\n');
  const headers = lines[0].split(',');
  const vendors = [];
  
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    
    // Handle quoted values and commas within quotes
    const values = [];
    let current = '';
    let inQuotes = false;
    
    for (let j = 0; j < line.length; j++) {
      const char = line[j];
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        values.push(current);
        current = '';
      } else {
        current += char;
      }
    }
    values.push(current); // Add last value
    
    // Extract vendor_number (column A) and vendor_name (column B)
    if (values[0] && values[1]) {
      vendors.push({
        vendor_number: values[0].trim(),
        vendor_name: values[1].trim().replace(/^"|"$/g, '') // Remove surrounding quotes
      });
    }
  }
  
  return vendors;
}

// Parse both files
const salesData = parseCSV(salesVendors);
const wholesaleData = parseCSV(wholesaleVendors);

console.log(`Sales vendors: ${salesData.length}`);
console.log(`Wholesale vendors: ${wholesaleData.length}`);

// Combine and deduplicate by vendor_number (column A)
const vendorMap = new Map();

// Process all vendors - first occurrence wins
[...salesData, ...wholesaleData].forEach(vendor => {
  if (vendor.vendor_number && vendor.vendor_name && !vendorMap.has(vendor.vendor_number)) {
    vendorMap.set(vendor.vendor_number, vendor);
  }
});

const uniqueVendors = Array.from(vendorMap.values());
console.log(`Unique vendors after deduplication: ${uniqueVendors.length}`);

// Generate SQL INSERT statement
const sqlValues = uniqueVendors.map(v => {
  // Escape single quotes in vendor names
  const vendorName = v.vendor_name.replace(/'/g, "''");
  return `('${v.vendor_number}', '${vendorName}', true)`;
});

// Split into chunks to avoid SQL too long
const chunkSize = 100;
const chunks = [];
for (let i = 0; i < sqlValues.length; i += chunkSize) {
  chunks.push(sqlValues.slice(i, i + chunkSize));
}

// Create SQL file with all vendors
let fullSQL = `-- Clear and insert all unique vendors from CSV files
-- Total unique vendors: ${uniqueVendors.length}

-- Create table if not exists
CREATE TABLE IF NOT EXISTS vendors (
  id SERIAL PRIMARY KEY,
  vendor_number TEXT NOT NULL UNIQUE,
  vendor_name TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Clear existing vendors (optional - comment out to keep existing)
-- TRUNCATE TABLE vendors CASCADE;

`;

// Add INSERT statements in chunks
chunks.forEach((chunk, index) => {
  fullSQL += `
-- Chunk ${index + 1} of ${chunks.length}
INSERT INTO vendors (vendor_number, vendor_name, is_active)
VALUES 
${chunk.join(',\n')}
ON CONFLICT (vendor_number) DO UPDATE SET
  vendor_name = EXCLUDED.vendor_name,
  updated_at = NOW();
`;
});

// Write SQL file
fs.writeFileSync('/Users/coreyscruggs/projects/InvoiceTracker/all-vendors.sql', fullSQL);
console.log('SQL written to all-vendors.sql');

// Also create a JSON file for reference
fs.writeFileSync('/Users/coreyscruggs/projects/InvoiceTracker/all-vendors.json', JSON.stringify(uniqueVendors, null, 2));
console.log('JSON written to all-vendors.json');

// Show some sample vendors
console.log('\nSample vendors:');
uniqueVendors.slice(0, 5).forEach(v => {
  console.log(`  ${v.vendor_number}: ${v.vendor_name}`);
});