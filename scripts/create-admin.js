/**
 * สคริปต์สร้างแอดมิน
 * รันด้วย: node scripts/create-admin.js <username> <password>
 * ตัวอย่าง: node scripts/create-admin.js admin admin123
 */

const Database = require('better-sqlite3');
const bcrypt = require('bcryptjs');
const path = require('path');

const dbPath = path.join(process.cwd(), 'data', 'kss.db');
const db = new Database(dbPath);

const [username, password] = process.argv.slice(2);

if (!username || !password) {
  console.error('❌ กรุณาระบุ username และ password');
  console.log('📝 วิธีใช้: node scripts/create-admin.js <username> <password>');
  console.log('📝 ตัวอย่าง: node scripts/create-admin.js admin admin123');
  process.exit(1);
}

async function createAdmin() {
  try {
    // ตรวจสอบว่ามี username นี้แล้วหรือไม่
    const existing = db.prepare('SELECT id FROM admins WHERE username = ?').get(username);
    
    if (existing) {
      console.error(`❌ มี username "${username}" อยู่แล้ว`);
      process.exit(1);
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);
    const createdAt = new Date().toISOString();

    // Insert admin
    const stmt = db.prepare(
      'INSERT INTO admins (username, password_hash, created_at) VALUES (?, ?, ?)'
    );
    const info = stmt.run(username, passwordHash, createdAt);

    console.log('✅ สร้างแอดมินสำเร็จ!');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`👤 Username: ${username}`);
    console.log(`🔑 Password: ${password}`);
    console.log(`🆔 Admin ID: ${info.lastInsertRowid}`);
    console.log(`📅 Created: ${new Date(createdAt).toLocaleString('th-TH')}`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('💡 สามารถ login ได้ที่หน้าหลัก (ใส่ username ในช่อง "ชื่อ")');
    
  } catch (error) {
    console.error('❌ เกิดข้อผิดพลาด:', error.message);
    process.exit(1);
  } finally {
    db.close();
  }
}

createAdmin();
