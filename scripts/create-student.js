const Database = require('better-sqlite3');
const bcrypt = require('bcryptjs');
const path = require('path');

const dbPath = path.join(__dirname, '..', 'data', 'kss.db');
const db = new Database(dbPath);

async function createStudent(firstName, lastName, classCode, password) {
  try {
    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);

    // Insert student
    const stmt = db.prepare(`
      INSERT INTO users (first_name, last_name, class_code, password_hash, created_at)
      VALUES (?, ?, ?, ?, datetime('now'))
    `);

    const result = stmt.run(firstName, lastName, classCode, passwordHash);

    console.log('\n✅ สร้างนักเรียนสำเร็จ!');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`ID: ${result.lastInsertRowid}`);
    console.log(`ชื่อ: ${firstName}`);
    console.log(`นามสกุล: ${lastName}`);
    console.log(`ห้องเรียน: ${classCode}`);
    console.log(`รหัสผ่าน: ${password}`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  } catch (err) {
    if (err.message.includes('UNIQUE constraint')) {
      console.error('❌ มีนักเรียนนี้อยู่แล้ว');
    } else {
      console.error('❌ เกิดข้อผิดพลาด:', err.message);
    }
  } finally {
    db.close();
  }
}

// Get arguments from command line
const args = process.argv.slice(2);

if (args.length < 4) {
  console.log('\nวิธีใช้งาน:');
  console.log('node create-student.js <ชื่อ> <นามสกุล> <ห้องเรียน> <รหัสผ่าน>\n');
  console.log('ตัวอย่าง:');
  console.log('node create-student.js สมชาย ใจดี ม.1/1 password123\n');
  console.log('ห้องเรียนที่ใช้ได้:');
  console.log('ม.1/1 ถึง ม.1/5, ม.2/1 ถึง ม.2/5, ม.3/1 ถึง ม.3/5');
  console.log('ม.4/1 ถึง ม.4/4, ม.5/1 ถึง ม.5/4, ม.6/1 ถึง ม.6/4\n');
  process.exit(1);
}

const [firstName, lastName, classCode, password] = args;

// Validate class code
const validClasses = [];
for (let grade = 1; grade <= 6; grade++) {
  const maxRoom = grade <= 3 ? 5 : 4;
  for (let room = 1; room <= maxRoom; room++) {
    validClasses.push(`ม.${grade}/${room}`);
  }
}

if (!validClasses.includes(classCode)) {
  console.error('❌ ห้องเรียนไม่ถูกต้อง');
  console.error('ห้องเรียนที่ใช้ได้:', validClasses.join(', '));
  process.exit(1);
}

createStudent(firstName, lastName, classCode, password);
