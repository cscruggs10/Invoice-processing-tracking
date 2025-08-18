// All unique vendors from CSV files (754 total)
import fs from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Read the vendor data
const vendorData = JSON.parse(fs.readFileSync(path.join(__dirname, 'all-vendors.json'), 'utf8'));

export const getAllVendors = () => vendorData;

export const getVendorInsertSQL = () => {
  const values = vendorData.map(v => {
    const vendorName = v.vendor_name.replace(/'/g, "''");
    return `('${v.vendor_number}', '${vendorName}', true)`;
  });
  
  // Split into chunks to avoid SQL length issues
  const chunks = [];
  const chunkSize = 100;
  for (let i = 0; i < values.length; i += chunkSize) {
    chunks.push(values.slice(i, i + chunkSize));
  }
  
  return chunks;
};