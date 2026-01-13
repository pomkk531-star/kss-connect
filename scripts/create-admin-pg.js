/**
 * สคริปต์สร้างแอดมิน PostgreSQL
 * รันด้วย: node scripts/create-admin-pg.js <username> <password>
 * ตัวอย่าง: node scripts/create-admin-pg.js admin admin123
 */

const { Pool } = require('pg');
const bcrypt = require('bcryptjs');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres.vfjhlezyupshnozthsja:0967731558bestza@aws-1-ap-south-1.pooler.supabase.com:6543/postgres',
});

const [username, password] = process.argv.slice(2);

if (!username || !password) {
  console.error('❌ กรุณาระบุ username และ password');
  console.log('📝 วิธีใช้: node scripts/create-admin-pg.js <username> <password>');
  console.log('📝 ตัวอย่าง: node scripts/create-admin-pg.js admin admin123');
  process.exit(1);
}

async function createAdmin() {
  try {
    // ตรวจสอบว่ามี username นี้แล้วหรือไม่
    const existing = await pool.query('SELECT id FROM admins WHERE username = $1', [username]);
    
    if (existing.rows.length > 0) {
      console.error(`❌ มี username "${username}" อยู่แล้ว`);
      process.exit(1);
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);

    // Insert admin
    const result = await pool.query(
      'INSERT INTO admins (username, password_hash, created_at) VALUES ($1, $2, NOW()) RETURNING id, username, created_at',
      [username, passwordHash]
    );

    console.log('✅ สร้างแอดมินสำเร็จ!');
    console.log('👤 Username:', result.rows[0].username);
    console.log('🔑 Password:', password);
    console.log('📅 สร้างเมื่อ:', result.rows[0].created_at);
    
    await pool.end();
    process.exit(0);
  } catch (error) {
    console.error('❌ เกิดข้อผิดพลาด:', error.message);
    await pool.end();
    process.exit(1);
  }
}

createAdmin();
