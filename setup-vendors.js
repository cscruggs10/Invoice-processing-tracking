// Script to load all vendors from CSV files
// Run this after the vendor table is created

const fs = require('fs');
const csv = require('csv-parse/sync');
const pg = require('pg');

// Read and parse vendor CSV files
function loadVendors() {
  const salesVendors = fs.readFileSync('/Users/coreyscruggs/Downloads/Sales Vendor List.xlsx - Q_Default (1).csv', 'utf8');
  const wholesaleVendors = fs.readFileSync('/Users/coreyscruggs/Downloads/wholesale vendor list.xlsx - Q_Default.csv', 'utf8');
  
  const salesData = csv.parse(salesVendors, { columns: true });
  const wholesaleData = csv.parse(wholesaleVendors, { columns: true });
  
  // Combine and deduplicate by VendorNbr
  const vendorMap = new Map();
  
  // Process all vendors
  [...salesData, ...wholesaleData].forEach(vendor => {
    if (vendor.VendorNbr && vendor.PurchasedFrom) {
      // Use the first occurrence of each vendor
      if (!vendorMap.has(vendor.VendorNbr)) {
        vendorMap.set(vendor.VendorNbr, {
          vendor_number: vendor.VendorNbr,
          vendor_name: vendor.PurchasedFrom,
          address: vendor.Address || null,
          city: vendor.City || null,
          state: vendor.State || null,
          zip_code: vendor.ZipCode || null,
          phone: vendor.PhoneNbr || null,
          gl_account_nbr: vendor.GLAccountNbr || null,
          is_active: vendor.ActiveInactive !== 'Y' && !vendor.Comments?.includes('inactive') ? true : false
        });
      }
    }
  });
  
  return Array.from(vendorMap.values());
}

// Export for use in other scripts
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { loadVendors };
}

// Create SQL insert statements
const vendors = loadVendors();
console.log(`Found ${vendors.length} unique vendors`);

// Generate SQL
const sql = vendors.map(v => {
  const values = [
    v.vendor_number,
    v.vendor_name.replace(/'/g, "''"), // Escape single quotes
    v.address ? `'${v.address.replace(/'/g, "''")}'` : 'NULL',
    v.city ? `'${v.city.replace(/'/g, "''")}'` : 'NULL',
    v.state ? `'${v.state}'` : 'NULL',
    v.zip_code ? `'${v.zip_code}'` : 'NULL',
    v.phone ? `'${v.phone}'` : 'NULL',
    v.gl_account_nbr ? `'${v.gl_account_nbr}'` : 'NULL',
    v.is_active
  ];
  
  return `('${values[0]}', '${values[1]}', ${values[2]}, ${values[3]}, ${values[4]}, ${values[5]}, ${values[6]}, ${values[7]}, ${values[8]})`;
}).join(',\n');

const fullSQL = `
-- Insert all vendors from CSV files
INSERT INTO vendors (vendor_number, vendor_name, address, city, state, zip_code, phone, gl_account_nbr, is_active)
VALUES 
${sql}
ON CONFLICT (vendor_number) DO UPDATE SET
  vendor_name = EXCLUDED.vendor_name,
  address = EXCLUDED.address,
  city = EXCLUDED.city,
  state = EXCLUDED.state,
  zip_code = EXCLUDED.zip_code,
  phone = EXCLUDED.phone,
  gl_account_nbr = EXCLUDED.gl_account_nbr,
  is_active = EXCLUDED.is_active,
  updated_at = NOW();
`;

// Write to file
fs.writeFileSync('/Users/coreyscruggs/projects/InvoiceTracker/vendor-insert.sql', fullSQL);
console.log('SQL written to vendor-insert.sql');