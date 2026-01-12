import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

// Ensure data directory exists
const dataDir = path.join(process.cwd(), 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const dbPath = path.join(dataDir, 'kss.db');

// Initialize DB connection
const db = new Database(dbPath);

// Ensure schema
// Using a simple logins table suitable for audit trails
// id: PK, first_name/last_name, class_code, created_at ISO string

db.exec(`
  CREATE TABLE IF NOT EXISTS logins (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    class_code TEXT NOT NULL,
    created_at TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    student_id TEXT,
    class_code TEXT NOT NULL,
    password_hash TEXT NOT NULL,
    role TEXT DEFAULT 'student',
    created_at TEXT NOT NULL,
    UNIQUE(first_name, last_name, class_code)
  );
  CREATE TABLE IF NOT EXISTS events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    description TEXT,
    event_date TEXT NOT NULL,
    created_at TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    body TEXT NOT NULL,
    recipient_user_id INTEGER,
    sender_user_id INTEGER,
    created_at TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS reports (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    detail TEXT,
    image_url TEXT,
    created_at TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS admins (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    created_at TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS dress_code (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    image_url TEXT,
    created_at TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS schedules (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    type TEXT NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    date TEXT,
    created_at TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS announcements (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    priority TEXT DEFAULT 'normal',
    image_url TEXT,
    created_at TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS teachers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    teacher_id TEXT,
    password_hash TEXT NOT NULL,
    created_at TEXT NOT NULL,
    UNIQUE(first_name, last_name)
  );
  CREATE TABLE IF NOT EXISTS ai_knowledge (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    question TEXT NOT NULL,
    answer TEXT NOT NULL,
    keywords TEXT,
    category TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );
`);

// Add role column to existing users table if not exists
try {
  db.exec(`ALTER TABLE users ADD COLUMN role TEXT DEFAULT 'student'`);
} catch (err: any) {
  // Column already exists, ignore error
  if (!err.message.includes('duplicate column name')) {
    throw err;
  }
}

// Add student_id column to existing users table if not exists (legacy - no longer used)
try {
  db.exec(`ALTER TABLE users ADD COLUMN student_id TEXT`);
} catch (err: any) {
  // Column already exists, ignore error
  if (!err.message.includes('duplicate column name')) {
    throw err;
  }
}

// Add image_url column to existing announcements table if not exists
try {
  db.exec(`ALTER TABLE announcements ADD COLUMN image_url TEXT`);
} catch (err: any) {
  // Column already exists, ignore error
  if (!err.message.includes('duplicate column name')) {
    throw err;
  }
}

// Migrate teachers table to use first_name and last_name instead of username
try {
  // Check current table structure
  const tableInfo = db.prepare("PRAGMA table_info(teachers)").all() as Array<{ name: string }>;
  const hasUsername = tableInfo.some(col => col.name === 'username');
  const hasFirstName = tableInfo.some(col => col.name === 'first_name');
  
  console.log('Teachers table columns:', tableInfo.map(c => c.name).join(', '));
  
  if (hasUsername) {
    // Old schema detected - need to recreate table
    console.log('Migrating teachers table: removing username column...');
    
    // Backup any existing data if it has first_name
    let backupData: any[] = [];
    if (hasFirstName) {
      backupData = db.prepare('SELECT id, first_name, last_name, password_hash, created_at FROM teachers').all();
    }
    
    // Drop old table and create new one
    db.exec(`DROP TABLE IF EXISTS teachers;`);
    db.exec(`
      CREATE TABLE teachers (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        first_name TEXT NOT NULL,
        last_name TEXT NOT NULL,
        password_hash TEXT NOT NULL,
        created_at TEXT NOT NULL,
        UNIQUE(first_name, last_name)
      );
    `);
    
    // Restore backed up data
    if (backupData.length > 0) {
      const stmt = db.prepare('INSERT INTO teachers (id, first_name, last_name, password_hash, created_at) VALUES (?, ?, ?, ?, ?)');
      for (const row of backupData) {
        stmt.run(row.id, row.first_name, row.last_name, row.password_hash, row.created_at);
      }
      console.log(`Restored ${backupData.length} teacher records`);
    }
    
    console.log('Teachers table migration completed');
  }
} catch (err: any) {
  console.error('Error migrating teachers table:', err.message);
}

export function insertLogin(firstName: string, lastName: string, classCode: string) {
  const stmt = db.prepare(
    'INSERT INTO logins (first_name, last_name, class_code, created_at) VALUES (?, ?, ?, ?)' 
  );
  const createdAt = new Date().toISOString();
  const info = stmt.run(firstName.trim(), lastName.trim(), classCode.trim(), createdAt);
  return { id: info.lastInsertRowid as number, createdAt };
}

export function findUser(firstName: string, lastName: string, classCode: string) {
  const stmt = db.prepare(
    'SELECT id, first_name, last_name, class_code, password_hash, created_at FROM users WHERE first_name = ? AND last_name = ? AND class_code = ?'
  );
  return stmt.get(firstName.trim(), lastName.trim(), classCode.trim()) as
    | { id: number; first_name: string; last_name: string; class_code: string; password_hash: string; created_at: string }
    | undefined;
}

// Find all users that share the same first/last name (used when classCode is not provided)
export function findUsersByName(firstName: string, lastName: string) {
  const stmt = db.prepare(
    'SELECT id, first_name, last_name, class_code, password_hash, created_at FROM users WHERE first_name = ? AND last_name = ?'
  );
  return stmt.all(firstName.trim(), lastName.trim()) as Array<{
    id: number;
    first_name: string;
    last_name: string;
    class_code: string;
    password_hash: string;
    created_at: string;
  }>;
}

export function createUser(firstName: string, lastName: string, classCode: string, passwordHash: string) {
  const stmt = db.prepare(
    'INSERT INTO users (first_name, last_name, class_code, password_hash, created_at) VALUES (?, ?, ?, ?, ?)'
  );
  const createdAt = new Date().toISOString();
  const info = stmt.run(firstName.trim(), lastName.trim(), classCode.trim(), passwordHash, createdAt);
  return { id: info.lastInsertRowid as number, createdAt };
}

export function insertEvent(title: string, description: string, eventDate: string) {
  const stmt = db.prepare(
    'INSERT INTO events (title, description, event_date, created_at) VALUES (?, ?, ?, ?)'
  );
  const createdAt = new Date().toISOString();
  const info = stmt.run(title.trim(), description.trim(), eventDate, createdAt);
  return { id: info.lastInsertRowid as number, createdAt };
}

export function listEvents() {
  const stmt = db.prepare('SELECT id, title, description, event_date as eventDate, created_at as createdAt FROM events ORDER BY event_date ASC');
  return stmt.all() as Array<{ id: number; title: string; description: string; eventDate: string; createdAt: string }>;
}

export function updateEvent(id: number, title: string, description: string, eventDate: string) {
  const stmt = db.prepare('UPDATE events SET title = ?, description = ?, event_date = ? WHERE id = ?');
  return stmt.run(title.trim(), description.trim(), eventDate, id);
}

export function deleteEvent(id: number) {
  const stmt = db.prepare('DELETE FROM events WHERE id = ?');
  return stmt.run(id);
}

export function insertMessage(body: string) {
  const stmt = db.prepare('INSERT INTO messages (body, created_at) VALUES (?, ?)');
  const createdAt = new Date().toISOString();
  const info = stmt.run(body.trim(), createdAt);
  return { id: info.lastInsertRowid as number, createdAt };
}

// Ensure new columns exist for anonymous messaging
try {
  db.exec(`ALTER TABLE messages ADD COLUMN recipient_user_id INTEGER`);
} catch (err: any) {
  if (!String(err?.message || '').includes('duplicate column name')) {
    throw err;
  }
}
try {
  db.exec(`ALTER TABLE messages ADD COLUMN sender_user_id INTEGER`);
} catch (err: any) {
  if (!String(err?.message || '').includes('duplicate column name')) {
    throw err;
  }
}
try {
  db.exec(`ALTER TABLE messages ADD COLUMN is_read INTEGER DEFAULT 0`);
} catch (err: any) {
  if (!String(err?.message || '').includes('duplicate column name')) {
    throw err;
  }
}

export function insertAnonymousMessage(body: string, recipientUserId: number, senderUserId?: number) {
  const stmt = db.prepare(
    'INSERT INTO messages (body, recipient_user_id, sender_user_id, created_at) VALUES (?, ?, ?, ?)'
  );
  const createdAt = new Date().toISOString();
  const info = stmt.run(body.trim(), recipientUserId, senderUserId ?? null, createdAt);
  return { id: info.lastInsertRowid as number, createdAt };
}

export function listInbox(recipientUserId: number) {
  const stmt = db.prepare(
    'SELECT id, body, is_read as isRead, created_at as createdAt FROM messages WHERE recipient_user_id = ? ORDER BY created_at DESC'
  );
  return stmt.all(recipientUserId) as Array<{ id: number; body: string; isRead: number; createdAt: string }>;
}

// Admin: list all messages with sender/recipient info
export function listAllMessagesDetailed() {
  const stmt = db.prepare(`
    SELECT
      m.id,
      m.body,
      m.is_read as isRead,
      m.created_at as createdAt,
      ru.first_name || ' ' || ru.last_name as recipientName,
      ru.class_code as recipientClass,
      su.first_name || ' ' || su.last_name as senderName,
      su.class_code as senderClass
    FROM messages m
    LEFT JOIN users ru ON ru.id = m.recipient_user_id
    LEFT JOIN users su ON su.id = m.sender_user_id
    ORDER BY m.created_at DESC
  `);

  return stmt.all() as Array<{
    id: number;
    body: string;
    isRead: number;
    createdAt: string;
    recipientName: string | null;
    recipientClass: string | null;
    senderName: string | null;
    senderClass: string | null;
  }>;
}

export function markMessageAsRead(messageId: number, recipientUserId: number) {
  const stmt = db.prepare('UPDATE messages SET is_read = 1 WHERE id = ? AND recipient_user_id = ?');
  return stmt.run(messageId, recipientUserId);
}

export function deleteMessage(messageId: number, recipientUserId: number) {
  const stmt = db.prepare('DELETE FROM messages WHERE id = ? AND recipient_user_id = ?');
  return stmt.run(messageId, recipientUserId);
}

// Admin: delete any message by id
export function deleteMessageById(messageId: number) {
  const stmt = db.prepare('DELETE FROM messages WHERE id = ?');
  return stmt.run(messageId);
}

export function countUnreadMessages(recipientUserId: number) {
  const stmt = db.prepare('SELECT COUNT(*) as count FROM messages WHERE recipient_user_id = ? AND is_read = 0');
  const result = stmt.get(recipientUserId) as { count: number };
  return result.count;
}

export function listClasses() {
  const stmt = db.prepare('SELECT DISTINCT class_code as classCode FROM users ORDER BY class_code ASC');
  return stmt.all() as Array<{ classCode: string }>;
}

export function listUsersByClassCode(classCode: string) {
  const stmt = db.prepare(
    'SELECT id, first_name as firstName, last_name as lastName FROM users WHERE class_code = ? ORDER BY first_name ASC, last_name ASC'
  );
  return stmt.all(classCode) as Array<{ id: number; firstName: string; lastName: string }>;
}

export function insertReport(title: string, detail: string, imageUrl?: string) {
  const stmt = db.prepare('INSERT INTO reports (title, detail, image_url, created_at) VALUES (?, ?, ?, ?)');
  const createdAt = new Date().toISOString();
  const info = stmt.run(title.trim(), detail.trim(), imageUrl || null, createdAt);
  return { id: info.lastInsertRowid as number, createdAt };
}

export function listAllReports() {
  const stmt = db.prepare('SELECT id, title, detail, image_url as imageUrl, created_at as createdAt FROM reports ORDER BY created_at DESC');
  return stmt.all() as Array<{ id: number; title: string; detail: string; imageUrl: string | null; createdAt: string }>;
}

export function deleteReport(id: number) {
  const stmt = db.prepare('DELETE FROM reports WHERE id = ?');
  return stmt.run(id);
}

// Admin functions
export function findAdmin(username: string) {
  const stmt = db.prepare(
    'SELECT id, username, password_hash, created_at FROM admins WHERE username = ?'
  );
  return stmt.get(username.trim()) as
    | { id: number; username: string; password_hash: string; created_at: string }
    | undefined;
}

export function createAdmin(username: string, passwordHash: string) {
  const stmt = db.prepare(
    'INSERT INTO admins (username, password_hash, created_at) VALUES (?, ?, ?)'
  );
  const createdAt = new Date().toISOString();
  const info = stmt.run(username.trim(), passwordHash, createdAt);
  return { id: info.lastInsertRowid as number, createdAt };
}

export function listAllUsers() {
  const stmt = db.prepare(
    'SELECT id, first_name, last_name, class_code, password_hash, role, created_at FROM users ORDER BY first_name ASC, last_name ASC'
  );
  return stmt.all() as Array<{
    id: number;
    first_name: string;
    last_name: string;
    class_code: string;
    password_hash: string;
    role: string;
    created_at: string;
  }>;
}

export function updateUserRole(userId: number, role: string) {
  const stmt = db.prepare('UPDATE users SET role = ? WHERE id = ?');
  return stmt.run(role, userId);
}

export function deleteUser(userId: number) {
  const stmt = db.prepare('DELETE FROM users WHERE id = ?');
  return stmt.run(userId);
}

export function getUserById(userId: number) {
  const stmt = db.prepare('SELECT id, first_name, last_name, class_code FROM users WHERE id = ?');
  return stmt.get(userId) as | { id: number; first_name: string; last_name: string; class_code: string } | undefined;
}

// Dress code functions
export function listDressCode() {
  const stmt = db.prepare('SELECT * FROM dress_code ORDER BY created_at DESC');
  return stmt.all();
}

export function insertDressCode(title: string, description: string, imageUrl?: string) {
  const stmt = db.prepare('INSERT INTO dress_code (title, description, image_url, created_at) VALUES (?, ?, ?, ?)');
  const createdAt = new Date().toISOString();
  const info = stmt.run(title.trim(), description.trim(), imageUrl || null, createdAt);
  return { id: info.lastInsertRowid as number, createdAt };
}

export function updateDressCode(id: number, title: string, description: string, imageUrl?: string) {
  const stmt = db.prepare('UPDATE dress_code SET title = ?, description = ?, image_url = ? WHERE id = ?');
  return stmt.run(title.trim(), description.trim(), imageUrl || null, id);
}

export function deleteDressCode(id: number) {
  const stmt = db.prepare('DELETE FROM dress_code WHERE id = ?');
  return stmt.run(id);
}

// Schedule functions
export function listSchedules() {
  const stmt = db.prepare('SELECT * FROM schedules ORDER BY date DESC, created_at DESC');
  return stmt.all();
}

export function insertSchedule(type: string, title: string, description: string, date?: string) {
  const stmt = db.prepare('INSERT INTO schedules (type, title, description, date, created_at) VALUES (?, ?, ?, ?, ?)');
  const createdAt = new Date().toISOString();
  const info = stmt.run(type, title.trim(), description.trim(), date || null, createdAt);
  return { id: info.lastInsertRowid as number, createdAt };
}

export function updateSchedule(id: number, type: string, title: string, description: string, date?: string) {
  const stmt = db.prepare('UPDATE schedules SET type = ?, title = ?, description = ?, date = ? WHERE id = ?');
  return stmt.run(type, title.trim(), description.trim(), date || null, id);
}

export function deleteSchedule(id: number) {
  const stmt = db.prepare('DELETE FROM schedules WHERE id = ?');
  return stmt.run(id);
}

// Announcement functions
export function listAnnouncements() {
  const stmt = db.prepare('SELECT * FROM announcements ORDER BY created_at DESC');
  return stmt.all();
}

export function insertAnnouncement(title: string, content: string, priority: string = 'normal', imageUrl: string = '') {
  const stmt = db.prepare('INSERT INTO announcements (title, content, priority, image_url, created_at) VALUES (?, ?, ?, ?, ?)');
  const createdAt = new Date().toISOString();
  const info = stmt.run(title.trim(), content.trim(), priority, imageUrl || null, createdAt);
  return { id: info.lastInsertRowid as number, createdAt };
}

export function updateAnnouncement(id: number, title: string, content: string, priority: string, imageUrl: string = '') {
  const stmt = db.prepare('UPDATE announcements SET title = ?, content = ?, priority = ?, image_url = ? WHERE id = ?');
  return stmt.run(title.trim(), content.trim(), priority, imageUrl || null, id);
}

export function deleteAnnouncement(id: number) {
  const stmt = db.prepare('DELETE FROM announcements WHERE id = ?');
  return stmt.run(id);
}

// Teacher functions
export function findTeacher(firstName: string, lastName: string) {
  const stmt = db.prepare(
    'SELECT id, first_name, last_name, password_hash, created_at FROM teachers WHERE first_name = ? AND last_name = ?'
  );
  return stmt.get(firstName.trim(), lastName.trim()) as
    | { id: number; first_name: string; last_name: string; password_hash: string; created_at: string }
    | undefined;
}

export function createTeacher(firstName: string, lastName: string, passwordHash: string) {
  const stmt = db.prepare(
    'INSERT INTO teachers (first_name, last_name, password_hash, created_at) VALUES (?, ?, ?, ?)'
  );
  const createdAt = new Date().toISOString();
  const info = stmt.run(firstName.trim(), lastName.trim(), passwordHash, createdAt);
  return { id: info.lastInsertRowid as number, createdAt };
}

export function listAllTeachers() {
  const stmt = db.prepare(
    'SELECT id, first_name, last_name, created_at FROM teachers ORDER BY first_name ASC, last_name ASC'
  );
  return stmt.all() as Array<{
    id: number;
    first_name: string;
    last_name: string;
    created_at: string;
  }>;
}

// AI Knowledge functions
export function listAllAIKnowledge() {
  const stmt = db.prepare('SELECT * FROM ai_knowledge ORDER BY updated_at DESC');
  return stmt.all() as Array<{
    id: number;
    question: string;
    answer: string;
    keywords: string;
    category: string;
    created_at: string;
    updated_at: string;
  }>;
}

export function searchAIKnowledge(query: string) {
  const stmt = db.prepare(`
    SELECT * FROM ai_knowledge 
    WHERE question LIKE ? OR answer LIKE ? OR keywords LIKE ?
    ORDER BY updated_at DESC
  `);
  const searchTerm = `%${query}%`;
  return stmt.all(searchTerm, searchTerm, searchTerm) as Array<{
    id: number;
    question: string;
    answer: string;
    keywords: string;
    category: string;
    created_at: string;
    updated_at: string;
  }>;
}

export function insertAIKnowledge(question: string, answer: string, keywords: string, category: string) {
  const stmt = db.prepare('INSERT INTO ai_knowledge (question, answer, keywords, category, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)');
  const now = new Date().toISOString();
  const info = stmt.run(question.trim(), answer.trim(), keywords.trim(), category.trim(), now, now);
  return { id: info.lastInsertRowid as number, createdAt: now };
}

export function updateAIKnowledge(id: number, question: string, answer: string, keywords: string, category: string) {
  const stmt = db.prepare('UPDATE ai_knowledge SET question = ?, answer = ?, keywords = ?, category = ?, updated_at = ? WHERE id = ?');
  const now = new Date().toISOString();
  return stmt.run(question.trim(), answer.trim(), keywords.trim(), category.trim(), now, id);
}

export function deleteAIKnowledge(id: number) {
  const stmt = db.prepare('DELETE FROM ai_knowledge WHERE id = ?');
  return stmt.run(id);
}

export function deleteTeacher(teacherId: number) {
  const stmt = db.prepare('DELETE FROM teachers WHERE id = ?');
  return stmt.run(teacherId);
}

// Initialize schedules data for M.1/1
export function initializeSchedulesForM1_1() {
  const scheduleData = [
    {
      question: "ม.1/1 วันจันทร์ เรียนเรียนอะไร",
      answer: "ม.1/1 วันจันทร์ ชุดนักเรียน\nช่วง Homeroom: ที่ปรึกษา 721\nคาบที่ 1: เรียน ท21102 ครูธนากิต 724\nคาบที่ 2: เรียน ค21202 ครูพิชิต 721\nคาบที่ 3: เรียน พ21104 ครูภิสรรค์ ส.ฟุตบอล\nคาบที่ 4: พักเที่ยง\nคาบที่ 5: แนะแนว ครูราโมนา 724\nคาบที่ 6: เรียน ค21101 ครูพิชิต 721\nคาบที่ 7: ซ่อมเสริม\nคาบที่ 8: ประชุม ม.1 หอประชุม",
      keywords: "ม.1/1 จันทร์ ตารางเรียน schedule",
      category: "เวลาเรียน"
    },
    {
      question: "ม.1/1 วันอังคาร เรียนเรียนอะไร",
      answer: "ม.1/1 วันอังคาร ชุดนักเรียน\nช่วง Homeroom: ที่ปรึกษา 721\nคาบที่ 1: เรียน ง21102 ครูภาณุพงศ์ 412\nคาบที่ 2: เรียน ค21202 ครูพิชิต 721\nคาบที่ 3: เรียน ท21102 ครูธนากิต 724\nคาบที่ 4: พักเที่ยง\nคาบที่ 5: เรียน อ21102 ครูธันย์ชนก 124\nคาบที่ 6: เรียน ว21212 ครูบุญยาพร 224\nคาบที่ 7: เรียน ว21212 ครูบุญยาพร 224\nคาบที่ 8: เรียน ว21104 ครูวันวิสาข์ 133",
      keywords: "ม.1/1 อังคาร ตารางเรียน schedule",
      category: "เวลาเรียน"
    },
    {
      question: "ม.1/1 วันพุธ เรียนเรียนอะไร",
      answer: "ม.1/1 วันพุธ ชุดลูกเสือ\nช่วง Homeroom: ที่ปรึกษา 721\nคาบที่ 1: เรียน ง21102 ครูสุทธิดา 224\nคาบที่ 2: เรียน ส21102 ครูกฤษกาน 116\nคาบที่ 3: เรียน ส21162 ครูวิชาญ 126\nคาบที่ 4: พักเที่ยง\nคาบที่ 5: เรียน อ21102 ครูธันย์ชนก 123\nคาบที่ 6: เรียน ท21102 ครูธนากิต 724\nคาบที่ 7: ซ่อมเสริม ที่ปรึกษา 721\nคาบที่ 8: ลูกเสือ",
      keywords: "ม.1/1 พุธ ตารางเรียน schedule ลูกเสือ",
      category: "เวลาเรียน"
    },
    {
      question: "ม.1/1 วันพฤหัสบดี เรียนเรียนอะไร",
      answer: "ม.1/1 วันพฤหัสบดี ชุดนักเรียน\nช่วง Homeroom: ที่ปรึกษา 721\nคาบที่ 1: เรียน ค21101 ครูพิชิต 721\nคาบที่ 2: เรียน ส21102 ครูกฤษกาน 125\nคาบที่ 3: เรียน อ21102 ครูธันย์ชนก 135\nคาบที่ 4: พักเที่ยง\nคาบที่ 5: เรียน ค21102 ครูศดานันท์ 113\nคาบที่ 6: เรียน ว21214 ครูวันวิสาข์ 133\nคาบที่ 7: ซ่อมเสริม\nคาบที่ 8: ชุมนุม",
      keywords: "ม.1/1 พฤหัสบดี ตารางเรียน schedule",
      category: "เวลาเรียน"
    },
    {
      question: "ม.1/1 วันศุกร์ เรียนเรียนอะไร",
      answer: "ม.1/1 วันศุกร์ ชุดพละ\nช่วง Homeroom: ที่ปรึกษา 721\nคาบที่ 1: เรียน ค21101 ครูพิชิต 721\nคาบที่ 2: เรียน ว21102 ครูสุทธิดา 223\nคาบที่ 3: เรียน ว21102 ครูสุทธิดา 223\nคาบที่ 4: พักเที่ยง\nคาบที่ 5: เรียน ส21102 ครูกฤษกาน 116\nคาบที่ 6: เรียน ค21202 ครูพิชิต 721\nคาบที่ 7: เรียน พ21102 ครูสุนิษา ส.ฟุตบอล\nคาบที่ 8: เรียน ค21102 ครูศดานันท์ 113",
      keywords: "ม.1/1 ศุกร์ ตารางเรียน schedule พละ",
      category: "เวลาเรียน"
    }
  ];

  const now = new Date().toISOString();
  let count = 0;
  const stmt = db.prepare('INSERT INTO ai_knowledge (question, answer, keywords, category, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)');

  for (const item of scheduleData) {
    // Check if exists
    const existing = db.prepare('SELECT id FROM ai_knowledge WHERE question = ?').get(item.question);
    if (!existing) {
      stmt.run(item.question, item.answer, item.keywords, item.category, now, now);
      count++;
    }
  }

  return count;
}

// Initialize schedules data for M.1/2
export function initializeSchedulesForM1_2() {
  const scheduleData = [
    {
      question: "ม.1/2 วันจันทร์ เรียนเรียนอะไร",
      answer: "ม.1/2 วันจันทร์ ชุดนักเรียน\nช่วง Homeroom: ที่ปรึกษา 133\nคาบที่ 1: ศ21102 ครูศดานันท์ 116\nคาบที่ 2: ว21214 ครูวันวิสาข์ 133\nคาบที่ 3: อ21102 ครูธันย์ชนก 117\nคาบที่ 4: พักเที่ยง\nคาบที่ 5: ส21102 ครูกฤษกาน 116\nคาบที่ 6: ซ่อมเสริม\nคาบที่ 7: อ21202 ครูณฐิยา 123\nคาบที่ 8: ประชุม ม.1 หอประชุม",
      keywords: "ม.1/2 จันทร์ ตารางเรียน schedule",
      category: "เวลาเรียน"
    },
    {
      question: "ม.1/2 วันอังคาร เรียนเรียนอะไร",
      answer: "ม.1/2 วันอังคาร ชุดพละ\nช่วง Homeroom: ที่ปรึกษา 133\nคาบที่ 1: ค21101 ครูพิชิต 721\nคาบที่ 2: อ21102 ครูธันย์ชนก 117\nคาบที่ 3: จ21204 ครูณฐิยา 123\nคาบที่ 4: พักเที่ยง\nคาบที่ 5: ว21102 ครูสุทธิดา 223\nคาบที่ 6: ซ่อมเสริม\nคาบที่ 7: พ21102 ครูสุนิษา ส.ฟุตบอล\nคาบที่ 8: พ21104 ครูภิสรรค์ ส.ฟุตบอล",
      keywords: "ม.1/2 อังคาร ตารางเรียน schedule พละ",
      category: "เวลาเรียน"
    },
    {
      question: "ม.1/2 วันพุธ เรียนเรียนอะไร",
      answer: "ม.1/2 วันพุธ ชุดลูกเสือ\nช่วง Homeroom: ที่ปรึกษา 133\nคาบที่ 1: ส21102 ครูกฤษกาน 116\nคาบที่ 2: ว21104 ครูวันวิสาข์ 133\nคาบที่ 3: อ21102 ครูธันย์ชนก 135\nคาบที่ 4: พักเที่ยง\nคาบที่ 5: ท21102 ครูธนากิต 724\nคาบที่ 6: ซ่อมเสริม\nคาบที่ 7: ซ่อมเสริม ที่ปรึกษา 133\nคาบที่ 8: ลูกเสือ",
      keywords: "ม.1/2 พุธ ตารางเรียน schedule ลูกเสือ",
      category: "เวลาเรียน"
    },
    {
      question: "ม.1/2 วันพฤหัสบดี เรียนเรียนอะไร",
      answer: "ม.1/2 วันพฤหัสบดี ชุดนักเรียน\nช่วง Homeroom: ที่ปรึกษา 133\nคาบที่ 1: ส21162 ครูวิชาญ 123\nคาบที่ 2: ท21102 ครูธนากิต 724\nคาบที่ 3: แนะแนว ครูราโมนา 223\nคาบที่ 4: พักเที่ยง\nคาบที่ 5: ง21102 ครูภาณุพงศ์ 412\nคาบที่ 6: ค21101 ครูพิชิต 721\nคาบที่ 7: ศ21102 ครูศดานันท์\nคาบที่ 8: ชุมนุม",
      keywords: "ม.1/2 พฤหัสบดี ตารางเรียน schedule",
      category: "เวลาเรียน"
    },
    {
      question: "ม.1/2 วันศุกร์ เรียนเรียนอะไร",
      answer: "ม.1/2 วันศุกร์ ชุดนักเรียน\nช่วง Homeroom: ที่ปรึกษา 133\nคาบที่ 1: ส21102 ครูกฤษกาน 116\nคาบที่ 2: ค21102 ครูพิชิต 721\nคาบที่ 3: จ21204 ครูณฐิยา 123\nคาบที่ 4: พักเที่ยง\nคาบที่ 5: อ21202 ครูณฐิยา 125\nคาบที่ 6: ท21102 ครูธนากิต 724\nคาบที่ 7: ว21102 ครูสุทธิดา 221\nคาบที่ 8: ว21102 ครูสุทธิดา 221",
      keywords: "ม.1/2 ศุกร์ ตารางเรียน schedule",
      category: "เวลาเรียน"
    }
  ];

  const now = new Date().toISOString();
  let count = 0;
  const stmt = db.prepare('INSERT INTO ai_knowledge (question, answer, keywords, category, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)');

  for (const item of scheduleData) {
    const existing = db.prepare('SELECT id FROM ai_knowledge WHERE question = ?').get(item.question);
    if (!existing) {
      stmt.run(item.question, item.answer, item.keywords, item.category, now, now);
      count++;
    }
  }

  return count;
}

// Initialize schedules data for M.1/3
export function initializeSchedulesForM1_3() {
  const scheduleData = [
    {
      question: "ม.1/3 วันจันทร์ เรียนเรียนอะไร",
      answer: "ม.1/3 วันจันทร์ ชุดนักเรียน\nช่วง Homeroom: ที่ปรึกษา 133\nคาบที่ 1: ค21101 ครูพิชิต 721\nคาบที่ 2: ส21102 ครูกฤษกาน 116\nคาบที่ 3: ส21162 ครูวิชาญ 126\nคาบที่ 4: พักเที่ยง\nคาบที่ 5: อ21102 ครูธันย์ชนก 117\nคาบที่ 6: ว21102 ครูสุทธิดา 224\nคาบที่ 7: ว21102 ครูสุทธิดา 224\nคาบที่ 8: ประชุม ม.1 หอประชุม",
      keywords: "ม.1/3 จันทร์ ตารางเรียน schedule",
      category: "เวลาเรียน"
    },
    {
      question: "ม.1/3 วันอังคาร เรียนเรียนอะไร",
      answer: "ม.1/3 วันอังคาร ชุดพละ\nช่วง Homeroom: ที่ปรึกษา 123\nคาบที่ 1: อ21102 ครูธันย์ชนก 117\nคาบที่ 2: ซ่อมเสริม\nคาบที่ 3: พ21104 ครูภิสรรค์ ส.ฟุตบอล\nคาบที่ 4: พักเที่ยง\nคาบที่ 5: ส21102 ครูกฤษกาน 116\nคาบที่ 6: ค21102 ครูพิชิต 721\nคาบที่ 7: ท21102 ครูธนากิต 724\nคาบที่ 8: อ21202 ครูณฐิยา 123",
      keywords: "ม.1/3 อังคาร ตารางเรียน schedule พละ",
      category: "เวลาเรียน"
    },
    {
      question: "ม.1/3 วันพุธ เรียนเรียนอะไร",
      answer: "ม.1/3 วันพุธ ชุดลูกเสือ\nช่วง Homeroom: ที่ปรึกษา 123\nคาบที่ 1: ว21104 ครูวันวิสาข์ 133\nคาบที่ 2: อ21202 ครูณฐิยา 123\nคาบที่ 3: ท21102 ครูธนากิต 724\nคาบที่ 4: พักเที่ยง\nคาบที่ 5: ศ21102 ครูศดานันท์ 113\nคาบที่ 6: จ21204 ครูณฐิยา 123\nคาบที่ 7: ซ่อมเสริม ที่ปรึกษา 123\nคาบที่ 8: ลูกเสือ",
      keywords: "ม.1/3 พุธ ตารางเรียน schedule ลูกเสือ",
      category: "เวลาเรียน"
    },
    {
      question: "ม.1/3 วันพฤหัสบดี เรียนเรียนอะไร",
      answer: "ม.1/3 วันพฤหัสบดี ชุดนักเรียน\nช่วง Homeroom: ที่ปรึกษา 123\nคาบที่ 1: ท21102 ครูธนากิต 724\nคาบที่ 2: จ21204 ครูณฐิยา 123\nคาบที่ 3: ซ่อมเสริม\nคาบที่ 4: พักเที่ยง\nคาบที่ 5: ว21102 ครูสุทธิดา 223\nคาบที่ 6: ง21102 ครูภาณุพงศ์ 412\nคาบที่ 7: ค21102 ครูพิชิต 721\nคาบที่ 8: ชุมนุม",
      keywords: "ม.1/3 พฤหัสบดี ตารางเรียน schedule",
      category: "เวลาเรียน"
    },
    {
      question: "ม.1/3 วันศุกร์ เรียนเรียนอะไร",
      answer: "ม.1/3 วันศุกร์ ชุดพละ\nช่วง Homeroom: ที่ปรึกษา 123\nคาบที่ 1: ศ21102 ครูศดานันท์ 113\nคาบที่ 2: ว21214 ครูวันวิสาข์\nคาบที่ 3: ส21102 ครูกฤษกาน 116\nคาบที่ 4: พักเที่ยง\nคาบที่ 5: อ21102 ครูธันย์ชนก 123\nคาบที่ 6: พ21102 ครูสุนิษา ส.ฟุตบอล\nคาบที่ 7: แนะแนว ครูราโมนา 724\nคาบที่ 8: ซ่อมเสริม",
      keywords: "ม.1/3 ศุกร์ ตารางเรียน schedule พละ",
      category: "เวลาเรียน"
    }
  ];

  const now = new Date().toISOString();
  let count = 0;
  const stmt = db.prepare('INSERT INTO ai_knowledge (question, answer, keywords, category, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)');

  for (const item of scheduleData) {
    const existing = db.prepare('SELECT id FROM ai_knowledge WHERE question = ?').get(item.question);
    if (!existing) {
      stmt.run(item.question, item.answer, item.keywords, item.category, now, now);
      count++;
    }
  }

  return count;
}

// Initialize schedules data for M.1/4
export function initializeSchedulesForM1_4() {
  const scheduleData = [
    {
      question: "ม.1/4 วันจันทร์ เรียนเรียนอะไร",
      answer: "ม.1/4 วันจันทร์ ชุดนักเรียน\nช่วง Homeroom: ที่ปรึกษา 724\nคาบที่ 1: อ21102 ครูธันย์ชนก 117\nคาบที่ 2: ซ่อมเสริม\nคาบที่ 3: ส21102 ครูกฤษกาน 116\nคาบที่ 4: พักเที่ยง\nคาบที่ 5: ว21104 ครูวันวิสาข์ 133\nคาบที่ 6: แนะแนว ครูราโมนา 724\nคาบที่ 7: ท21102 ครูธนากิต 724\nคาบที่ 8: ประชุม ม.1 หอประชุม",
      keywords: "ม.1/4 จันทร์ ตารางเรียน schedule",
      category: "เวลาเรียน"
    },
    {
      question: "ม.1/4 วันอังคาร เรียนเรียนอะไร",
      answer: "ม.1/4 วันอังคาร ชุดพละ\nช่วง Homeroom: ที่ปรึกษา 724\nคาบที่ 1: ว21102 ครูสุทธิดา 222\nคาบที่ 2: ว21102 ครูสุทธิดา 222\nคาบที่ 3: ค21101 ครูพิชิต 721\nคาบที่ 4: พักเที่ยง\nคาบที่ 5: ง21102 ครูภาณุพงศ์ 412\nคาบที่ 6: พ21102 ครูสุนิษา ส.ฟุตบอล\nคาบที่ 7: ส21102 ครูกฤษกาน 116\nคาบที่ 8: ศ21102 ครูศดานันท์ 113",
      keywords: "ม.1/4 อังคาร ตารางเรียน schedule พละ",
      category: "เวลาเรียน"
    },
    {
      question: "ม.1/4 วันพุธ เรียนเรียนอะไร",
      answer: "ม.1/4 วันพุธ ชุดลูกเสือ\nช่วง Homeroom: ที่ปรึกษา 724\nคาบที่ 1: ศ21102 ครูศดานันท์ 311\nคาบที่ 2: ท21102 ครูธนากิต 724\nคาบที่ 3: ว21102 ครูสุทธิดา 223\nคาบที่ 4: พักเที่ยง\nคาบที่ 5: ส21162 ครูวิชาญ\nคาบที่ 6: ซ่อมเสริม\nคาบที่ 7: ซ่อมเสริม ที่ปรึกษา 724\nคาบที่ 8: ลูกเสือ",
      keywords: "ม.1/4 พุธ ตารางเรียน schedule ลูกเสือ",
      category: "เวลาเรียน"
    },
    {
      question: "ม.1/4 วันพฤหัสบดี เรียนเรียนอะไร",
      answer: "ม.1/4 วันพฤหัสบดี ชุดพละ\nช่วง Homeroom: ที่ปรึกษา 724\nคาบที่ 1: พ21102 ครูภิสรรค์ ส.ฟุตบอล\nคาบที่ 2: ซ่อมเสริม\nคาบที่ 3: ค21101 ครูพิชิต 721\nคาบที่ 4: พักเที่ยง\nคาบที่ 5: อ21102 ครูธันย์ชนก 135\nคาบที่ 6: ท21102 ครูธนากิต 724\nคาบที่ 7: ส21102 ครูกฤษกาน 126\nคาบที่ 8: ชุมนุม",
      keywords: "ม.1/4 พฤหัสบดี ตารางเรียน schedule พละ",
      category: "เวลาเรียน"
    },
    {
      question: "ม.1/4 วันศุกร์ เรียนเรียนอะไร",
      answer: "ม.1/4 วันศุกร์ ชุดพละ\nช่วง Homeroom: ที่ปรึกษา 724\nคาบที่ 1: ว21214 ครูวันวิสาข์ 133\nคาบที่ 2: อ21102 ครูธันย์ชนก 135\nคาบที่ 3: ค21101 ครูพิชิต 721\nคาบที่ 4: พักเที่ยง\nคาบที่ 5: ง20273 ครูภาณุพงศ์ 412\nคาบที่ 6: ง20273 ครูภาณุพงศ์ 412\nคาบที่ 7: พ20210 ครูวิทยา ส.ตะกร้อ\nคาบที่ 8: พ20210 ครูวิทยา ส.ตะกร้อ",
      keywords: "ม.1/4 ศุกร์ ตารางเรียน schedule พละ",
      category: "เวลาเรียน"
    }
  ];

  const now = new Date().toISOString();
  let count = 0;
  const stmt = db.prepare('INSERT INTO ai_knowledge (question, answer, keywords, category, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)');

  for (const item of scheduleData) {
    const existing = db.prepare('SELECT id FROM ai_knowledge WHERE question = ?').get(item.question);
    if (!existing) {
      stmt.run(item.question, item.answer, item.keywords, item.category, now, now);
      count++;
    }
  }

  return count;
}

// Initialize schedules data for M.1/5
export function initializeSchedulesForM1_5() {
  const scheduleData = [
    {
      question: "ม.1/5 วันจันทร์ เรียนเรียนอะไร",
      answer: "ม.1/5 วันจันทร์ ชุดพละ\nช่วง Homeroom: ที่ปรึกษา ห้องสมุด\nคาบที่ 1: ส21102 ครูกฤษกาน 126\nคาบที่ 2: ท21102 ครูธนากิต 724\nคาบที่ 3: ซ่อมเสริม\nคาบที่ 4: พักเที่ยง\nคาบที่ 5: ศ21102 ครูศดานันท์ 113\nคาบที่ 6: พ21102 ครูสุนิษา ส.ฟุตบอล\nคาบที่ 7: ค21102 ครูพิชิต 721\nคาบที่ 8: ประชุม ม.1 หอประชุม",
      keywords: "ม.1/5 จันทร์ ตารางเรียน schedule พละ",
      category: "เวลาเรียน"
    },
    {
      question: "ม.1/5 วันอังคาร เรียนเรียนอะไร",
      answer: "ม.1/5 วันอังคาร ชุดพละ\nช่วง Homeroom: ที่ปรึกษา ห้องสมุด\nคาบที่ 1: ส21162 ครูวิชาญ 135\nคาบที่ 2: ท21102 ครูธนากิต 724\nคาบที่ 3: อ21102 ครูธันย์ชนก 135\nคาบที่ 4: พักเที่ยง\nคาบที่ 5: ค21101 ครูพิชิต 721\nคาบที่ 6: พ20210 ครูวิทยา ส.ตะกร้อ\nคาบที่ 7: พ20210 ครูวิทยา ส.ตะกร้อ\nคาบที่ 8: ส21102 ครูกฤษกาน",
      keywords: "ม.1/5 อังคาร ตารางเรียน schedule พละ",
      category: "เวลาเรียน"
    },
    {
      question: "ม.1/5 วันพุธ เรียนเรียนอะไร",
      answer: "ม.1/5 วันพุธ ชุดลูกเสือ\nช่วง Homeroom: ที่ปรึกษา ห้องสมุด\nคาบที่ 1: ท21102 ครูธนากิต 724\nคาบที่ 2: ว21102 ครูสุทธิดา 224\nคาบที่ 3: แนะแนว ครูราโมนา ห้องสมุด\nคาบที่ 4: พักเที่ยง\nคาบที่ 5: ว21102 ครูสุทธิดา 224\nคาบที่ 6: ว21102 ครูสุทธิดา 224\nคาบที่ 7: ซ่อมเสริม ที่ปรึกษา ห้องสมุด\nคาบที่ 8: ลูกเสือ",
      keywords: "ม.1/5 พุธ ตารางเรียน schedule ลูกเสือ",
      category: "เวลาเรียน"
    },
    {
      question: "ม.1/5 วันพฤหัสบดี เรียนเรียนอะไร",
      answer: "ม.1/5 วันพฤหัสบดี ชุดนักเรียน\nช่วง Homeroom: ที่ปรึกษา ห้องสมุด\nคาบที่ 1: ว21104 ครูวันวิสาข์ 133\nคาบที่ 2: ง20273 ครูภาณุพงศ์ 412\nคาบที่ 3: ง20273 ครูภาณุพงศ์ 412\nคาบที่ 4: พักเที่ยง\nคาบที่ 5: ซ่อมเสริม\nคาบที่ 6: อ21102 ครูธันย์ชนก 135\nคาบที่ 7: พ21104 ครูภิสรรค์ ส.ฟุตบอล\nคาบที่ 8: ชุมนุม",
      keywords: "ม.1/5 พฤหัสบดี ตารางเรียน schedule",
      category: "เวลาเรียน"
    },
    {
      question: "ม.1/5 วันศุกร์ เรียนเรียนอะไร",
      answer: "ม.1/5 วันศุกร์ ชุดนักเรียน\nช่วง Homeroom: ที่ปรึกษา ห้องสมุด\nคาบที่ 1: ง21102 ครูภาณุพงศ์ 412\nคาบที่ 2: ซ่อมเสริม\nคาบที่ 3: อ21102 ครูธันย์ชนก 117\nคาบที่ 4: พักเที่ยง\nคาบที่ 5: ค21101 ครูพิชิต 721\nคาบที่ 6: ส21102 ครูกฤษกาน 116\nคาบที่ 7: ศ21102 ครูศดานันท์ 113\nคาบที่ 8: ว21214 ครูวันวิสาข์ 133",
      keywords: "ม.1/5 ศุกร์ ตารางเรียน schedule",
      category: "เวลาเรียน"
    }
  ];

  const now = new Date().toISOString();
  let count = 0;
  const stmt = db.prepare('INSERT INTO ai_knowledge (question, answer, keywords, category, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)');

  for (const item of scheduleData) {
    const existing = db.prepare('SELECT id FROM ai_knowledge WHERE question = ?').get(item.question);
    if (!existing) {
      stmt.run(item.question, item.answer, item.keywords, item.category, now, now);
      count++;
    }
  }

  return count;
}

// Initialize schedules data for M.2/1
export function initializeSchedulesForM2_1() {
  const scheduleData = [
    {
      question: "ม.2/1 วันจันทร์ เรียนเรียนอะไร",
      answer: "ม.2/1 วันจันทร์ ชุดนักเรียน\nช่วง Homeroom: ที่ปรึกษา 223\nคาบที่ 1: ค22102 ครูลดาวัลย์ 122\nคาบที่ 2: ส22104 ครูโกสิทธิ์ 125\nคาบที่ 3: ง22102 ครูวัชรินทร์ 411\nคาบที่ 4: อ22102 ครูพิกุลทอง 123\nคาบที่ 5: พักเที่ยง\nคาบที่ 6: ท22102 ครูธัชญาณี 725\nคาบที่ 7: พ22104 ครูสุนิษา หอประชุม\nคาบที่ 8: พ22102 ครูวิทยา พลานามัย",
      keywords: "ม.2/1 จันทร์ ตารางเรียน schedule",
      category: "เวลาเรียน"
    },
    {
      question: "ม.2/1 วันอังคาร เรียนเรียนอะไร",
      answer: "ม.2/1 วันอังคาร ชุดนักเรียน\nช่วง Homeroom: ที่ปรึกษา 223\nคาบที่ 1: อ22102 ครูพิกุลทอง 123\nคาบที่ 2: ศ22102 ครูวรพล 712\nคาบที่ 3: ว22102 ครูบุณยาพร 222\nคาบที่ 4: ว22102 ครูบุณยาพร 222\nคาบที่ 5: พักเที่ยง\nคาบที่ 6: ส22104 ครูโกสิทธิ์ 125\nคาบที่ 7: ค22102 ครูลดาวัลย์ 122\nคาบที่ 8: ประชุม ม.2 หอประชุม",
      keywords: "ม.2/1 อังคาร ตารางเรียน schedule",
      category: "เวลาเรียน"
    },
    {
      question: "ม.2/1 วันพุธ เรียนเรียนอะไร",
      answer: "ม.2/1 วันพุธ ชุดลูกเสือ\nช่วง Homeroom: ที่ปรึกษา 223\nคาบที่ 1: ว22214 ครูรังสิมันต์ 134\nคาบที่ 2: ศ22102 ครูวรพล 712\nคาบที่ 3: ค22202 ครูพิชิต 721\nคาบที่ 4: IS/STEM ครูมะรุสดี 723\nคาบที่ 5: พักเที่ยง\nคาบที่ 6: IS/STEM ครูมะรุสดี 723\nคาบที่ 7: ซ่อมเสริม ที่ปรึกษา 223\nคาบที่ 8: ลูกเสือ",
      keywords: "ม.2/1 พุธ ตารางเรียน schedule ลูกเสือ",
      category: "เวลาเรียน"
    },
    {
      question: "ม.2/1 วันพฤหัสบดี เรียนเรียนอะไร",
      answer: "ม.2/1 วันพฤหัสบดี ชุดนักเรียน\nช่วง Homeroom: ที่ปรึกษา 223\nคาบที่ 1: แนะแนว ครูณัฐริกา 222\nคาบที่ 2: ค22202 ครูพิชิต 721\nคาบที่ 3: ท22102 ครูธัชญาณี 725\nคาบที่ 4: ว22102 ครูบุณยาพร 222\nคาบที่ 5: พักเที่ยง\nคาบที่ 6: ว22205 ครูสุทธิดา 223\nคาบที่ 7: ว22205 ครูสุทธิดา 223\nคาบที่ 8: ชุมนุม",
      keywords: "ม.2/1 พฤหัสบดี ตารางเรียน schedule",
      category: "เวลาเรียน"
    },
    {
      question: "ม.2/1 วันศุกร์ เรียนเรียนอะไร",
      answer: "ม.2/1 วันศุกร์ ชุดนักเรียน\nช่วง Homeroom: ที่ปรึกษา 223\nคาบที่ 1: ท22102 ครูธัชญาณี 725\nคาบที่ 2: ส22104 ครูโกสิทธิ์ 125\nคาบที่ 3: ค22102 ครูลดาวัลย์ 122\nคาบที่ 4: อ22102 ครูพิกุลทอง 123\nคาบที่ 5: พักเที่ยง\nคาบที่ 6: ว22104 ครูวันวิสาข์ 133\nคาบที่ 7: ค22202 ครูพิชิต 721\nคาบที่ 8: ส22164 ครูกฤษกาน 116",
      keywords: "ม.2/1 ศุกร์ ตารางเรียน schedule",
      category: "เวลาเรียน"
    }
  ];

  const now = new Date().toISOString();
  let count = 0;
  const stmt = db.prepare('INSERT INTO ai_knowledge (question, answer, keywords, category, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)');

  for (const item of scheduleData) {
    const existing = db.prepare('SELECT id FROM ai_knowledge WHERE question = ?').get(item.question);
    if (!existing) {
      stmt.run(item.question, item.answer, item.keywords, item.category, now, now);
      count++;
    }
  }

  return count;
}

// Initialize schedules data for M.2/2
export function initializeSchedulesForM2_2() {
  const scheduleData = [
    {
      question: "ม.2/2 วันจันทร์ เรียนเรียนอะไร",
      answer: "ม.2/2 วันจันทร์ ชุดพละ\nช่วง Homeroom: ที่ปรึกษา 211\nคาบที่ 1: จ22204 ครูณฐิยา 123\nคาบที่ 2: ค22102 ครูลดาวัลย์ 122\nคาบที่ 3: ท22102 ครูธัชญาณี 725\nคาบที่ 4: พ22104 ครูสุนิษา หอประชุม\nคาบที่ 5: พักเที่ยง\nคาบที่ 6: ว22214 ครูรังสิมันต์ 134\nคาบที่ 7: อ22102 ครูพิกุลทอง 123\nคาบที่ 8: ว22102 ครูบุณยาพร 224",
      keywords: "ม.2/2 จันทร์ ตารางเรียน schedule พละ",
      category: "เวลาเรียน"
    },
    {
      question: "ม.2/2 วันอังคาร เรียนเรียนอะไร",
      answer: "ม.2/2 วันอังคาร ชุดนักเรียน\nช่วง Homeroom: ที่ปรึกษา 211\nคาบที่ 1: ส22164 ครูกฤษกาน 116\nคาบที่ 2: ว221024 ครูวันวิสาข์ 133\nคาบที่ 3: ส22104 ครูโกสิทธิ์ 126\nคาบที่ 4: อ22102 ครูพิกุลทอง\nคาบที่ 5: พักเที่ยง\nคาบที่ 6: ท20202 ครูธัชญาณี 725\nคาบที่ 7: จ22204 ครูณฐิยา 125\nคาบที่ 8: ประชุม ม.2 หอประชุม",
      keywords: "ม.2/2 อังคาร ตารางเรียน schedule",
      category: "เวลาเรียน"
    },
    {
      question: "ม.2/2 วันพุธ เรียนเรียนอะไร",
      answer: "ม.2/2 วันพุธ ชุดลูกเสือ\nช่วง Homeroom: ที่ปรึกษา 211\nคาบที่ 1: ส22104 ครูโกสิทธิ์ 125\nคาบที่ 2: ค22102 ครูลดาวัลย์ 122\nคาบที่ 3: ศ22102 ครูวรพล 712\nคาบที่ 4: ง22102 ครูวัชรินทร์ 411\nคาบที่ 5: พักเที่ยง\nคาบที่ 6: ท22102 ครูธัชญาณี 725\nคาบที่ 7: ซ่อมเสริม ที่ปรึกษา 211\nคาบที่ 8: ลูกเสือ",
      keywords: "ม.2/2 พุธ ตารางเรียน schedule ลูกเสือ",
      category: "เวลาเรียน"
    },
    {
      question: "ม.2/2 วันพฤหัสบดี เรียนเรียนอะไร",
      answer: "ม.2/2 วันพฤหัสบดี ชุดนักเรียน\nช่วง Homeroom: ที่ปรึกษา 211\nคาบที่ 1: ท22102 ครูธัชญาณี 725\nคาบที่ 2: ศ22102 ครูวรพล 712\nคาบที่ 3: พ22102 ครูวิทยา หอประชุม\nคาบที่ 4: อ22102 ครูพิกุลทอง 124\nคาบที่ 5: พักเที่ยง\nคาบที่ 6: ท20202 ครูธัชญาณี 725\nคาบที่ 7: ส22104 ครูโกสิทธิ์\nคาบที่ 8: ชุมนุม",
      keywords: "ม.2/2 พฤหัสบดี ตารางเรียน schedule",
      category: "เวลาเรียน"
    },
    {
      question: "ม.2/2 วันศุกร์ เรียนเรียนอะไร",
      answer: "ม.2/2 วันศุกร์ ชุดนักเรียน\nช่วง Homeroom: ที่ปรึกษา 211\nคาบที่ 1: แนะแนว ครูณัฐริกา 311\nคาบที่ 2: ค22102 ครูลดาวัลย์ 122\nคาบที่ 3: IS/STEM ครูมะรุสดี 723\nคาบที่ 4: IS/STEM ครูมะรุสดี 723\nคาบที่ 5: พักเที่ยง\nคาบที่ 6: ว22102 ครูบุณยาพร 222\nคาบที่ 7: ว22102 ครูบุณยาพร 222\nคาบที่ 8: ซ่อมเสริม",
      keywords: "ม.2/2 ศุกร์ ตารางเรียน schedule",
      category: "เวลาเรียน"
    }
  ];

  const now = new Date().toISOString();
  let count = 0;
  const stmt = db.prepare('INSERT INTO ai_knowledge (question, answer, keywords, category, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)');

  for (const item of scheduleData) {
    const existing = db.prepare('SELECT id FROM ai_knowledge WHERE question = ?').get(item.question);
    if (!existing) {
      stmt.run(item.question, item.answer, item.keywords, item.category, now, now);
      count++;
    }
  }

  return count;
}

// Initialize schedules data for M.2/3
export function initializeSchedulesForM2_3() {
  const scheduleData = [
    {
      question: "ม.2/3 วันจันทร์ เรียนเรียนอะไร",
      answer: "ม.2/3 วันจันทร์ ชุดนักเรียน\nช่วง Homeroom: ที่ปรึกษา 122\nคาบที่ 1: ท20202 ครูธัชญาณี 725\nคาบที่ 2: ศ22102 ครูวรพล 712\nคาบที่ 3: จ22204 ครูณฐิยา 123\nคาบที่ 4: ส22104 ครูโกสิทธิ์ 125\nคาบที่ 5: พักเที่ยง\nคาบที่ 6: ซ่อมเสริม\nคาบที่ 7: ท22102 ครูธัชญาณี 725\nคาบที่ 8: ค22102 ครูลดาวัลย์ 122",
      keywords: "ม.2/3 จันทร์ ตารางเรียน schedule",
      category: "เวลาเรียน"
    },
    {
      question: "ม.2/3 วันอังคาร เรียนเรียนอะไร",
      answer: "ม.2/3 วันอังคาร ชุดนักเรียน\nช่วง Homeroom: ที่ปรึกษา 122\nคาบที่ 1: ว22214 ครูรังสิมันต์ 134\nคาบที่ 2: พ22102 ครูวิทยา หอประชุม\nคาบที่ 3: ว22104 ครูวันวิสาข์ 133\nคาบที่ 4: ค22102 ครูลดาวัลย์ 122\nคาบที่ 5: พักเที่ยง\nคาบที่ 6: IS/STEM ครูประพิณ 722\nคาบที่ 7: IS/STEM ครูประพิณ 722\nคาบที่ 8: ประชุม ม.2 หอประชุม",
      keywords: "ม.2/3 อังคาร ตารางเรียน schedule",
      category: "เวลาเรียน"
    },
    {
      question: "ม.2/3 วันพุธ เรียนเรียนอะไร",
      answer: "ม.2/3 วันพุธ ชุดลูกเสือ\nช่วง Homeroom: ที่ปรึกษา 122\nคาบที่ 1: อ22102 ครูพิกุลทอง 124\nคาบที่ 2: ว22102 ครูบุณยาพร 223\nคาบที่ 3: ส22104 ครูโกสิทธิ์ 125\nคาบที่ 4: ท20202 ครูธัชญาณี 725\nคาบที่ 5: พักเที่ยง\nคาบที่ 6: ศ22102 ครูวรพล 712\nคาบที่ 7: ซ่อมเสริม ที่ปรึกษา 122\nคาบที่ 8: ลูกเสือ",
      keywords: "ม.2/3 พุธ ตารางเรียน schedule ลูกเสือ",
      category: "เวลาเรียน"
    },
    {
      question: "ม.2/3 วันพฤหัสบดี เรียนเรียนอะไร",
      answer: "ม.2/3 วันพฤหัสบดี ชุดนักเรียน\nช่วง Homeroom: ที่ปรึกษา 122\nคาบที่ 1: จ22204 ครูณฐิยา 123\nคาบที่ 2: ท22102 ครูธัชญาณี 725\nคาบที่ 3: ค22102 ครูลดาวัลย์ 122\nคาบที่ 4: แนะแนว ครูราโมนา 223\nคาบที่ 5: พักเที่ยง\nคาบที่ 6: ส22164 ครูกฤษกาน 116\nคาบที่ 7: อ22102 ครูพิกุลทอง 124\nคาบที่ 8: ชุมนุม",
      keywords: "ม.2/3 พฤหัสบดี ตารางเรียน schedule",
      category: "เวลาเรียน"
    },
    {
      question: "ม.2/3 วันศุกร์ เรียนเรียนอะไร",
      answer: "ม.2/3 วันศุกร์ ชุดพละ\nช่วง Homeroom: ที่ปรึกษา 122\nคาบที่ 1: ว22102 ครูบุณยาพร 224\nคาบที่ 2: ว22102 ครูบุณยาพร 224\nคาบที่ 3: ส22104 ครูโกสิทธิ์ 125\nคาบที่ 4: พ22104 ครูสุนิษา หอประชุม\nคาบที่ 5: พักเที่ยง\nคาบที่ 6: อ22102 ครูพิกุลทอง 123\nคาบที่ 7: ท22102 ครูธัชญาณี 725\nคาบที่ 8: ง22102 ครูวันชรินทร์ 411",
      keywords: "ม.2/3 ศุกร์ ตารางเรียน schedule พละ",
      category: "เวลาเรียน"
    }
  ];

  const now = new Date().toISOString();
  let count = 0;
  const stmt = db.prepare('INSERT INTO ai_knowledge (question, answer, keywords, category, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)');

  for (const item of scheduleData) {
    const existing = db.prepare('SELECT id FROM ai_knowledge WHERE question = ?').get(item.question);
    if (!existing) {
      stmt.run(item.question, item.answer, item.keywords, item.category, now, now);
      count++;
    }
  }

  return count;
}

// Initialize schedules data for M.2/4
export function initializeSchedulesForM2_4() {
  const scheduleData = [
    {
      question: "ม.2/4 วันจันทร์ เรียนเรียนอะไร",
      answer: "ม.2/4 วันจันทร์ ชุดนักเรียน\nช่วง Homeroom: ที่ปรึกษา 125\nคาบที่ 1: อ22102 ครูพิกุลทอง 125\nคาบที่ 2: พ22104 ครูสุนิษา หอประชุม\nคาบที่ 3: ค22102 ครูลดาวัลย์ 122\nคาบที่ 4: ศ22102 ครูวรพล 712\nคาบที่ 5: พักเที่ยง\nคาบที่ 6: ว22102 ครูบุณยาพร 223\nคาบที่ 7: ว22102 ครูบุณยาพร 223\nคาบที่ 8: ส22104 ครูโกสิทธิ์ 125",
      keywords: "ม.2/4 จันทร์ ตารางเรียน schedule",
      category: "เวลาเรียน"
    },
    {
      question: "ม.2/4 วันอังคาร เรียนเรียนอะไร",
      answer: "ม.2/4 วันอังคาร ชุดพละ\nช่วง Homeroom: ที่ปรึกษา 125\nคาบที่ 1: ว22102 ครูบุณยาพร 722\nคาบที่ 2: ท22102 ครูธัญญาลักณี 725\nคาบที่ 3: ส22164 ครูกฤษกาน 125\nคาบที่ 4: พ22102 ครูวิทยา หอประชุม\nคาบที่ 5: พักเที่ยง\nคาบที่ 6: ศ20211 ครูศดานันท์ 113\nคาบที่ 7: ง22102 ครูวัชรินทร์ 411\nคาบที่ 8: ประชุม ม.2 หอประชุม",
      keywords: "ม.2/4 อังคาร ตารางเรียน schedule พละ",
      category: "เวลาเรียน"
    },
    {
      question: "ม.2/4 วันพุธ เรียนเรียนอะไร",
      answer: "ม.2/4 วันพุธ ชุดลูกเสือ\nช่วง Homeroom: ที่ปรึกษา 125\nคาบที่ 1: ท22102 ครูธัญญาลักณี 725\nคาบที่ 2: ศ20211 ครูศดานันท์ 113\nคาบที่ 3: ว22104 ครูวันวิสาข์ 133\nคาบที่ 4: ค22102 ครูลดาวัลย์ 122\nคาบที่ 5: พักเที่ยง\nคาบที่ 6: อ22102 ครูพิกุลทอง 311\nคาบที่ 7: ซ่อมเสริม ที่ปรึกษา 125\nคาบที่ 8: ลูกเสือ",
      keywords: "ม.2/4 พุธ ตารางเรียน schedule ลูกเสือ",
      category: "เวลาเรียน"
    },
    {
      question: "ม.2/4 วันพฤหัสบดี เรียนเรียนอะไร",
      answer: "ม.2/4 วันพฤหัสบดี ชุดนักเรียน\nช่วง Homeroom: ที่ปรึกษา 125\nคาบที่ 1: ค22102 ครูลดาวัลย์ 122\nคาบที่ 2: ซ่อมเสริม\nคาบที่ 3: IS/STEM ครูธนากิต 724\nคาบที่ 4: IS/STEM ครูธนากิต 724\nคาบที่ 5: พักเที่ยง\nคาบที่ 6: ส22104 ครูโกสิทธิ์ 125\nคาบที่ 7: ว22214 ครูรังสิมันต์ 134\nคาบที่ 8: ชุมนุม",
      keywords: "ม.2/4 พฤหัสบดี ตารางเรียน schedule",
      category: "เวลาเรียน"
    },
    {
      question: "ม.2/4 วันศุกร์ เรียนเรียนอะไร",
      answer: "ม.2/4 วันศุกร์ ชุดนักเรียน\nช่วง Homeroom: ที่ปรึกษา 125\nคาบที่ 1: ศ22102 ครูวรพล 712\nคาบที่ 2: ท22102 ครูธัญญาลักณี 725\nคาบที่ 3: ซ่อมเสริม\nคาบที่ 4: แนะแนว ครูราโมนา 724\nคาบที่ 5: พักเที่ยง\nคาบที่ 6: ส22104 ครูโกสิทธิ์ 125\nคาบที่ 7: อ22102 ครูพิกุลทอง 123\nคาบที่ 8: ซ่อมเสริม",
      keywords: "ม.2/4 ศุกร์ ตารางเรียน schedule",
      category: "เวลาเรียน"
    }
  ];

  const now = new Date().toISOString();
  let count = 0;
  const stmt = db.prepare('INSERT INTO ai_knowledge (question, answer, keywords, category, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)');

  for (const item of scheduleData) {
    const existing = db.prepare('SELECT id FROM ai_knowledge WHERE question = ?').get(item.question);
    if (!existing) {
      stmt.run(item.question, item.answer, item.keywords, item.category, now, now);
      count++;
    }
  }

  return count;
}

// Initialize schedules data for M.2/5
export function initializeSchedulesForM2_5() {
  const scheduleData = [
    {
      question: "ม.2/5 วันจันทร์ เรียนเรียนอะไร",
      answer: "ม.2/5 วันจันทร์ ชุดนักเรียน\nช่วง Homeroom: ที่ปรึกษา 725\nคาบที่ 1: ศ22102 ครูวรพล 712\nคาบที่ 2: ท22102 ครูธัชญาณี 725\nคาบที่ 3: ว22102 ครูบุณยาพร 224\nคาบที่ 4: ว22102 ครูบุณยาพร 224\nคาบที่ 5: พักเที่ยง\nคาบที่ 6: ค22102 ครูลดาวัลย์ 122\nคาบที่ 7: ศ20211 ครูศดานันท์ 113\nคาบที่ 8: ซ่อมเสริม",
      keywords: "ม.2/5 จันทร์ ตารางเรียน schedule",
      category: "เวลาเรียน"
    },
    {
      question: "ม.2/5 วันอังคาร เรียนเรียนอะไร",
      answer: "ม.2/5 วันอังคาร ชุดพละ\nช่วง Homeroom: ที่ปรึกษา 725\nคาบที่ 1: ว22104 ครูวันวิสาข์ 133\nคาบที่ 2: ส22104 ครูโกสิทธิ์ 125\nคาบที่ 3: พ22102 ครูวิทยา หอประชุม\nคาบที่ 4: ท22102 ครูธัชญาณี 725\nคาบที่ 5: พักเที่ยง\nคาบที่ 6: อ22102 ครูพิกุลทอง 123\nคาบที่ 7: ซ่อมเสริม\nคาบที่ 8: ประชุม ม.2 หอประชุม",
      keywords: "ม.2/5 อังคาร ตารางเรียน schedule พละ",
      category: "เวลาเรียน"
    },
    {
      question: "ม.2/5 วันพุธ เรียนเรียนอะไร",
      answer: "ม.2/5 วันพุธ ชุดลูกเสือ\nช่วง Homeroom: ที่ปรึกษา 725\nคาบที่ 1: ค22102 ครูลดาวัลย์ 122\nคาบที่ 2: ท22102 ครูธัชญาณี 725\nคาบที่ 3: ท22102 ครูธัชญาณี 725\nคาบที่ 4: อ22102 ครูพิกุลทอง 123\nคาบที่ 5: พักเที่ยง\nคาบที่ 6: ว22214 ครูรังสิมันต์ 134\nคาบที่ 7: ซ่อมเสริม ที่ปรึกษา 725\nคาบที่ 8: ลูกเสือ",
      keywords: "ม.2/5 พุธ ตารางเรียน schedule ลูกเสือ",
      category: "เวลาเรียน"
    },
    {
      question: "ม.2/5 วันพฤหัสบดี เรียนเรียนอะไร",
      answer: "ม.2/5 วันพฤหัสบดี ชุดนักเรียน\nช่วง Homeroom: ที่ปรึกษา 725\nคาบที่ 1: ศ22102 ครูวรพล 712\nคาบที่ 2: ค22102 ครูลดาวัลย์ 122\nคาบที่ 3: ส22104 ครูโกสิทธิ์ 126\nคาบที่ 4: ส22164 ครูกฤษกาน 116\nคาบที่ 5: พักเที่ยง\nคาบที่ 6: อ22102 ครูพิกุลทอง 123\nคาบที่ 7: ว22102 ครูบุณยาพร 224\nคาบที่ 8: ชุมนุม",
      keywords: "ม.2/5 พฤหัสบดี ตารางเรียน schedule",
      category: "เวลาเรียน"
    },
    {
      question: "ม.2/5 วันศุกร์ เรียนเรียนอะไร",
      answer: "ม.2/5 วันศุกร์ ชุดพละ\nช่วง Homeroom: ที่ปรึกษา 725\nคาบที่ 1: ง22102 ครูวัชรินทร์ 411\nคาบที่ 2: แนะแนว ครูราโมนา 724\nคาบที่ 3: ซ่อมเสริม\nคาบที่ 4: ศ20211 ครูศดานันท์ 113\nคาบที่ 5: พักเที่ยง\nคาบที่ 6: ท22102 ครูธัชญาณี 725\nคาบที่ 7: ส22104 ครูโกสิทธิ์ 125\nคาบที่ 8: พ22104 ครูสุนิษา หอประชุม",
      keywords: "ม.2/5 ศุกร์ ตารางเรียน schedule พละ",
      category: "เวลาเรียน"
    }
  ];

  const now = new Date().toISOString();
  let count = 0;
  const stmt = db.prepare('INSERT INTO ai_knowledge (question, answer, keywords, category, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)');

  for (const item of scheduleData) {
    const existing = db.prepare('SELECT id FROM ai_knowledge WHERE question = ?').get(item.question);
    if (!existing) {
      stmt.run(item.question, item.answer, item.keywords, item.category, now, now);
      count++;
    }
  }

  return count;
}

// Initialize schedules data for M.3/1
export function initializeSchedulesForM3_1() {
  const scheduleData = [
    {
      question: "ม.3/1 วันจันทร์ เรียนเรียนอะไร",
      answer: "ม.3/1 วันจันทร์ ชุดนักเรียน\nช่วง Homeroom: ที่ปรึกษา 116\nคาบที่ 1: ท23102 ครูมะรุสดี 723\nคาบที่ 2: ง23102 ครูอุไรวรร 411\nคาบที่ 3: ว23214 ครูวุฒิพงศ์ 134\nคาบที่ 4: พ23104 ครูวิทยา พลานามัย\nคาบที่ 5: พักเที่ยง\nคาบที่ 6: ค23102 ครูวุฒิชัย 136\nคาบที่ 7: แนะแนว ครูราโมนา 712\nคาบที่ 8: ซ่อมเสริม",
      keywords: "ม.3/1 จันทร์ ตารางเรียน schedule",
      category: "เวลาเรียน"
    },
    {
      question: "ม.3/1 วันอังคาร เรียนเรียนอะไร",
      answer: "ม.3/1 วันอังคาร ชุดนักเรียน\nช่วง Homeroom: ที่ปรึกษา 116\nคาบที่ 1: ศ23102 ครูสุริวิภา 311\nคาบที่ 2: ส23106 ครูวิชาญ 135\nคาบที่ 3: ค23202 ครูลดาวัลย์ 122\nคาบที่ 4: อ23102 ครูศศิตา 124\nคาบที่ 5: พักเที่ยง\nคาบที่ 6: พ23102 ครูภิสรรค์ 117\nคาบที่ 7: ประชุม ม.3 หอประชุม\nคาบที่ 8: ท23102 ครูมะรุสดี 723",
      keywords: "ม.3/1 อังคาร ตารางเรียน schedule",
      category: "เวลาเรียน"
    },
    {
      question: "ม.3/1 วันพุธ เรียนเรียนอะไร",
      answer: "ม.3/1 วันพุธ ชุดลูกเสือ\nช่วง Homeroom: ที่ปรึกษา 116\nคาบที่ 1: ค23102 ครูวุฒิชัย 123\nคาบที่ 2: ศ23102 ครูสุริวิภา 311\nคาบที่ 3: ว23102 ครูเจนจิรา 224\nคาบที่ 4: ส23166 ครูณัฐวัตร 126\nคาบที่ 5: พักเที่ยง\nคาบที่ 6: ค23202 ครูลดาวัลย์ 122\nคาบที่ 7: ซ่อมเสริมที่ปรึษา 116\nคาบที่ 8: ลูกเสือ",
      keywords: "ม.3/1 พุธ ตารางเรียน schedule ลูกเสือ",
      category: "เวลาเรียน"
    },
    {
      question: "ม.3/1 วันพฤหัสบดี เรียนเรียนอะไร",
      answer: "ม.3/1 วันพฤหัสบดี ชุดนักเรียน\nช่วง Homeroom: ที่ปรึกษา 116\nคาบที่ 1: อ23102 ครูศศิตา พลานามัย\nคาบที่ 2: ส23106 ครูวิชาญ 116\nคาบที่ 3: ซ่อมเสริม\nคาบที่ 4: ค23102 ครูวุฒิชัย 136\nคาบที่ 5: พักเที่ยง\nคาบที่ 6: ว23102 ครูเจนจิรา 224\nคาบที่ 7: ว23102 ครูเจนจิรา 224\nคาบที่ 8: ชุมนุม",
      keywords: "ม.3/1 พฤหัสบดี ตารางเรียน schedule",
      category: "เวลาเรียน"
    },
    {
      question: "ม.3/1 วันศุกร์ เรียนเรียนอะไร",
      answer: "ม.3/1 วันศุกร์ ชุดพละ\nช่วง Homeroom: ที่ปรึกษา 116\nคาบที่ 1: ค23202 ครูลดาวัลย์ 122\nคาบที่ 2: อ23102 ครูศศิตา 124\nคาบที่ 3: ว23104 ครูรังสิมันต์ 134\nคาบที่ 4: ส23106 ครูวิชาญ 135\nคาบที่ 5: พักเที่ยง\nคาบที่ 6: ว23212 ครูเจนจิรา 224\nคาบที่ 7: ว23212 ครูเจนจิรา 224\nคาบที่ 8: ท23102 ครูมะรุสดี 723",
      keywords: "ม.3/1 ศุกร์ ตารางเรียน schedule พละ",
      category: "เวลาเรียน"
    }
  ];

  const now = new Date().toISOString();
  let count = 0;
  const stmt = db.prepare('INSERT INTO ai_knowledge (question, answer, keywords, category, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)');

  for (const item of scheduleData) {
    const existing = db.prepare('SELECT id FROM ai_knowledge WHERE question = ?').get(item.question);
    if (!existing) {
      stmt.run(item.question, item.answer, item.keywords, item.category, now, now);
      count++;
    }
  }

  return count;
}

// Initialize schedules data for M.3/2
export function initializeSchedulesForM3_2() {
  const scheduleData = [
    {
      question: "ม.3/2 วันจันทร์ เรียนเรียนอะไร",
      answer: "ม.3/2 วันจันทร์ ชุดพละ\nช่วง Homeroom: ที่ปรึกษา 124\nคาบที่ 1: อ23102 ครูศศิตา 133\nคาบที่ 2: ส23106 ครูวิชาญ 126\nคาบที่ 3: ศ23102 ครูสุริวิภา 311\nคาบที่ 4: ซ่อมเสริม\nคาบที่ 5: พักเที่ยง\nคาบที่ 6: พ23104 ครูวิทยา หอประชุม\nคาบที่ 7: ท23102 ครูมะรุสดี 723\nคาบที่ 8: อ23202 ครูกรรศิภร 117",
      keywords: "ม.3/2 จันทร์ ตารางเรียน schedule พละ",
      category: "เวลาเรียน"
    },
    {
      question: "ม.3/2 วันอังคาร เรียนเรียนอะไร",
      answer: "ม.3/2 วันอังคาร ชุดนักเรียน\nช่วง Homeroom: ที่ปรึกษา 124\nคาบที่ 1: ท23102 ครูมะรุสดี 723\nคาบที่ 2: ศ23102 ครูสุริวิภา 311\nคาบที่ 3: ซ่อมเสริม\nคาบที่ 4: จ23206 ครูณฐิยา 123\nคาบที่ 5: พักเที่ยง\nคาบที่ 6: ค23102 ครูวุฒิชัย 122\nคาบที่ 7: ประชุม ม.3 หอประชุม\nคาบที่ 8: ส23106 ครูวิชาญ 125",
      keywords: "ม.3/2 อังคาร ตารางเรียน schedule",
      category: "เวลาเรียน"
    },
    {
      question: "ม.3/2 วันพุธ เรียนเรียนอะไร",
      answer: "ม.3/2 วันพุธ ชุดลูกเสือ\nช่วง Homeroom: ที่ปรึกษา 124\nคาบที่ 1: อ23102 ครูศศิตา ห้อง 223\nคาบที่ 2: อ23202 ครูกรรศศิภร ห้อง 117\nคาบที่ 3: ค23102 ครูวุฒิชัย ห้อง 116\nคาบที่ 4: ว23102 ครูเจนจิรา ห้อง 224\nคาบที่ 5: พักเที่ยง\nคาบที่ 6: พ23102 ครูภิสรรค์ พลานามัย\nคาบที่ 7: ซ่อมเสริม ที่ปรึกษา ห้อง 124\nคาบที่ 8: ลูกเสือ",
      keywords: "ม.3/2 พุธ ตารางเรียน schedule ลูกเสือ",
      category: "เวลาเรียน"
    },
    {
      question: "ม.3/2 วันพฤหัสบดี เรียนเรียนอะไร",
      answer: "ม.3/2 วันพฤหัสบดี ชุดนักเรียน\nช่วง Homeroom: ที่ปรึกษา 124\nคาบที่ 1: แนะแนว ครูราโมนา ห้อง 117\nคาบที่ 2: ว23104 ครูรังสิมันต์ ห้อง 134\nคาบที่ 3: ว23102 ครูเจนจิรา ห้อง 224\nคาบที่ 4: ว23102 ครูเจนจิรา ห้อง 224\nคาบที่ 5: พักเที่ยง\nคาบที่ 6: ท23102 ครูมะรุสดี ห้อง 723\nคาบที่ 7: ค23102 ครูวุฒิชัย ห้อง 136\nคาบที่ 8: ชุมนุม",
      keywords: "ม.3/2 พฤหัสบดี ตารางเรียน schedule",
      category: "เวลาเรียน"
    },
    {
      question: "ม.3/2 วันศุกร์ เรียนเรียนอะไร",
      answer: "ม.3/2 วันศุกร์ ชุดนักเรียน\nช่วง Homeroom: ที่ปรึกษา 124\nคาบที่ 1: ส23166 ครูธัญลักษณ์ ห้องสมุด\nคาบที่ 2: จ23206 ครูณฐิยา ห้อง 123\nคาบที่ 3: ง23102 ครูอุไรวรร ห้อง 411\nคาบที่ 4: ซ่อมเสริม\nคาบที่ 5: พักเที่ยง\nคาบที่ 6: อ23102 ครูศศิตา ห้อง 117\nคาบที่ 7: ว23214 ครูวุฒิพงศ์ ห้อง 134\nคาบที่ 8: ส23106 ครูวิชาญ ห้อง 135",
      keywords: "ม.3/2 ศุกร์ ตารางเรียน schedule",
      category: "เวลาเรียน"
    }
  ];

  const now = new Date().toISOString();
  let count = 0;
  const stmt = db.prepare('INSERT INTO ai_knowledge (question, answer, keywords, category, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)');

  for (const item of scheduleData) {
    const existing = db.prepare('SELECT id FROM ai_knowledge WHERE question = ?').get(item.question);
    if (!existing) {
      stmt.run(item.question, item.answer, item.keywords, item.category, now, now);
      count++;
    }
  }

  return count;
}

// Initialize schedules data for M.3/3
export function initializeSchedulesForM3_3() {
  const scheduleData = [
    {
      question: "ม.3/3 วันจันทร์ เรียนเรียนอะไร",
      answer: "ม.3/3 วันจันทร์ ชุดนักเรียน\nช่วง Homeroom: ที่ปรึกษา 723\nคาบที่ 1: ส23106 ครูวิชาญ 135\nคาบที่ 2: ท23102 ครูมะรัสดี 723\nคาบที่ 3: ส23166 ครูธัญลักษ ห้องสมุด\nคาบที่ 4: ซ่อมเสริม\nคาบที่ 5: พักเที่ยง\nคาบที่ 6: อ23102 ครูศศิตา 116\nคาบที่ 7: ค23102 ครูวิฒิชัย 122\nคาบที่ 8: ศ23102 ครูสุริวิภา 311",
      keywords: "ม.3/3 จันทร์ ตารางเรียน schedule",
      category: "เวลาเรียน"
    },
    {
      question: "ม.3/3 วันอังคาร เรียนเรียนอะไร",
      answer: "ม.3/3 วันอังคาร ชุดนักเรียน\nช่วง Homeroom: ที่ปรึกษา 723\nคาบที่ 1: แนะแนว ครูราโมนา 724\nคาบที่ 2: จ23206 ครูณฐิยา 123\nคาบที่ 3: ว23102 ครูเจนจิรา 224\nคาบที่ 4: ว23102 ครูเจนจิรา 224\nคาบที่ 5: พักเที่ยง\nคาบที่ 6: อ23102 ครูศศิตา 124\nคาบที่ 7: ประชุม ม.3 หอประชุม\nคาบที่ 8: ค23102 ครูวุฒิชัย 122",
      keywords: "ม.3/3 อังคาร ตารางเรียน schedule",
      category: "เวลาเรียน"
    },
    {
      question: "ม.3/3 วันพุธ เรียนเรียนอะไร",
      answer: "ม.3/3 วันพุธ ชุดลูกเสือ\nช่วง Homeroom: ที่ปรึกษา 723\nคาบที่ 1: ศ20223 ครูวรพล 712\nคาบที่ 2: ท23102 ครูมะรุสดี 723\nคาบที่ 3: ซ่อมเสริม\nคาบที่ 4: พ23102 ครุภิสรรค์ พลานามัย\nคาบที่ 5: พักเที่ยง\nคาบที่ 6: ส23106 ครูวิชาญ 135\nคาบที่ 7: ซ่อมเสริม ที่ปรึกษา 723\nคาบที่ 8: ลูกเสือ",
      keywords: "ม.3/3 พุธ ตารางเรียน schedule ลูกเสือ",
      category: "เวลาเรียน"
    },
    {
      question: "ม.3/3 วันพฤหัสบดี เรียนเรียนอะไร",
      answer: "ม.3/3 วันพฤหัสบดี ชุดพละ\nช่วง Homeroom: ที่ปรึกษา 723\nคาบที่ 1: ว23104 ครูรังสิมันต์ 134\nคาบที่ 2: ซ่อมเสริม\nคาบที่ 3: ท23102 ครูมะรุสดี 723\nคาบที่ 4: พ23104 ครูวิทยา หอประชุม\nคาบที่ 5: พักเที่ยง\nคาบที่ 6: ศ23102 ครูสุริวิภา 311\nคาบที่ 7: จ23206 ครูณฐิยา 123\nคาบที่ 8: ชุมนุม",
      keywords: "ม.3/3 พฤหัสบดี ตารางเรียน schedule พละ",
      category: "เวลาเรียน"
    },
    {
      question: "ม.3/3 วันศุกร์ เรียนเรียนอะไร",
      answer: "ม.3/3 วันศุกร์ ชุดนักเรียน\nช่วง Homeroom: ที่ปรึกษา 723\nคาบที่ 1: ง23102 ครูอุไรวรร 117\nคาบที่ 2: ศ20223 ครูวรพล 712\nคาบที่ 3: ว23102 ครูเจนจิรา 224\nคาบที่ 4: แ23102 ครูศศิตา 124\nคาบที่ 5: พักเที่ยง\nคาบที่ 6: ว23214 ครูวุฒิพงศ์ 134\nคาบที่ 7: ส23106 ครูวิชาญ 126\nคาบที่ 8: ค23102 ครูวุฒิชัย 122",
      keywords: "ม.3/3 ศุกร์ ตารางเรียน schedule",
      category: "เวลาเรียน"
    }
  ];

  const now = new Date().toISOString();
  let count = 0;
  const stmt = db.prepare('INSERT INTO ai_knowledge (question, answer, keywords, category, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)');

  for (const item of scheduleData) {
    const existing = db.prepare('SELECT id FROM ai_knowledge WHERE question = ?').get(item.question);
    if (!existing) {
      stmt.run(item.question, item.answer, item.keywords, item.category, now, now);
      count++;
    }
  }

  return count;
}

// Initialize schedules data for M.3/4
export function initializeSchedulesForM3_4() {
  const scheduleData = [
    {
      question: "ม.3/4 วันจันทร์ เรียนเรียนอะไร",
      answer: "ม.3/4 วันจันทร์ ชุดนักเรียน\nช่วง Homeroom: ที่ปรึกษา 311\nคาบที่ 1: ศ23102 ครูสุริวิภา 311\nคาบที่ 2: อ23102 ครูศศิตา 124\nคาบที่ 3: อ23202 ครูกรรศิภร 124\nคาบที่ 4: ซ่อมเสริม\nคาบที่ 5: พักเที่ยง\nคาบที่ 6: ส23106 ครูวิชาญ 125\nคาบที่ 7: ว23102 ครูเจนจิรา 116\nคาบที่ 8: ว23102 ครูเจนจิรา 116",
      keywords: "ม.3/4 จันทร์ ตารางเรียน schedule",
      category: "เวลาเรียน"
    },
    {
      question: "ม.3/4 วันอังคาร เรียนเรียนอะไร",
      answer: "ม.3/4 วันอังคาร ชุดนักเรียน\nช่วง Homeroom: ที่ปรึกษา 311\nคาบที่ 1: พ23102 ครูภิสรรค์ หอประชุม\nคาบที่ 2: ซ่อมเสริม\nคาบที่ 3: ท23102 ครูมะรุสดี 723\nคาบที่ 4: ค23102 ครูวุฒิชัย 136\nคาบที่ 5: พักเที่ยง\nคาบที่ 6: แนะแนว ครูราโมนา ห้องสมุด\nคาบที่ 7: ประชุม ม.3 หอประชุม\nคาบที่ 8: ว23214 ครูวุฒิพงศ์ 134",
      keywords: "ม.3/4 อังคาร ตารางเรียน schedule",
      category: "เวลาเรียน"
    },
    {
      question: "ม.3/4 วันพุธ เรียนเรียนอะไร",
      answer: "ม.3/4 วันพุธ ชุดลูกเสือ\nช่วง Homeroom: ที่ปรึกษา 311\nคาบที่ 1: ง23102 ครูอุไรวรร 117\nคาบที่ 2: ส23168 ครูณัฐวัตร 126\nคาบที่ 3: ท23102 ครูมะรุสดี 723\nคาบที่ 4: ศ20226 ครูสุริวิภา 311\nคาบที่ 5: พักเที่ยง\nคาบที่ 6: ค23102 ครูวุฒิชัย 721\nคาบที่ 7: ซ่อมเสริม ที่ปรึกษา 311\nคาบที่ 8: ลุกเสือ",
      keywords: "ม.3/4 พุธ ตารางเรียน schedule ลูกเสือ",
      category: "เวลาเรียน"
    },
    {
      question: "ม.3/4 วันพฤหัสบดี เรียนเรียนอะไร",
      answer: "ม.3/4 วันพฤหัสบดี ชุดพละ\nช่วง Homeroom: ที่ปรึกษา 311\nคาบที่ 1: ท23102 ครูมะรุสดี 723\nคาบที่ 2: พ23104 ครูวิทยา หอประชุม\nคาบที่ 3: ศ23102 ครูสุริวิภา 311\nคาบที่ 4: ส23106 ครูวิชาญ 125\nคาบที่ 5: พักเที่ยง\nคาบที่ 6: อ23202 ครูกรรศิภร 124\nคาบที่ 7: อ23102 ครูศศิตา 117\nคาบที่ 8: ชุมนุม",
      keywords: "ม.3/4 พฤหัสบดี ตารางเรียน schedule พละ",
      category: "เวลาเรียน"
    },
    {
      question: "ม.3/4 วันศุกร์ เรียนเรียนอะไร",
      answer: "ม.3/4 วันศุกร์ ชุดนักเรียน\nช่วง Homeroom: ที่ปรึกษา 311\nคาบที่ 1: ค23102 ครูวุฒิชัย 125\nคาบที่ 2: ศ20226 ครูสุริวิภา 311\nคาบที่ 3: ส23106 ครูวิชาญ 135\nคาบที่ 4: ว23102 ครูเจนจิรา 224\nคาบที่ 5: พักเที่ยง\nคาบที่ 6: ซ่อมเสริม\nคาบที่ 7: ว23104 ครูรังสิมันต์ 133\nคาบที่ 8: อ23102 ครูศศิตา 125",
      keywords: "ม.3/4 ศุกร์ ตารางเรียน schedule",
      category: "เวลาเรียน"
    }
  ];

  const now = new Date().toISOString();
  let count = 0;
  const stmt = db.prepare('INSERT INTO ai_knowledge (question, answer, keywords, category, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)');

  for (const item of scheduleData) {
    const existing = db.prepare('SELECT id FROM ai_knowledge WHERE question = ?').get(item.question);
    if (!existing) {
      stmt.run(item.question, item.answer, item.keywords, item.category, now, now);
      count++;
    }
  }

  return count;
}

// Initialize schedules data for M.3/5
export function initializeSchedulesForM3_5() {
  const scheduleData = [
    {
      question: "ม.3/5 วันจันทร์ เรียนเรียนอะไร",
      answer: "ม.3/5 วันจันทร์ ชุดนักเรียน\nช่วง Homeroom: ที่ปรึกษา 224\nคาบที่ 1: ง23102 ครูอุไรวรร 411\nคาบที่ 2: ว23102 ครูเจนจิรา 224\nคาบที่ 3: ท23102 ครูมะรุสดี 723\nคาบที่ 4: ค23102 ครูวุฒิชัย 122\nคาบที่ 5: พักเที่ยง\nคาบที่ 6: ศ20226 ครูสุริวิภา 311\nคาบที่ 7: ซ่อมเสริม\nคาบที่ 8: ท23102 ครูมะรุสดี 723",
      keywords: "ม.3/5 จันทร์ ตารางเรียน schedule",
      category: "เวลาเรียน"
    },
    {
      question: "ม.3/5 วันอังคาร เรียนเรียนอะไร",
      answer: "ม.3/5 วันอังคาร ชุดนักเรียน\nช่วง Homeroom: ที่ปรึกษา 224\nคาบที่ 1: ว23102 ครูเจนจิรา 224\nคาบที่ 2: ว23102 ครูเจนจิรา 224\nคาบที่ 3: ศ23102 ครูสุริวิภา 311\nคาบที่ 4: ส23106 ครูวิชาญ 135\nคาบที่ 5: พักเที่ยง\nคาบที่ 6: ศ23102 ครูสุริวิภา 311\nคาบที่ 7: ประชุม ม.3 หอประชุม\nคาบที่ 8: อ23202 ครูกรรศิภร 124",
      keywords: "ม.3/5 อังคาร ตารางเรียน schedule",
      category: "เวลาเรียน"
    },
    {
      question: "ม.3/5 วันพุธ เรียนเรียนอะไร",
      answer: "ม.3/5 วันพุธ ชุดลูกเสือ\nช่วง Homeroom: ที่ปรึกษา 224\nคาบที่ 1: ส23106 ครูวิชาญ 721\nคาบที่ 2: ซ่อมเสริม\nคาบที่ 3: ว23214 ครูวุฒิพงศ์ 134\nคาบที่ 4: แนะแนว ครูราโมนา ห้องสมุด\nคาบที่ 5: พักเที่ยง\nคาบที่ 6: อ23102 ครูศศิตา 116\nคาบที่ 7: ซ่อมเสริม ที่ปรึกษา 224\nคาบที่ 8: ลูกเสือ",
      keywords: "ม.3/5 พุธ ตารางเรียน schedule ลูกเสือ",
      category: "เวลาเรียน"
    },
    {
      question: "ม.3/5 วันพฤหัสบดี เรียนเรียนอะไร",
      answer: "ม.3/5 วันพฤหัสบดี ชุดนักเรียน\nช่วง Homeroom: ที่ปรึกษา 224\nคาบที่ 1: ค23102 ครูวุฒิชัย 116\nคาบที่ 2: ท23102 ครูมะรุสดี 723\nคาบที่ 3: ส23106 ครูวิชาญ 125\nคาบที่ 4: ว23104 ครูรังสิมันต์ 134\nคาบที่ 5: พักเที่ยง\nคาบที่ 6: อ23102 ครูศศิตา 117\nคาบที่ 7: อ23202 ครูกรรศิภร 116\nคาบที่ 8: ชุมนุม",
      keywords: "ม.3/5 พฤหัสบดี ตารางเรียน schedule",
      category: "เวลาเรียน"
    },
    {
      question: "ม.3/5 วันศุกร์ เรียนเรียนอะไร",
      answer: "ม.3/5 วันศุกร์ ชุดพละ\nช่วง Homeroom: ที่ปรึกษา 224\nคาบที่ 1: พ23104 ครูวิทยา หอประชุม\nคาบที่ 2: พ23102 ครูภิสรรค์ 116\nคาบที่ 3: ซ่อมเสริม\nคาบที่ 4: ศ23102 ครูสุริวิภา 311\nคาบที่ 5: พักเที่ยง\nคาบที่ 6: ค23102 ครูวุฒิชัย 122\nคาบที่ 7: อ23102 ครูศศิตา 124\nคาบที่ 8: ส23166 ครูณัฐวัตร 126",
      keywords: "ม.3/5 ศุกร์ ตารางเรียน schedule พละ",
      category: "เวลาเรียน"
    }
  ];

  const now = new Date().toISOString();
  let count = 0;
  const stmt = db.prepare('INSERT INTO ai_knowledge (question, answer, keywords, category, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)');

  for (const item of scheduleData) {
    const existing = db.prepare('SELECT id FROM ai_knowledge WHERE question = ?').get(item.question);
    if (!existing) {
      stmt.run(item.question, item.answer, item.keywords, item.category, now, now);
      count++;
    }
  }

  return count;
}

// Initialize schedules data for M.4/1
export function initializeSchedulesForM4_1() {
  const scheduleData = [
    {
      question: "ม.4/1 วันจันทร์ เรียนเรียนอะไร",
      answer: "ม.4/1 วันจันทร์ ชุดนักเรียน\nช่วง Homeroom: ที่ปรึกษา พลานามัย\nคาบที่ 1: อ31102 ครูกรรศิภร 124\nคาบที่ 2: ส31102 ครูธัญลักษ ห้องสมุด\nคาบที่ 3: ศ31102 ครูปิยะนุช 113\nคาบที่ 4: พักเที่ยง\nคาบที่ 5: ค31102 ครูเบญจมา 135\nคาบที่ 6: อ31204 ครูพิกุลทอง 126\nคาบที่ 7: ว31202 ครูอัสม๊ะ 221\nคาบที่ 8: ว31202 ครูอัสม๊ะ 221",
      keywords: "ม.4/1 จันทร์ ตารางเรียน schedule",
      category: "เวลาเรียน"
    },
    {
      question: "ม.4/1 วันอังคาร เรียนเรียนอะไร",
      answer: "ม.4/1 วันอังคาร ชุดนักเรียน\nช่วง Homeroom: ที่ปรึกษา พลานามัย\nคาบที่ 1: ว31242 ครูณัฐริกา 223\nคาบที่ 2: ค31102 ครูเบญจมา 122\nคาบที่ 3: ค31202 ครูโสรวีร์ 136\nคาบที่ 4: พักเที่ยง\nคาบที่ 5: แนะแนว ครูโสรวีร์ 136\nคาบที่ 6: ท31102 ครูธนากิต 724\nคาบที่ 7: ว31202 ครูอัสม๊ะ 221\nคาบที่ 8: ว31202 ครูอัสม๊ะ 221",
      keywords: "ม.4/1 อังคาร ตารางเรียน schedule",
      category: "เวลาเรียน"
    },
    {
      question: "ม.4/1 วันพุธ เรียนเรียนอะไร",
      answer: "ม.4/1 วันพุธ ชุดพละ\nช่วง Homeroom: ที่ปรึกษา พลานามัย\nคาบที่ 1: ว31223 ครูปราณปริ 222\nคาบที่ 2: ว31223 ครูปราณปริ 222\nคาบที่ 3: ค31202 ครูโสรวีร์ 136\nคาบที่ 4: พักเที่ยง\nคาบที่ 5: ส31102 ครูธัญลักษ ห้องสมุด\nคาบที่ 6: ว31242 ครูณัฐริกา 223\nคาบที่ 7: ซ่อมเสริมที่ปรึกษา พลานามัย\nคาบที่ 8: สาธารณประโยชน์",
      keywords: "ม.4/1 พุธ ตารางเรียน schedule พละ",
      category: "เวลาเรียน"
    },
    {
      question: "ม.4/1 วันพฤหัสบดี เรียนเรียนอะไร",
      answer: "ม.4/1 วันพฤหัสบดี ชุดพละ\nช่วง Homeroom: ที่ปรึกษา พลานามัย\nคาบที่ 1: อ31204 ครูพิกุลทอง 311\nคาบที่ 2: อ31102 ครูกรรศิภร 124\nคาบที่ 3: พ31102 ครูสุนิษา พลานามัย\nคาบที่ 4: พักเที่ยง\nคาบที่ 5: ว31242 ครูณัฐริกา 224\nคาบที่ 6: ค31202 ครูโสรวีร์ 136\nคาบที่ 7: ประชุม ม.4 หอประชุม\nคาบที่ 8: ชุมนุม",
      keywords: "ม.4/1 พฤหัสบดี ตารางเรียน schedule พละ",
      category: "เวลาเรียน"
    },
    {
      question: "ม.4/1 วันศุกร์ เรียนเรียนอะไร",
      answer: "ม.4/1 วันศุกร์ ชุดนักเรียน\nช่วง Homeroom: ที่ปรึกษา พลานามัย\nคาบที่ 1: ท31102 ครูธนากิต 724\nคาบที่ 2: ง31102 ครูอุไรวรร 411\nคาบที่ 3: IS/STEM ครูอัสม๊ะ 221\nคาบที่ 4: พักเที่ยง\nคาบที่ 5: IS/STEM ครูอัสม๊ะ 221\nคาบที่ 6: ว31223 ครูปราณปริ 722\nคาบที่ 7: ซ่อมเสริม\nคาบที่ 8: ค31202 ครูโสรวีร์ 136",
      keywords: "ม.4/1 ศุกร์ ตารางเรียน schedule",
      category: "เวลาเรียน"
    }
  ];

  const now = new Date().toISOString();
  let count = 0;
  const stmt = db.prepare('INSERT INTO ai_knowledge (question, answer, keywords, category, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)');

  for (const item of scheduleData) {
    const existing = db.prepare('SELECT id FROM ai_knowledge WHERE question = ?').get(item.question);
    if (!existing) {
      stmt.run(item.question, item.answer, item.keywords, item.category, now, now);
      count++;
    }
  }

  return count;
}

// Initialize schedules data for M.4/2
export function initializeSchedulesForM4_2() {
  const scheduleData = [
    {
      question: "ม.4/2 วันจันทร์ เรียนเรียนอะไร",
      answer: "ม.4/2 วันจันทร์ ชุดนักเรียน\nช่วง Homeroom: ที่ปรึกษา 113\nคาบที่ 1: ว30130 ครูปราณปริ 222\nคาบที่ 2: ว30130 ครูปราณปริ 222\nคาบที่ 3: ท31102 ครูธนากิต 724\nคาบที่ 4: พักเที่ยง\nคาบที่ 5: อ31102 ครูกรรศิภร 124\nคาบที่ 6: ส31102 ครูธัญลักษ ห้องสมุด\nคาบที่ 7: ว31293 ครูวุฒิพงศ์ 133\nคาบที่ 8: ศ31203 ครูปิยะนุช 113",
      keywords: "ม.4/2 จันทร์ ตารางเรียน schedule",
      category: "เวลาเรียน"
    },
    {
      question: "ม.4/2 วันอังคาร เรียนเรียนอะไร",
      answer: "ม.4/2 วันอังคาร ชุดพละ\nช่วง Homeroom: ที่ปรึกษา 113\nคาบที่ 1: พ31102 ครูสุนิษา พลานามัย\nคาบที่ 2: อ31102 ครูกรรศิภร 124\nคาบที่ 3: ศ31102 ครูปิยะนุช 113\nคาบที่ 4: พักเที่ยง\nคาบที่ 5: ง30262 ครูอุไรวรร 135\nคาบที่ 6: ง30262 ครูอุไรวรร 135\nคาบที่ 7: ซ่อมเสริม\nคาบที่ 8: ส31102 ครูธัญลักษณ ห้องสมุด",
      keywords: "ม.4/2 อังคาร ตารางเรียน schedule พละ",
      category: "เวลาเรียน"
    },
    {
      question: "ม.4/2 วันพุธ เรียนเรียนอะไร",
      answer: "ม.4/2 วันพุธ ชุดพละ\nช่วง Homeroom: ที่ปรึกษา 113\nคาบที่ 1: ศ31203 ครูปิยะนุช 113\nคาบที่ 2: ส31263 ครูโกสิทธิ์ 125\nคาบที่ 3: จ31204 ครูณฐิยา 123\nคาบที่ 4: พักเที่ยง\nคาบที่ 5: ว31293 ครูวุฒิพงศ์ 133\nคาบที่ 6: ง31102 ครูอุไรวรร 411\nคาบที่ 7: ซ่อมเสริม ที่ปรึกษา 113\nคาบที่ 8: สาธารณประโยชน์",
      keywords: "ม.4/2 พุธ ตารางเรียน schedule พละ",
      category: "เวลาเรียน"
    },
    {
      question: "ม.4/2 วันพฤหัสบดี เรียนเรียนอะไร",
      answer: "ม.4/2 วันพฤหัสบดี ชุดพละ\nช่วง Homeroom: ที่ปรึกษา 113\nคาบที่ 1: ค31102 ครูเบญจมา 126\nคาบที่ 2: อ31202 ครูพิกุลทอง 311\nคาบที่ 3: แนะแนว ครูวุฒิพงศ์ 133\nคาบที่ 4: พักเที่ยง\nคาบที่ 5: พ30202 ครูภิสรรค์ สนามบาส\nคาบที่ 6: พ30202 ครูภิสรรค์ สนามบาส\nคาบที่ 7: ประชุม ม.4 หอประชุม\nคาบที่ 8: ชุมนุม",
      keywords: "ม.4/2 พฤหัสบดี ตารางเรียน schedule พละ",
      category: "เวลาเรียน"
    },
    {
      question: "ม.4/2 วันศุกร์ เรียนเรียนอะไร",
      answer: "ม.4/2 วันศุกร์ ชุดนักเรียน\nช่วง Homeroom: ที่ปรึกษา 113\nคาบที่ 1: IS/STEM ครูวุฒิพงศ์ 134\nคาบที่ 2: IS/STEM ครูวุฒิพงศ์ 134\nคาบที่ 3: ท31102 ครูธนากิต 724\nคาบที่ 4: พักเที่ยง\nคาบที่ 5: ว30130 ครูปราณปริ 222\nคาบที่ 6: ค31102 ครูเบญจมา 136\nคาบที่ 7: ซ่อมเสริม\nคาบที่ 8: ส31263 ครูโกสิทธิ์ พลานามัย",
      keywords: "ม.4/2 ศุกร์ ตารางเรียน schedule",
      category: "เวลาเรียน"
    }
  ];

  const now = new Date().toISOString();
  let count = 0;
  const stmt = db.prepare('INSERT INTO ai_knowledge (question, answer, keywords, category, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)');

  for (const item of scheduleData) {
    const existing = db.prepare('SELECT id FROM ai_knowledge WHERE question = ?').get(item.question);
    if (!existing) {
      stmt.run(item.question, item.answer, item.keywords, item.category, now, now);
      count++;
    }
  }

  return count;
}

// Initialize schedules data for M.4/3
export function initializeSchedulesForM4_3() {
  const scheduleData = [
    {
      question: "ม.4/3 วันจันทร์ เรียนเรียนอะไร",
      answer: "ม.4/3 วันจันทร์ ชุดพละ\nช่วง Homeroom: ที่ปรึกษา 411\nคาบที่ 1: พ31102 ครูสุนิษา พลานามัย\nคาบที่ 2: ศ31203 ครูปิยะนุช 113\nคาบที่ 3: ซ่อมเสริม\nคาบที่ 4: พักเที่ยง\nคาบที่ 5: ว30130 ครูปราณปริ 222\nคาบที่ 6: ว30130 ครูปราณปริ 222\nคาบที่ 7: ง30262 ครูอุไรวรร 135\nคาบที่ 8: ง30262 ครูอุไรวรร 135",
      keywords: "ม.4/3 จันทร์ ตารางเรียน schedule พละ",
      category: "เวลาเรียน"
    },
    {
      question: "ม.4/3 วันอังคาร เรียนเรียนอะไร",
      answer: "ม.4/3 วันอังคาร ชุดนักเรียน\nช่วง Homeroom: ที่ปรึกษา 411\nคาบที่ 1: ส31263 ครูโกสิทธิ์ 125\nคาบที่ 2: IS/STEM ครูอัสม๊ะ 116\nคาบที่ 3: IS/STEM ครูอัสม๊ะ 116\nคาบที่ 4: พักเที่ยง\nคาบที่ 5: ท31102 ครูมะรุสดี 723\nคาบที่ 6: ว31293 ครูวุฒิพงศ์ 133\nคาบที่ 7: อ31102 ครูกรรศิภร 124\nคาบที่ 8: ง31102 ครูอุไรวรร 411",
      keywords: "ม.4/3 อังคาร ตารางเรียน schedule",
      category: "เวลาเรียน"
    },
    {
      question: "ม.4/3 วันพุธ เรียนเรียนอะไร",
      answer: "ม.4/3 วันพุธ ชุดพละ\nช่วง Homeroom: ที่ปรึกษา 411\nคาบที่ 1: ค31102 ครูเบญจมา 135\nคาบที่ 2: ส31102 ครูธัญลักษณ ห้องสมุด\nคาบที่ 3: ศ31203 ครูปิยะนุช 113\nคาบที่ 4: พักเที่ยง\nคาบที่ 5: ซ่อมเสริม\nคาบที่ 6: ส31263 ครูโกสิทธิ์ 125\nคาบที่ 7: ซ่อมเสริม ที่ปรึกษา 411\nคาบที่ 8: สาธารณประโยชน์",
      keywords: "ม.4/3 พุธ ตารางเรียน schedule พละ",
      category: "เวลาเรียน"
    },
    {
      question: "ม.4/3 วันพฤหัสบดี เรียนเรียนอะไร",
      answer: "ม.4/3 วันพฤหัสบดี ชุดนักเรียน\nช่วง Homeroom: ที่ปรึกษา 411\nคาบที่ 1: ศ31102 ครูปิยะนุช 113\nคาบที่ 2: ว31293 ครูวุฒิพงศ์ 133\nคาบที่ 3: แนะแนว ครูปิยะนุช 113\nคาบที่ 4: พักเที่ยง\nคาบที่ 5: ว30130 ครูปราณปริศ 222\nคาบที่ 6: ส31102 ครูธัญลักษณ ห้องสมุด\nคาบที่ 7: ประชุม ม.4 หอประชุม\nคาบที่ 8: ชุมนุม",
      keywords: "ม.4/3 พฤหัสบดี ตารางเรียน schedule",
      category: "เวลาเรียน"
    },
    {
      question: "ม.4/3 วันศุกร์ เรียนเรียนอะไร",
      answer: "ม.4/3 วันศุกร์ ชุดนักเรียน\nช่วง Homeroom: ที่ปรึกษา 411\nคาบที่ 1: ท31102 ครูมะรุสดี 723\nคาบที่ 2: อ31202 ครูพิกุลทอง 117\nคาบที่ 3: อ31102 ครูกรรศิภร 124\nคาบที่ 4: พักเที่ยง\nคาบที่ 5: พ30209 ครูภิสรรค์ สนามบาส\nคาบที่ 6: พ30209 ครูภิสรรค์ สนามบาส\nคาบที่ 7: ค31102 ครูเบญจมา 136\nคาบที่ 8: จ31204 ครูณฐิยา 123",
      keywords: "ม.4/3 ศุกร์ ตารางเรียน schedule",
      category: "เวลาเรียน"
    }
  ];

  const now = new Date().toISOString();
  let count = 0;
  const stmt = db.prepare('INSERT INTO ai_knowledge (question, answer, keywords, category, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)');

  for (const item of scheduleData) {
    const existing = db.prepare('SELECT id FROM ai_knowledge WHERE question = ?').get(item.question);
    if (!existing) {
      stmt.run(item.question, item.answer, item.keywords, item.category, now, now);
      count++;
    }
  }

  return count;
}

// Initialize schedules data for M.4/4
export function initializeSchedulesForM4_4() {
  const scheduleData = [
    {
      question: "ม.4/4 วันจันทร์ เรียนเรียนอะไร",
      answer: "ม.4/4 วันจันทร์ ชุดนักเรียน\nช่วง Homeroom: ที่ปรึกษา 117\nคาบที่ 1: ศ31102 ครูปิยะนุช 113\nคาบที่ 2: ท31102 ครูประพิณ 722\nคาบที่ 3: ซ่อมเสริม\nคาบที่ 4: พักเที่ยง\nคาบที่ 5: ว31293 ครูวุฒิพงศ์ 134\nคาบที่ 6: แนะแนว ครูปิยะนุช 113\nคาบที่ 7: IS/STEM ครูรังสิมันต์ 134\nคาบที่ 8: IS/STEM ครูรังสิมันต์ 134",
      keywords: "ม.4/4 จันทร์ ตารางเรียน schedule",
      category: "เวลาเรียน"
    },
    {
      question: "ม.4/4 วันอังคาร เรียนเรียนอะไร",
      answer: "ม.4/4 วันอังคาร ชุดนักเรียน\nช่วง Homeroom: ที่ปรึกษา 117\nคาบที่ 1: อ31102 ครูกรรศิภร 124\nคาบที่ 2: ศ31203 ครูปิยะนุช 113\nคาบที่ 3: ซ่อมเสริม\nคาบที่ 4: พักเที่ยง\nคาบที่ 5: ว30130 ครูปราณปริ 222\nคาบที่ 6: ว30130 ครูปราณปริ 222\nคาบที่ 7: อ31204 ครูพิกุลทอง 123\nคาบที่ 8: ค31102 ครูเบญจมา 136",
      keywords: "ม.4/4 อังคาร ตารางเรียน schedule",
      category: "เวลาเรียน"
    },
    {
      question: "ม.4/4 วันพุธ เรียนเรียนอะไร",
      answer: "ม.4/4 วันพุธ ชุดพละ\nช่วง Homeroom: ที่ปรึกษา 117\nคาบที่ 1: พ31102 ครูสุนิษา พลานามัย\nคาบที่ 2: อ31204 ครูพิกุลทอง 124\nคาบที่ 3: ค31102 ครูเบญจมา 122\nคาบที่ 4: พักเที่ยง\nคาบที่ 5: ท31102 ครูประพิณ 722\nคาบที่ 6: อ31102 ครูกรรศิภร 124\nคาบที่ 7: ซ่อมเสริม ที่ปรึกษา 117\nคาบที่ 8: สาธารณประโยชน์",
      keywords: "ม.4/4 พุธ ตารางเรียน schedule พละ",
      category: "เวลาเรียน"
    },
    {
      question: "ม.4/4 วันพฤหัสบดี เรียนเรียนอะไร",
      answer: "ม.4/4 วันพฤหัสบดี ชุดนักเรียน\nช่วง Homeroom: ที่ปรึกษา 117\nคาบที่ 1: ว30150 ครูเจนจิรา 224\nคาบที่ 2: ว30150 ครูเจนจิรา 224\nคาบที่ 3: ส31102 ครูธัญลักษณ ห้องสมุด\nคาบที่ 4: พักเที่ยง\nคาบที่ 5: ว31293 ครูวุฒิพงศ์ 133\nคาบที่ 6: ศ31203 ครูปิยะนุช 113\nคาบที่ 7: ประชุม ม.4 หอประชุม\nคาบที่ 8: ชุมนุม",
      keywords: "ม.4/4 พฤหัสบดี ตารางเรียน schedule",
      category: "เวลาเรียน"
    },
    {
      question: "ม.4/4 วันศุกร์ เรียนเรียนอะไร",
      answer: "ม.4/4 วันศุกร์ ชุดพละ\nช่วง Homeroom: ที่ปรึกษา 117\nคาบที่ 1: ว30130 ครูปราณปริ 222\nคาบที่ 2: ง30228 ครูภาณุพงศ์ 412\nคาบที่ 3: ง30228 ครูภาณุพงศ์ 412\nคาบที่ 4: พักเที่ยง\nคาบที่ 5: ง31102 ครูอุไรวรรณ 411\nคาบที่ 6: ส31102 ครูธัญลักษณ ห้องสมุด\nคาบที่ 7: พ30209 ครูภิสรรค์ สนามบาส\nคาบที่ 8: พ30209 ครูภิสรรค์ สนามบาส",
      keywords: "ม.4/4 ศุกร์ ตารางเรียน schedule พละ",
      category: "เวลาเรียน"
    }
  ];

  const now = new Date().toISOString();
  let count = 0;
  const stmt = db.prepare('INSERT INTO ai_knowledge (question, answer, keywords, category, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)');

  for (const item of scheduleData) {
    const existing = db.prepare('SELECT id FROM ai_knowledge WHERE question = ?').get(item.question);
    if (!existing) {
      stmt.run(item.question, item.answer, item.keywords, item.category, now, now);
      count++;
    }
  }

  return count;
}

// Initialize schedules data for M.5/1
export function initializeSchedulesForM5_1() {
  const scheduleData = [
    {
      question: "ม.5/1 วันจันทร์ เรียนเรียนอะไร",
      answer: "ม.5/1 วันจันทร์ ชุดพละ\nช่วง Homeroom: ที่ปรึกษา 136\nคาบที่ 1: ค32202 ครูเบญจมา 136\nคาบที่ 2: ศ32102 ครูสุริวิภา 311\nคาบที่ 3: ท32102 ครูประพิณ 722\nคาบที่ 4: พักเที่ยง\nคาบที่ 5: ค32102 ครูโสภีร์ 136\nคาบที่ 6: อ32102 ครูกรรศิภร 124\nคาบที่ 7: ซ่อมเสริม\nคาบที่ 8: ง32102 ครูภาณุพงศ์ 412",
      keywords: "ม.5/1 จันทร์ ตารางเรียน schedule พละ",
      category: "เวลาเรียน"
    },
    {
      question: "ม.5/1 วันอังคาร เรียนเรียนอะไร",
      answer: "ม.5/1 วันอังคาร ชุดนักเรียน\nช่วง Homeroom: ที่ปรึกษา 136\nคาบที่ 1: ค32102 ครูโสภีร์ 136\nคาบที่ 2: ว32245 ครูณัฐริกา 223\nคาบที่ 3: ว32245 ครูณัฐริกา 223\nคาบที่ 4: พักเที่ยง\nคาบที่ 5: ว32292 ครูวุฒิพงศ์ 133\nคาบที่ 6: ส32104 ครูณัฐวัตร 126\nคาบที่ 7: ค32202 ครูเบญจมา 136\nคาบที่ 8: ท32102 ครูประพิณ 722",
      keywords: "ม.5/1 อังคาร ตารางเรียน schedule",
      category: "เวลาเรียน"
    },
    {
      question: "ม.5/1 วันพุธ เรียนเรียนอะไร",
      answer: "ม.5/1 วันพุธ ชุดพละ\nช่วง Homeroom: ที่ปรึกษา 136\nคาบที่ 1: ว32205 ครูอดินันท์ 221\nคาบที่ 2: ว32205 ครูอดินันท์ 221\nคาบที่ 3: ว32225 ครูปราณปริ 222\nคาบที่ 4: พักเที่ยง\nคาบที่ 5: ค32202 ครูเบญจมา 136\nคาบที่ 6: ส32104 ครูณัฐวัตร 126\nคาบที่ 7: ซ่อมเสริม ที่ปรึกษา 136\nคาบที่ 8: สาธารณประโยชน์",
      keywords: "ม.5/1 พุธ ตารางเรียน schedule พละ",
      category: "เวลาเรียน"
    },
    {
      question: "ม.5/1 วันพฤหัสบดี เรียนเรียนอะไร",
      answer: "ม.5/1 วันพฤหัสบดี ชุดนักเรียน\nช่วง Homeroom: ที่ปรึกษา 136\nคาบที่ 1: อ32102 ครูกรรศิภร 124\nคาบที่ 2: ว32225 ครูปราณปริ 222\nคาบที่ 3: ว32225 ครูปราณปริ 222\nคาบที่ 4: พักเที่ยง\nคาบที่ 5: ค32202 ครูเบญจมา 122\nคาบที่ 6: ว32205 ครูอดินันท์ 221\nคาบที่ 7: ว32205 ครูอดินันท์ 221\nคาบที่ 8: ชุมนุม",
      keywords: "ม.5/1 พฤหัสบดี ตารางเรียน schedule",
      category: "เวลาเรียน"
    },
    {
      question: "ม.5/1 วันศุกร์ เรียนเรียนอะไร",
      answer: "ม.5/1 วันศุกร์ ชุดนักเรียน\nช่วง Homeroom: ที่ปรึกษา 136\nคาบที่ 1: อ32204 ครูศศิตา 124\nคาบที่ 2: ว32161 ครูอดินันท์ 222\nคาบที่ 3: ว32161 ครูอดินันท์ 222\nคาบที่ 4: พักเที่ยง\nคาบที่ 5: ว32245 ครูณัฐริกา 223\nคาบที่ 6: พ32102 ครูวิทยา พลานามัย\nคาบที่ 7: ประชุม ม.5 หอประชุม\nคาบที่ 8: แนะแนว ครูราโมนา 724",
      keywords: "ม.5/1 ศุกร์ ตารางเรียน schedule",
      category: "เวลาเรียน"
    }
  ];

  const now = new Date().toISOString();
  let count = 0;
  const stmt = db.prepare('INSERT INTO ai_knowledge (question, answer, keywords, category, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)');

  for (const item of scheduleData) {
    const existing = db.prepare('SELECT id FROM ai_knowledge WHERE question = ?').get(item.question);
    if (!existing) {
      stmt.run(item.question, item.answer, item.keywords, item.category, now, now);
      count++;
    }
  }

  return count;
}

// Initialize schedules data for M.5/2
export function initializeSchedulesForM5_2() {
  const scheduleData = [
    {
      question: "ม.5/2 วันจันทร์ เรียนเรียนอะไร",
      answer: "ม.5/2 วันจันทร์ ชุดนักเรียน\nช่วง Homeroom: ที่ปรึกษา 722\nคาบที่ 1: ว32161 ครูอดินันท์ 221\nคาบที่ 2: ว32161 ครูอดินันท์ 221\nคาบที่ 3: ง32102 ครูภาณุพงศ์ 412\nคาบที่ 4: พักเที่ยง\nคาบที่ 5: ง30205 ครูวัชรินทร์ 411\nคาบที่ 6: ง30205 ครูวัชรินทร์ 411\nคาบที่ 7: ท32102 ครูประพิณ 722\nคาบที่ 8: ค32102 ครูโสภีร์ 136",
      keywords: "ม.5/2 จันทร์ ตารางเรียน schedule",
      category: "เวลาเรียน"
    },
    {
      question: "ม.5/2 วันอังคาร เรียนเรียนอะไร",
      answer: "ม.5/2 วันอังคาร ชุดนักเรียน\nช่วง Homeroom: ที่ปรึกษา 722\nคาบที่ 1: ง30203 ครูอุไรวรร 411\nคาบที่ 2: ง30203 ครูอุไรวรร 411\nคาบที่ 3: อ32102 ครูกรรศิภร 124\nคาบที่ 4: พักเที่ยง\nคาบที่ 5: ศ32102 ครูสุริวิภา 311\nคาบที่ 6: ซ่อมเสริม\nคาบที่ 7: ศ30219 ครูศดานันท์ 113\nคาบที่ 8: แนะแนว ครูราโมนา 725",
      keywords: "ม.5/2 อังคาร ตารางเรียน schedule",
      category: "เวลาเรียน"
    },
    {
      question: "ม.5/2 วันพุธ เรียนเรียนอะไร",
      answer: "ม.5/2 วันพุธ ชุดพละ\nช่วง Homeroom: ที่ปรึกษา 722\nคาบที่ 1: ส32104 ครูณัฐวัตร 126\nคาบที่ 2: ค32102 ครูโสภีร์ 136\nคาบที่ 3: อ32204 ครูศศิตา 117\nคาบที่ 4: พักเที่ยง\nคาบที่ 5: ว32210 ครูอดินันท์ 221\nคาบที่ 6: ว32210 ครูอดินันท์ 221\nคาบที่ 7: ซ่อมเสริม ที่ปรึกษา 722\nคาบที่ 8: สาธารณประโยชน์",
      keywords: "ม.5/2 พุธ ตารางเรียน schedule พละ",
      category: "เวลาเรียน"
    },
    {
      question: "ม.5/2 วันพฤหัสบดี เรียนเรียนอะไร",
      answer: "ม.5/2 วันพฤหัสบดี ชุดพละ\nช่วง Homeroom: ที่ปรึกษา 722\nคาบที่ 1: พ32102 ครูวิทยา หอประชุม\nคาบที่ 2: ศ30219 ครูศดานันท์ 113\nคาบที่ 3: จ32204 ครูณฐิยา 123\nคาบที่ 4: พักเที่ยง\nคาบที่ 5: พ30206 ครูสุนิษา ส.ฟุตบอล\nคาบที่ 6: พ30206 ครูสุนิษา ส.ฟุตบอล\nคาบที่ 7: ซ่อมเสริม\nคาบที่ 8: ชุมนุม",
      keywords: "ม.5/2 พฤหัสบดี ตารางเรียน schedule พละ",
      category: "เวลาเรียน"
    },
    {
      question: "ม.5/2 วันศุกร์ เรียนเรียนอะไร",
      answer: "ม.5/2 วันศุกร์ ชุดนักเรียน\nช่วง Homeroom: ที่ปรึกษา 722\nคาบที่ 1: ส32104 ครูณัฐวัตร 126\nคาบที่ 2: ซ่อมเสริม\nคาบที่ 3: ว32292 ครูวุฒิพงศ์ 133\nคาบที่ 4: พักเที่ยง\nคาบที่ 5: อ32102 ครูกรรศิภร 124\nคาบที่ 6: จ32204 ครูณฐิยา 124\nคาบที่ 7: ประชุม ม.5 หอประชุม\nคาบที่ 8: ครูประพิณ 722",
      keywords: "ม.5/2 ศุกร์ ตารางเรียน schedule",
      category: "เวลาเรียน"
    }
  ];

  const now = new Date().toISOString();
  let count = 0;
  const stmt = db.prepare('INSERT INTO ai_knowledge (question, answer, keywords, category, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)');

  for (const item of scheduleData) {
    const existing = db.prepare('SELECT id FROM ai_knowledge WHERE question = ?').get(item.question);
    if (!existing) {
      stmt.run(item.question, item.answer, item.keywords, item.category, now, now);
      count++;
    }
  }

  return count;
}

// Initialize schedules data for M.5/3
export function initializeSchedulesForM5_3() {
  const scheduleData = [
    {
      question: "ม.5/3 วันจันทร์ เรียนเรียนอะไร",
      answer: "ม.5/3 วันจันทร์ ชุดนักเรียน\nช่วง Homeroom: ที่ปรึกษา 126\nคาบที่ 1: แนะแนว ครูราโมนา ห้องสมุด\nคาบที่ 2: จ32204 ครูณฐิยา 123\nคาบที่ 3: ค32102 ครูโสรวีร์ 136\nคาบที่ 4: พักเที่ยง\nคาบที่ 5: ว32161 ครูอดินันท์ 221\nคาบที่ 6: ว32161 ครูอดินันท์ 221\nคาบที่ 7: ศ32102 ครูสุริวิภา 311\nคาบที่ 8: อ32204 ครูศศิตา 123",
      keywords: "ม.5/3 จันทร์ ตารางเรียน schedule",
      category: "เวลาเรียน"
    },
    {
      question: "ม.5/3 วันอังคาร เรียนเรียนอะไร",
      answer: "ม.5/3 วันอังคาร ชุดนักเรียน\nช่วง Homeroom: ที่ปรึกษา 126\nคาบที่ 1: ว32210 ครูอดินันท์ 221\nคาบที่ 2: ว32210 ครูอดินันท์ 221\nคาบที่ 3: ง32102 ครูภาณุพงศ์ 412\nคาบที่ 4: พักเที่ยง\nคาบที่ 5: ศ30219 ครูศดานันท์ 113\nคาบที่ 6: ค32102 ครูโสรวีร์ 136\nคาบที่ 7: ซ่อมเสริม\nคาบที่ 8: ส32104 ครูณัฐวัตร 126",
      keywords: "ม.5/3 อังคาร ตารางเรียน schedule",
      category: "เวลาเรียน"
    },
    {
      question: "ม.5/3 วันพุธ เรียนเรียนอะไร",
      answer: "ม.5/3 วันพุธ ชุดพละ\nช่วง Homeroom: ที่ปรึกษา 126\nคาบที่ 1: ท32102 ครูประพิณ 722\nคาบที่ 2: พ32102 ครูวิทยา พลานามัย\nคาบที่ 3: อ32102 ครูกรรศิภร 124\nคาบที่ 4: พักเที่ยง\nคาบที่ 5: พ30206 ครูสุนิษา ส.ฟุตบอล\nคาบที่ 6: พ30206 ครูสุนิษา ส.ฟุตบอล\nคาบที่ 7: ซ่อมเสริม ที่ปรึกษา 126\nคาบที่ 8: สาธารณประโยชน์",
      keywords: "ม.5/3 พุธ ตารางเรียน schedule พละ",
      category: "เวลาเรียน"
    },
    {
      question: "ม.5/3 วันพฤหัสบดี เรียนเรียนอะไร",
      answer: "ม.5/3 วันพฤหัสบดี ชุดนักเรียน\nช่วง Homeroom: ที่ปรึกษา 126\nคาบที่ 1: ง30205 ครูวัชรินทร์ 411\nคาบที่ 2: ง30205 ครูวัชรินทร์ 411\nคาบที่ 3: อ32102 ครูกรรศิภร 124\nคาบที่ 4: พักเที่ยง\nคาบที่ 5: ง30203 ครูอุไรวรร 411\nคาบที่ 6: ง30203 ครูอุไรวรร 411\nคาบที่ 7: ซ่อมเสริม\nคาบที่ 8: ชุมนุม",
      keywords: "ม.5/3 พฤหัสบดี ตารางเรียน schedule",
      category: "เวลาเรียน"
    },
    {
      question: "ม.5/3 วันศุกร์ เรียนเรียนอะไร",
      answer: "ม.5/3 วันศุกร์ ชุดนักเรียน\nช่วง Homeroom: ที่ปรึกษา 126\nคาบที่ 1: จ32204 ครูณฐิยา 123\nคาบที่ 2: ซ่อมเสริม\nคาบที่ 3: ท32102 ครูประพิณ 722\nคาบที่ 4: พักเที่ยง\nคาบที่ 5: ส32104 ครูณัฐวัตร 126\nคาบที่ 6: ศ30219 ครูศดานันท์ 113\nคาบที่ 7: ประชุม ม.5 หอประชุม\nคาบที่ 8: ว32292 ครูวุฒิพงศ์ 134",
      keywords: "ม.5/3 ศุกร์ ตารางเรียน schedule",
      category: "เวลาเรียน"
    }
  ];

  const now = new Date().toISOString();
  let count = 0;
  const stmt = db.prepare('INSERT INTO ai_knowledge (question, answer, keywords, category, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)');

  for (const item of scheduleData) {
    const existing = db.prepare('SELECT id FROM ai_knowledge WHERE question = ?').get(item.question);
    if (!existing) {
      stmt.run(item.question, item.answer, item.keywords, item.category, now, now);
      count++;
    }
  }

  return count;
}

// Initialize schedules data for M.5/4
export function initializeSchedulesForM5_4() {
  const scheduleData = [
    {
      question: "ม.5/4 วันจันทร์ เรียนเรียนอะไร",
      answer: "ม.5/4 วันจันทร์ ชุดนักเรียน\nช่วง Homeroom: ที่ปรึกษา 412\nคาบที่ 1: ง32102 ครูภาณุพงศ์ 412\nคาบที่ 2: ส32104 ครูณัฐวัตร 135\nคาบที่ 3: ว32161 ครูอดินันท์ 222\nคาบที่ 4: พักเที่ยง\nคาบที่ 5: ซ่อมเสริม\nคาบที่ 6: ท32102 ครูประพิณ 722\nคาบที่ 7: ง30205 ครูวัชรินทร์ 411\nคาบที่ 8: ง30205 ครูวัชรินทร์ 411",
      keywords: "ม.5/4 จันทร์ ตารางเรียน schedule",
      category: "เวลาเรียน"
    },
    {
      question: "ม.5/4 วันอังคาร เรียนเรียนอะไร",
      answer: "ม.5/4 วันอังคาร ชุดนักเรียน\nช่วง Homeroom: ที่ปรึกษา 412\nคาบที่ 1: พ32102 ครูวิทยา 725\nคาบที่ 2: ส32104 ครูณัฐวัตร 126\nคาบที่ 3: ศ30217 ครูวรพล 712\nคาบที่ 4: พักเที่ยง\nคาบที่ 5: ว32210 ครูอดินันท์ 221\nคาบที่ 6: ว32210 ครูอดินันท์ 221\nคาบที่ 7: ง30229 ครูภาณุพงศ์ 412\nคาบที่ 8: ง30229 ครูภาณุพงศ์ 412",
      keywords: "ม.5/4 อังคาร ตารางเรียน schedule",
      category: "เวลาเรียน"
    },
    {
      question: "ม.5/4 วันพุธ เรียนเรียนอะไร",
      answer: "ม.5/4 วันพุธ ชุดพละ\nช่วง Homeroom: ที่ปรึกษา 412\nคาบที่ 1: ง30229 ครูภาณุพงศ์ 412\nคาบที่ 2: ง30229 ครูภาณุพงศ์ 412\nคาบที่ 3: ซ่อมเสริม\nคาบที่ 4: พักเที่ยง\nคาบที่ 5: อ32102 ครูกรรศิภร 124\nคาบที่ 6: แนะแนว ครูราโมนา ห้องสมุด\nคาบที่ 7: ซ่อมเสริม ที่ปรึกษา 412\nคาบที่ 8: สาธารณประโยชน์",
      keywords: "ม.5/4 พุธ ตารางเรียน schedule พละ",
      category: "เวลาเรียน"
    },
    {
      question: "ม.5/4 วันพฤหัสบดี เรียนเรียนอะไร",
      answer: "ม.5/4 วันพฤหัสบดี ชุดนักเรียน\nช่วง Homeroom: ที่ปรึกษา 412\nคาบที่ 1: ค32102 ครูโสภีร์ 136\nคาบที่ 2: อ32204 ครูศศิตา 117\nคาบที่ 3: ซ่อมเสริม\nคาบที่ 4: พักเที่ยง\nคาบที่ 5: ว32161 ครูอดินันท์ 221\nคาบที่ 6: ว32292 ครูวุฒิพงศ์ 134\nคาบที่ 7: ท32102 ครูประพิณ 722\nคาบที่ 8: ชุมนุม",
      keywords: "ม.5/4 พฤหัสบดี ตารางเรียน schedule",
      category: "เวลาเรียน"
    },
    {
      question: "ม.5/4 วันศุกร์ เรียนเรียนอะไร",
      answer: "ม.5/4 วันศุกร์ ชุดพละ\nช่วง Homeroom: ที่ปรึกษา 412\nคาบที่ 1: ค32102 ครูโสภีร์ 136\nคาบที่ 2: พ30206 ครูสุนิษา ส.ฟุตบอล\nคาบที่ 3: พ30206 ครูสุนิษา ส.ฟุตบอล\nคาบที่ 4: พักเที่ยง\nคาบที่ 5: ศ30217 ครูวรพล 712\nคาบที่ 6: ศ32102 ครูสุริวิภา 311\nคาบที่ 7: ประชุม ม.5 หอประชุม\nคาบที่ 8: อ32102 ครูกรรศิภร 124",
      keywords: "ม.5/4 ศุกร์ ตารางเรียน schedule พละ",
      category: "เวลาเรียน"
    }
  ];

  const now = new Date().toISOString();
  let count = 0;
  const stmt = db.prepare('INSERT INTO ai_knowledge (question, answer, keywords, category, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)');

  for (const item of scheduleData) {
    const existing = db.prepare('SELECT id FROM ai_knowledge WHERE question = ?').get(item.question);
    if (!existing) {
      stmt.run(item.question, item.answer, item.keywords, item.category, now, now);
      count++;
    }
  }

  return count;
}

// Initialize schedules data for M.6/1
export function initializeSchedulesForM6_1() {
  const scheduleData = [
    {
      question: "ม.6/1 วันจันทร์ เรียนเรียนอะไร",
      answer: "ม.6/1 วันจันทร์ ชุดนักเรียน\nช่วง Homeroom: ที่ปรึกษา 222\nคาบที่ 1: พ33102 ครูภิสรรค์ หอประชุม\nคาบที่ 2: ค33102 ครูเบญจมา 136\nคาบที่ 3: ว30110 ครูอัสม๊ะ 221\nคาบที่ 4: ว30110 ครูอัสม๊ะ 221\nคาบที่ 5: พักเที่ยง\nคาบที่ 6: อ33102 ครูธันย์ชนก 123\nคาบที่ 7: ค33202 ครูโสรวีร์ 136\nคาบที่ 8: ส33162 ครูณัฐวัตร 126",
      keywords: "ม.6/1 จันทร์ ตารางเรียน schedule",
      category: "เวลาเรียน"
    },
    {
      question: "ม.6/1 วันอังคาร เรียนเรียนอะไร",
      answer: "ม.6/1 วันอังคาร ชุดนักเรียน\nช่วง Homeroom: ที่ปรึกษา 222\nคาบที่ 1: ส33162 ครูณัฐวัตร 126\nคาบที่ 2: ค33202 ครูโสรวีร์ 136\nคาบที่ 3: อ33204 ครูศศิตา 117\nคาบที่ 4: แนะแนว ครูราโมนา ห้องสมุด\nคาบที่ 5: พักเที่ยง\nคาบที่ 6: ว30150 ครูณัฐริกา 223\nคาบที่ 7: ว30130 ครูปราณปริ 222\nคาบที่ 8: ว30130 ครูปราณปริ 222",
      keywords: "ม.6/1 อังคาร ตารางเรียน schedule",
      category: "เวลาเรียน"
    },
    {
      question: "ม.6/1 วันพุธ เรียนเรียนอะไร",
      answer: "ม.6/1 วันพุธ ชุดพละ\nช่วง Homeroom: ที่ปรึกษา 222\nคาบที่ 1: ค33202 ครูโสรวีร์ 136\nคาบที่ 2: ง33102 ครูวัชรินทร์ 411\nคาบที่ 3: ว30110 ครูอัสม๊ะ 221\nคาบที่ 4: ว30110 ครูอัสม๊ะ 221\nคาบที่ 5: พักเที่ยง\nคาบที่ 6: ค33102 ครูเบญจมา 136\nคาบที่ 7: ซ่อมเสริม ที่ปรึกษา 222\nคาบที่ 8: สาธารณประโยชน์",
      keywords: "ม.6/1 พุธ ตารางเรียน schedule พละ",
      category: "เวลาเรียน"
    },
    {
      question: "ม.6/1 วันพฤหัสบดี เรียนเรียนอะไร",
      answer: "ม.6/1 วันพฤหัสบดี ชุดนักเรียน\nช่วง Homeroom: ที่ปรึกษา 222\nคาบที่ 1: ส33106 ครูธัญลักษ ห้องสมุด\nคาบที่ 2: ค33202 ครูโสรวีร์ 136\nคาบที่ 3: ท33102 ครูประพิณ 722\nคาบที่ 4: ค30208 ครูลดาวัลย์ 122\nคาบที่ 5: พักเที่ยง\nคาบที่ 6: ว30130 ครูปราณปริ 222\nคาบที่ 7: ศ33102 ครูวรพล 712\nคาบที่ 8: ชุมนุม",
      keywords: "ม.6/1 พฤหัสบดี ตารางเรียน schedule",
      category: "เวลาเรียน"
    },
    {
      question: "ม.6/1 วันศุกร์ เรียนเรียนอะไร",
      answer: "ม.6/1 วันศุกร์ ชุดนักเรียน\nช่วง Homeroom: ที่ปรึกษา 222\nคาบที่ 1: อ33102 ครูธันย์ชนก 135\nคาบที่ 2: ค33202 ครูโสรวีร์ 136\nคาบที่ 3: ส33106 ครูธัญลักษ ห้องสมุด\nคาบที่ 4: ท33102 ครูประพิณ 722\nคาบที่ 5: พักเที่ยง\nคาบที่ 6: ว30150 ครูณัฐริกา 223\nคาบที่ 7: ว30150 ครูณัฐริกา 223\nคาบที่ 8: ประชุม ม.6 หอประชุม",
      keywords: "ม.6/1 ศุกร์ ตารางเรียน schedule",
      category: "เวลาเรียน"
    }
  ];

  const now = new Date().toISOString();
  let count = 0;
  const stmt = db.prepare('INSERT INTO ai_knowledge (question, answer, keywords, category, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)');

  for (const item of scheduleData) {
    const existing = db.prepare('SELECT id FROM ai_knowledge WHERE question = ?').get(item.question);
    if (!existing) {
      stmt.run(item.question, item.answer, item.keywords, item.category, now, now);
      count++;
    }
  }

  return count;
}

// Initialize schedules data for M.6/2
export function initializeSchedulesForM6_2() {
  const scheduleData = [
    {
      question: "ม.6/2 วันจันทร์ เรียนเรียนอะไร",
      answer: "ม.6/2 วันจันทร์ ชุดนักเรียน\nช่วง Homeroom: ที่ปรึกษา 221\nคาบที่ 1: ว33294 ครูรังสิมันต์ 134\nคาบที่ 2: ซ่อมเสริม\nคาบที่ 3: ว33295 ครูสุทธิดา 133\nคาบที่ 4: ว33295 ครูสุทธิดา 133\nคาบที่ 5: พักเที่ยง\nคาบที่ 6: ค33102 ครูเบญจมา 135\nคาบที่ 7: ส33106 ครูธัญลักษ ห้องสมุด\nคาบที่ 8: ศ33102 ครูวรพล 712",
      keywords: "ม.6/2 จันทร์ ตารางเรียน schedule",
      category: "เวลาเรียน"
    },
    {
      question: "ม.6/2 วันอังคาร เรียนเรียนอะไร",
      answer: "ม.6/2 วันอังคาร ชุดนักเรียน\nช่วง Homeroom: ที่ปรึกษา 221\nคาบที่ 1: ส33106 ครูธัญลักษ ห้องสมุด\nคาบที่ 2: พ33102 ครูภิสรรค์ พลานามัย\nคาบที่ 3: แนะแนว ครูราโมนา ห้องสมุด\nคาบที่ 4: ศ30227 ครูปิยะนุช 113\nคาบที่ 5: พักเที่ยง\nคาบที่ 6: ซ่อมเสริม\nคาบที่ 7: ว30150 ครูณัฐริกา 223\nคาบที่ 8: ว30150 ครูณัฐริกา 223",
      keywords: "ม.6/2 อังคาร ตารางเรียน schedule",
      category: "เวลาเรียน"
    },
    {
      question: "ม.6/2 วันพุธ เรียนเรียนอะไร",
      answer: "ม.6/2 วันพุธ ชุดพละ\nช่วง Homeroom: ที่ปรึกษา 221\nคาบที่ 1: ง33102 ครูวัชรินทร์ 411\nคาบที่ 2: ค33102 ครูเบญจมา 135\nคาบที่ 3: ซ่อมเสริม\nคาบที่ 4: ว33294 ครูรังสิมันต์ 134\nคาบที่ 5: พักเที่ยง\nคาบที่ 6: ท33102 ครูประพิณ 722\nคาบที่ 7: ซ่อมเสริม ที่ปรึกษา 221\nคาบที่ 8: สาธารณประโยชน์",
      keywords: "ม.6/2 พุธ ตารางเรียน schedule พละ",
      category: "เวลาเรียน"
    },
    {
      question: "ม.6/2 วันพฤหัสบดี เรียนเรียนอะไร",
      answer: "ม.6/2 วันพฤหัสบดี ชุดนักเรียน\nช่วง Homeroom: ที่ปรึกษา 221\nคาบที่ 1: ว30110 ครูอัสม๊ะ 221\nคาบที่ 2: ว30110 ครูอัสม๊ะ 221\nคาบที่ 3: ค30206 ครูวุฒิชัย 136\nคาบที่ 4: ซ่อมเสริม\nคาบที่ 5: พักเที่ยง\nคาบที่ 6: ส33162 ครูณัฐวัตร 126\nคาบที่ 7: อ33102 ครูธันย์ชนก 135\nคาบที่ 8: ชุมนุม",
      keywords: "ม.6/2 พฤหัสบดี ตารางเรียน schedule",
      category: "เวลาเรียน"
    },
    {
      question: "ม.6/2 วันศุกร์ เรียนเรียนอะไร",
      answer: "ม.6/2 วันศุกร์ ชุดนักเรียน\nช่วง Homeroom: ที่ปรึกษา 221\nคาบที่ 1: ท33102 ครูประพิณ 722\nคาบที่ 2: ส33162 ครูณัฐวัตร 126\nคาบที่ 3: ศ30227 ครูปิยะนุช 113\nคาบที่ 4: ค30206 ครูวุฒิชัย 126\nคาบที่ 5: พักเที่ยง\nคาบที่ 6: ซ่อมเสริม\nคาบที่ 7: อ33102 ครูธันย์ชนก 135\nคาบที่ 8: ประชุม ม.6 หอประชุม",
      keywords: "ม.6/2 ศุกร์ ตารางเรียน schedule",
      category: "เวลาเรียน"
    }
  ];

  const now = new Date().toISOString();
  let count = 0;
  const stmt = db.prepare('INSERT INTO ai_knowledge (question, answer, keywords, category, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)');

  for (const item of scheduleData) {
    const existing = db.prepare('SELECT id FROM ai_knowledge WHERE question = ?').get(item.question);
    if (!existing) {
      stmt.run(item.question, item.answer, item.keywords, item.category, now, now);
      count++;
    }
  }

  return count;
}

// Initialize schedules data for M.6/3
export function initializeSchedulesForM6_3() {
  const scheduleData = [
    {
      question: "ม.6/3 วันจันทร์ เรียนเรียนอะไร",
      answer: "ม.6/3 วันจันทร์ ชุดนักเรียน\nช่วง Homeroom: ที่ปรึกษา 135\nคาบที่ 1: ว33295 ครูบุณยาพร 223\nคาบที่ 2: อ33102 ครูธันย์ชนก 117\nคาบที่ 3: ค33102 ครูเบญจมา 135\nคาบที่ 4: ส33162 ครูณัฐวัตร 135\nคาบที่ 5: พักเที่ยง\nคาบที่ 6: ซ่อมเสริม\nคาบที่ 7: ว33274 ครูณัฐริกา 222\nคาบที่ 8: ว33274 ครูณัฐริกา 222",
      keywords: "ม.6/3 จันทร์ ตารางเรียน schedule",
      category: "เวลาเรียน"
    },
    {
      question: "ม.6/3 วันอังคาร เรียนเรียนอะไร",
      answer: "ม.6/3 วันอังคาร ชุดนักเรียน\nช่วง Homeroom: ที่ปรึกษา 135\nคาบที่ 1: ศ30227 ครูปิยะนุช 113\nคาบที่ 2: ว33294 ครูรังสิมันต์ 134\nคาบที่ 3: ว33294 ครูรังสิมันต์ 134\nคาบที่ 4: ส33162 ครูณัฐวัตร 126\nคาบที่ 5: พักเที่ยง\nคาบที่ 6: ศ33102 ครูวรพล 712\nคาบที่ 7: ส33106 ครูธัญลักษ ห้องสมุด\nคาบที่ 8: ซ่อมเสริม",
      keywords: "ม.6/3 อังคาร ตารางเรียน schedule",
      category: "เวลาเรียน"
    },
    {
      question: "ม.6/3 วันพุธ เรียนเรียนอะไร",
      answer: "ม.6/3 วันพุธ ชุดพละ\nช่วง Homeroom: ที่ปรึกษา 135\nคาบที่ 1: ส33106 ครูธัญลักษ ห้องสมุด\nคาบที่ 2: ซ่อมเสริม\nคาบที่ 3: ท33102 ครูประพิณ 722\nคาบที่ 4: ค30206 ครูวุฒิชัย 117\nคาบที่ 5: พักเที่ยง\nคาบที่ 6: ว33295 ครูบุณยาพร 222\nคาบที่ 7: ซ่อมเสริม ที่ปรึกษา 135\nคาบที่ 8: สาธารณประโยชน์",
      keywords: "ม.6/3 พุธ ตารางเรียน schedule พละ",
      category: "เวลาเรียน"
    },
    {
      question: "ม.6/3 วันพฤหัสบดี เรียนเรียนอะไร",
      answer: "ม.6/3 วันพฤหัสบดี ชุดนักเรียน\nช่วง Homeroom: ที่ปรึกษา 135\nคาบที่ 1: อ33102 ครูธันย์ชนก 135\nคาบที่ 2: ท33102 ครูประพิณ 722\nคาบที่ 3: ว30110 ครูอัสม๊ะ 221\nคาบที่ 4: ว30110 ครูอัสม๊ะ 221\nคาบที่ 5: พักเที่ยง\nคาบที่ 6: ซ่อมเสริม\nคาบที่ 7: แนะแนว ครูราโมนา 724\nคาบที่ 8: ชุมนุม",
      keywords: "ม.6/3 พฤหัสบดี ตารางเรียน schedule",
      category: "เวลาเรียน"
    },
    {
      question: "ม.6/3 วันศุกร์ เรียนเรียนอะไร",
      answer: "ม.6/3 วันศุกร์ ชุดนักเรียน\nช่วง Homeroom: ที่ปรึกษา 135\nคาบที่ 1: พ33102 ครูภิสรรค์ พลานามัย\nคาบที่ 2: ศ30227 ครูปิยะนุช 113\nคาบที่ 3: ค30206 ครูวุฒิชัย 126\nคาบที่ 4: ค33102 ครูเบญจมา 136\nคาบที่ 5: พักเที่ยง\nคาบที่ 6: ซ่อมเสริม\nคาบที่ 7: ง33102 ครูวัชรินทร์ 411\nคาบที่ 8: ประชุม ม.6 หอประชุม",
      keywords: "ม.6/3 ศุกร์ ตารางเรียน schedule",
      category: "เวลาเรียน"
    }
  ];

  const now = new Date().toISOString();
  let count = 0;
  const stmt = db.prepare('INSERT INTO ai_knowledge (question, answer, keywords, category, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)');

  for (const item of scheduleData) {
    const existing = db.prepare('SELECT id FROM ai_knowledge WHERE question = ?').get(item.question);
    if (!existing) {
      stmt.run(item.question, item.answer, item.keywords, item.category, now, now);
      count++;
    }
  }

  return count;
}

// Initialize schedules data for M.6/4
export function initializeSchedulesForM6_4() {
  const scheduleData = [
    {
      question: "ม.6/4 วันจันทร์ เรียนเรียนอะไร",
      answer: "ม.6/4 วันจันทร์ ชุดนักเรียน\nช่วง Homeroom: ที่ปรึกษา 134\nคาบที่ 1: ท33102 ครูประพิณ 722\nคาบที่ 2: ว33274 ครูณัฐริกา 223\nคาบที่ 3: ว33274 ครูณัฐริกา 223\nคาบที่ 4: ซ่อมเสริม\nคาบที่ 5: พักเที่ยง\nคาบที่ 6: ง30231 ครูภาณุพงศ์ 412\nคาบที่ 7: ง30231 ครูภาณุพงศ์ 412\nคาบที่ 8: อ33102 ครูธันย์ชนก 124",
      keywords: "ม.6/4 จันทร์ ตารางเรียน schedule",
      category: "เวลาเรียน"
    },
    {
      question: "ม.6/4 วันอังคาร เรียนเรียนอะไร",
      answer: "ม.6/4 วันอังคาร ชุดนักเรียน\nช่วง Homeroom: ที่ปรึกษา 134\nคาบที่ 1: ค33102 ครูเบญจมา 122\nคาบที่ 2: ส33106 ครูธัญลักษ ห้องสมุด\nคาบที่ 3: ง33102 ครูวัชรินทร์ 411\nคาบที่ 4: ง33102 ครูวัชรินทร์ 411\nคาบที่ 5: พักเที่ยง\nคาบที่ 6: ว33294 ครูรังสิมันต์ 134\nคาบที่ 7: ว33294 ครูรังสิมันต์ 134\nคาบที่ 8: อ33102 ครูธันย์ชนก 135",
      keywords: "ม.6/4 อังคาร ตารางเรียน schedule",
      category: "เวลาเรียน"
    },
    {
      question: "ม.6/4 วันพุธ เรียนเรียนอะไร",
      answer: "ม.6/4 วันพุธ ชุดพละ\nช่วง Homeroom: ที่ปรึกษา 134\nคาบที่ 1: แนะแนว ครูราโมนา 723\nคาบที่ 2: พ33102 ครูภิสรรค์ ส.ฟุตซอล\nคาบที่ 3: ง33102 ครูวัชรินทร์ 411\nคาบที่ 4: ศ30227 ครูปิยะนุช 113\nคาบที่ 5: พักเที่ยง\nคาบที่ 6: ซ่อมเสริม\nคาบที่ 7: ซ่อมเสริม ที่ปรึกษา 134\nคาบที่ 8: สาธารณประโยชน์",
      keywords: "ม.6/4 พุธ ตารางเรียน schedule พละ",
      category: "เวลาเรียน"
    },
    {
      question: "ม.6/4 วันพฤหัสบดี เรียนเรียนอะไร",
      answer: "ม.6/4 วันพฤหัสบดี ชุดนักเรียน\nช่วง Homeroom: ที่ปรึกษา 134\nคาบที่ 1: ท33102 ครูประพิณ 722\nคาบที่ 2: ส33162 ครูณัฐวัตร 126\nคาบที่ 3: ศ33102 ครูวรพล 712\nคาบที่ 4: ศ30227 ครูปิยะนุช 113\nคาบที่ 5: พักเที่ยง\nคาบที่ 6: พ30207 ครูวิทยา หอประชุม\nคาบที่ 7: พ30207 ครูวิทยา หอประชุม\nคาบที่ 8: ชุมนุม",
      keywords: "ม.6/4 พฤหัสบดี ตารางเรียน schedule",
      category: "เวลาเรียน"
    },
    {
      question: "ม.6/4 วันศุกร์ เรียนเรียนอะไร",
      answer: "ม.6/4 วันศุกร์ ชุดนักเรียน\nช่วง Homeroom: ที่ปรึกษา 134\nคาบที่ 1: ว30110 ครูอัสม๊ะ 221\nคาบที่ 2: ว30110 ครูอัสม๊ะ 221\nคาบที่ 3: ค33102 ครูเบญจมา 136\nคาบที่ 4: ซ่อมเสริม\nคาบที่ 5: พักเที่ยง\nคาบที่ 6: ส33162 ครูณัฐวัตร 126\nคาบที่ 7: ส33106 ครูธัญลักษ ห้องสมุด\nคาบที่ 8: ประชุม ม.6 หอประชุม",
      keywords: "ม.6/4 ศุกร์ ตารางเรียน schedule",
      category: "เวลาเรียน"
    }
  ];

  const now = new Date().toISOString();
  let count = 0;
  const stmt = db.prepare('INSERT INTO ai_knowledge (question, answer, keywords, category, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)');

  for (const item of scheduleData) {
    const existing = db.prepare('SELECT id FROM ai_knowledge WHERE question = ?').get(item.question);
    if (!existing) {
      stmt.run(item.question, item.answer, item.keywords, item.category, now, now);
      count++;
    }
  }

  return count;
}

// Seed baseline schedules (idempotent)
try {
  initializeSchedulesForM1_1();
  initializeSchedulesForM1_2();
  initializeSchedulesForM1_3();
  initializeSchedulesForM1_4();
  initializeSchedulesForM1_5();
  initializeSchedulesForM2_1();
  initializeSchedulesForM2_2();
  initializeSchedulesForM2_3();
  initializeSchedulesForM2_4();
  initializeSchedulesForM2_5();
  initializeSchedulesForM3_1();
  initializeSchedulesForM3_2();
  initializeSchedulesForM3_3();
  initializeSchedulesForM3_4();
  initializeSchedulesForM3_5();
  initializeSchedulesForM4_1();
  initializeSchedulesForM4_2();
  initializeSchedulesForM4_3();
  initializeSchedulesForM4_4();
  initializeSchedulesForM5_1();
  initializeSchedulesForM5_2();
  initializeSchedulesForM5_3();
  initializeSchedulesForM5_4();
  initializeSchedulesForM6_1();
  initializeSchedulesForM6_2();
  initializeSchedulesForM6_3();
  initializeSchedulesForM6_4();
} catch (err: any) {
  console.error('Schedule seed error:', err?.message || err);
}

export default db;
