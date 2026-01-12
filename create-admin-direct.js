/**
 * สคริปต์สร้างแอดมินแบบไม่ต้องรัน script
 * เพียงแค่ copy code นี้และวางใน browser console ที่หน้า http://localhost:3000
 */

// สร้างแอดมินโดยตรงผ่าน API
async function createAdminDirect(username, password) {
  try {
    const bcrypt = require('bcryptjs');
    const Database = require('better-sqlite3');
    const path = require('path');
    
    const dbPath = path.join(process.cwd(), 'data', 'kss.db');
    const db = new Database(dbPath);
    
    // ตรวจสอบว่ามี username นี้แล้วหรือไม่
    const existing = db.prepare('SELECT id FROM admins WHERE username = ?').get(username);
    
    if (existing) {
      console.error(`❌ มี username "${username}" อยู่แล้ว`);
      db.close();
      return;
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
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    db.close();
  } catch (error) {
    console.error('❌ เกิดข้อผิดพลาด:', error.message);
  }
}

// เรียกใช้งาน
createAdminDirect('admin', 'admin123');
