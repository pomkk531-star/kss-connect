const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, '..', 'data', 'kss.db');
const db = new Database(dbPath);

try {
  const teachers = db.prepare('SELECT * FROM teachers ORDER BY id').all();

  console.log('\n📋 รายชื่อครูทั้งหมด');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  if (teachers.length === 0) {
    console.log('ยังไม่มีบัญชีครู\n');
  } else {
    teachers.forEach((teacher, index) => {
      console.log(`${index + 1}. ID: ${teacher.id}`);
      console.log(`   ชื่อผู้ใช้: ${teacher.username}`);
      console.log(`   ชื่อ-นามสกุล: ${teacher.full_name}`);
      console.log(`   สร้างเมื่อ: ${teacher.created_at}`);
      console.log('');
    });
    console.log(`รวมทั้งหมด: ${teachers.length} คน\n`);
  }
} catch (err) {
  console.error('❌ เกิดข้อผิดพลาด:', err.message);
} finally {
  db.close();
}
