import postgres from 'postgres';
import dotenv from 'dotenv';

dotenv.config();

async function testConnection() {
  console.log('Testing Supabase connection...');
  
  if (!process.env.DATABASE_URL) {
    console.error('❌ DATABASE_URL is not set in environment variables');
    return;
  }
  
  console.log('✓ DATABASE_URL is set');
  console.log('Connection string starts with:', process.env.DATABASE_URL.substring(0, 30) + '...');
  
  try {
    const sql = postgres(process.env.DATABASE_URL, {
      ssl: { rejectUnauthorized: false }
    });
    
    // Test basic connection
    const result = await sql`SELECT NOW() as current_time, version() as pg_version`;
    console.log('✅ Successfully connected to Supabase!');
    console.log('Current time:', result[0].current_time);
    console.log('PostgreSQL version:', result[0].pg_version);
    
    // Check if tables exist
    const tables = await sql`
      SELECT tablename 
      FROM pg_tables 
      WHERE schemaname = 'public'
      LIMIT 5
    `;
    console.log('\nTables found:', tables.map(t => t.tablename).join(', '));
    
    await sql.end();
    console.log('\n✅ Database connection test completed successfully!');
  } catch (error) {
    console.error('❌ Failed to connect to database:', error.message);
    console.error('Make sure your DATABASE_URL is correct and Supabase is accessible');
  }
}

testConnection();