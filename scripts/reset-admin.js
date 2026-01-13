const { Pool } = require('pg');
const bcrypt = require('bcryptjs');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres.vfjhlezyupshnozthsja:0967731558bestza@aws-1-ap-south-1.pooler.supabase.com:6543/postgres',
});

async function resetAdmin() {
  try {
    // ลบ admin เก่า
    await pool.query("DELETE FROM admins WHERE username = 'admin'");
    console.log('✅ ลบ admin เก่าแล้ว');

    // สร้าง admin ใหม่
    const passwordHash = await bcrypt.hash('admin123', 10);
    const result = await pool.query(
      'INSERT INTO admins (username, password_hash, created_at) VALUES ($1, $2, NOW()) RETURNING id, username',
      ['admin', passwordHash]
    );

    console.log('✅ สร้าง admin ใหม่สำเร็จ!');
    console.log('👤 Username: admin');
    console.log('🔑 Password: admin123');
    
    await pool.end();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    await pool.end();
    process.exit(1);
  }
}

resetAdmin();
