/**
 * สคริปต์แสดงรายการแอดมินทั้งหมด
 * รันด้วย: node scripts/list-admins.js
 */

const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(process.cwd(), 'data', 'kss.db');
const db = new Database(dbPath);

try {
  const admins = db.prepare('SELECT id, username, created_at FROM admins ORDER BY id ASC').all();

  if (admins.length === 0) {
    console.log('⚠️  ยังไม่มีแอดมินในระบบ');
    console.log('💡 สร้างแอดมินด้วย: node scripts/create-admin.js <username> <password>');
  } else {
    console.log('📋 รายการแอดมินทั้งหมด');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    admins.forEach((admin) => {
      console.log(`🆔 ID: ${admin.id}`);
      console.log(`👤 Username: ${admin.username}`);
      console.log(`📅 Created: ${new Date(admin.created_at).toLocaleString('th-TH')}`);
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    });
    console.log(`✅ รวม ${admins.length} แอดมิน`);
  }
} catch (error) {
  console.error('❌ เกิดข้อผิดพลาด:', error.message);
  process.exit(1);
} finally {
  db.close();
}
