import { Pool } from 'pg';

// PostgreSQL Connection Pool
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// Test connection on startup
pool.on('error', (err) => console.error('Unexpected error on idle client', err));

// ============ Tables Initialization ============
async function initializeDatabase() {
  try {
    const client = await pool.connect();
    try {
      await client.query(`
        CREATE TABLE IF NOT EXISTS logins (
          id SERIAL PRIMARY KEY,
          first_name VARCHAR(255) NOT NULL,
          last_name VARCHAR(255) NOT NULL,
          class_code VARCHAR(50) NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS users (
          id SERIAL PRIMARY KEY,
          first_name VARCHAR(255) NOT NULL,
          last_name VARCHAR(255) NOT NULL,
          student_id VARCHAR(100),
          class_code VARCHAR(50) NOT NULL,
          password_hash VARCHAR(255) NOT NULL,
          role VARCHAR(50) DEFAULT 'student',
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          UNIQUE(first_name, last_name, class_code)
        );

        CREATE TABLE IF NOT EXISTS admins (
          id SERIAL PRIMARY KEY,
          username VARCHAR(255) NOT NULL UNIQUE,
          password_hash VARCHAR(255) NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS teachers (
          id SERIAL PRIMARY KEY,
          first_name VARCHAR(255) NOT NULL,
          last_name VARCHAR(255) NOT NULL,
          teacher_id VARCHAR(100),
          password_hash VARCHAR(255) NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          UNIQUE(first_name, last_name)
        );

        CREATE TABLE IF NOT EXISTS events (
          id SERIAL PRIMARY KEY,
          title VARCHAR(255) NOT NULL,
          description TEXT,
          event_date DATE NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS messages (
          id SERIAL PRIMARY KEY,
          body TEXT NOT NULL,
          recipient_user_id INTEGER,
          sender_user_id INTEGER,
          is_read BOOLEAN DEFAULT FALSE,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS reports (
          id SERIAL PRIMARY KEY,
          title VARCHAR(255) NOT NULL,
          detail TEXT,
          image_url TEXT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS dress_code (
          id SERIAL PRIMARY KEY,
          title VARCHAR(255) NOT NULL,
          description TEXT NOT NULL,
          image_url TEXT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS schedules (
          id SERIAL PRIMARY KEY,
          type VARCHAR(50) NOT NULL,
          title VARCHAR(255) NOT NULL,
          description TEXT,
          date DATE,
          image_url TEXT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS announcements (
          id SERIAL PRIMARY KEY,
          title VARCHAR(255) NOT NULL,
          content TEXT NOT NULL,
          priority VARCHAR(50) DEFAULT 'normal',
          image_url TEXT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS ai_knowledge (
          id SERIAL PRIMARY KEY,
          question TEXT NOT NULL,
          answer TEXT NOT NULL,
          keywords VARCHAR(500),
          category VARCHAR(100),
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
      `);
      console.log('Database schema initialized successfully');
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Database initialization error:', error);
  }
}

// Initialize on startup
initializeDatabase();

// ============ Login Functions ============
export async function insertLogin(firstName: string, lastName: string, classCode: string) {
  const result = await pool.query(
    'INSERT INTO logins (first_name, last_name, class_code, created_at) VALUES ($1, $2, $3, NOW()) RETURNING *',
    [firstName, lastName, classCode]
  );
  return result.rows[0];
}

export async function listLogins() {
  const result = await pool.query('SELECT * FROM logins ORDER BY created_at DESC');
  return result.rows;
}

// ============ Admin Functions ============
export async function findAdmin(username: string) {
  const result = await pool.query(
    'SELECT id, username, password_hash, created_at FROM admins WHERE username = $1',
    [username]
  );
  return result.rows[0];
}

export async function createAdmin(username: string, passwordHash: string) {
  const result = await pool.query(
    'INSERT INTO admins (username, password_hash, created_at) VALUES ($1, $2, NOW()) RETURNING *',
    [username, passwordHash]
  );
  return result.rows[0];
}

// ============ User Functions ============
export async function insertUser(firstName: string, lastName: string, classCode: string, passwordHash: string, studentId?: string) {
  const result = await pool.query(
    'INSERT INTO users (first_name, last_name, student_id, class_code, password_hash, role, created_at) VALUES ($1, $2, $3, $4, $5, $6, NOW()) RETURNING *',
    [firstName, lastName, studentId || null, classCode, passwordHash, 'student']
  );
  return result.rows[0];
}

export async function findUser(firstName: string, lastName: string) {
  const result = await pool.query(
    'SELECT id, first_name, last_name, student_id, class_code, password_hash, role, created_at FROM users WHERE first_name = $1 AND last_name = $2 LIMIT 1',
    [firstName, lastName]
  );
  return result.rows[0];
}

export async function findUsersByName(firstName: string, lastName: string) {
  const result = await pool.query(
    'SELECT id, first_name, last_name, class_code, password_hash, created_at FROM users WHERE first_name = $1 AND last_name = $2',
    [firstName, lastName]
  );
  return result.rows;
}

export async function listAllUsers() {
  const result = await pool.query('SELECT id, first_name, last_name, class_code, password_hash, role, created_at FROM users ORDER BY first_name ASC, last_name ASC');
  return result.rows;
}

export async function deleteUser(userId: number) {
  await pool.query('DELETE FROM users WHERE id = $1', [userId]);
}

export async function getUserById(userId: number) {
  const result = await pool.query('SELECT id, first_name, last_name, class_code FROM users WHERE id = $1', [userId]);
  return result.rows[0];
}

export async function listClasses() {
  const result = await pool.query('SELECT DISTINCT class_code FROM users ORDER BY class_code ASC');
  return result.rows.map(r => ({ classCode: r.class_code }));
}

export async function listUsersByClassCode(classCode: string) {
  const result = await pool.query(
    'SELECT id, first_name as firstName, last_name as lastName FROM users WHERE class_code = $1 ORDER BY first_name ASC, last_name ASC',
    [classCode]
  );
  return result.rows;
}

// ============ Event Functions ============
export async function insertEvent(title: string, description: string, eventDate: string) {
  const result = await pool.query(
    'INSERT INTO events (title, description, event_date, created_at) VALUES ($1, $2, $3, NOW()) RETURNING *',
    [title, description, eventDate]
  );
  return result.rows[0];
}

export async function listEvents() {
  const result = await pool.query('SELECT id, title, description, event_date as eventDate, created_at as createdAt FROM events ORDER BY event_date ASC');
  return result.rows;
}

export async function updateEvent(id: number, title: string, description: string, eventDate: string) {
  const result = await pool.query(
    'UPDATE events SET title = $1, description = $2, event_date = $3 WHERE id = $4 RETURNING *',
    [title, description, eventDate, id]
  );
  return result.rows[0];
}

export async function deleteEvent(id: number) {
  await pool.query('DELETE FROM events WHERE id = $1', [id]);
}

// ============ Announcement Functions ============
export async function insertAnnouncement(title: string, content: string, priority?: string, imageUrl?: string) {
  const result = await pool.query(
    'INSERT INTO announcements (title, content, priority, image_url, created_at) VALUES ($1, $2, $3, $4, NOW()) RETURNING *',
    [title, content, priority || 'normal', imageUrl || null]
  );
  return result.rows[0];
}

export async function listAnnouncements() {
  const result = await pool.query('SELECT * FROM announcements ORDER BY created_at DESC');
  return result.rows;
}

export async function updateAnnouncement(id: number, title: string, content: string, priority?: string, imageUrl?: string) {
  const result = await pool.query(
    'UPDATE announcements SET title = $1, content = $2, priority = $3, image_url = $4 WHERE id = $5 RETURNING *',
    [title, content, priority || 'normal', imageUrl || null, id]
  );
  return result.rows[0];
}

export async function deleteAnnouncement(id: number) {
  await pool.query('DELETE FROM announcements WHERE id = $1', [id]);
}

// ============ Message Functions ============
export async function insertMessage(body: string) {
  const result = await pool.query(
    'INSERT INTO messages (body, created_at) VALUES ($1, NOW()) RETURNING *',
    [body]
  );
  return result.rows[0];
}

export async function insertAnonymousMessage(body: string, recipientUserId: number, senderUserId?: number) {
  const result = await pool.query(
    'INSERT INTO messages (body, recipient_user_id, sender_user_id, created_at) VALUES ($1, $2, $3, NOW()) RETURNING *',
    [body, recipientUserId, senderUserId || null]
  );
  return result.rows[0];
}

export async function listInbox(recipientUserId: number) {
  const result = await pool.query(
    'SELECT id, body, is_read as isRead, created_at as createdAt FROM messages WHERE recipient_user_id = $1 ORDER BY created_at DESC',
    [recipientUserId]
  );
  return result.rows;
}

export async function listAllMessagesDetailed() {
  const result = await pool.query(`
    SELECT
      m.id,
      m.body,
      m.is_read as isRead,
      m.created_at as createdAt,
      CONCAT(ru.first_name, ' ', ru.last_name) as recipientName,
      ru.class_code as recipientClass,
      CONCAT(su.first_name, ' ', su.last_name) as senderName,
      su.class_code as senderClass
    FROM messages m
    LEFT JOIN users ru ON ru.id = m.recipient_user_id
    LEFT JOIN users su ON su.id = m.sender_user_id
    ORDER BY m.created_at DESC
  `);
  return result.rows;
}

export async function markMessageAsRead(messageId: number, recipientUserId: number) {
  await pool.query('UPDATE messages SET is_read = true WHERE id = $1 AND recipient_user_id = $2', [messageId, recipientUserId]);
}

export async function deleteMessage(messageId: number, recipientUserId: number) {
  await pool.query('DELETE FROM messages WHERE id = $1 AND recipient_user_id = $2', [messageId, recipientUserId]);
}

export async function deleteMessageById(messageId: number) {
  await pool.query('DELETE FROM messages WHERE id = $1', [messageId]);
}

export async function countUnreadMessages(recipientUserId: number) {
  const result = await pool.query('SELECT COUNT(*) as count FROM messages WHERE recipient_user_id = $1 AND is_read = false', [recipientUserId]);
  return parseInt(result.rows[0].count, 10);
}

// ============ Report Functions ============
export async function insertReport(title: string, detail: string, imageUrl?: string) {
  const result = await pool.query(
    'INSERT INTO reports (title, detail, image_url, created_at) VALUES ($1, $2, $3, NOW()) RETURNING *',
    [title, detail, imageUrl || null]
  );
  return result.rows[0];
}

export async function listAllReports() {
  const result = await pool.query('SELECT id, title, detail, image_url as imageUrl, created_at as createdAt FROM reports ORDER BY created_at DESC');
  return result.rows;
}

export async function deleteReport(id: number) {
  await pool.query('DELETE FROM reports WHERE id = $1', [id]);
}

// ============ Dress Code Functions ============
export async function listDressCode() {
  const result = await pool.query('SELECT * FROM dress_code ORDER BY created_at DESC');
  return result.rows;
}

export async function insertDressCode(title: string, description: string, imageUrl?: string) {
  const result = await pool.query(
    'INSERT INTO dress_code (title, description, image_url, created_at) VALUES ($1, $2, $3, NOW()) RETURNING *',
    [title, description, imageUrl || null]
  );
  return result.rows[0];
}

export async function updateDressCode(id: number, title: string, description: string, imageUrl?: string) {
  const result = await pool.query(
    'UPDATE dress_code SET title = $1, description = $2, image_url = $3 WHERE id = $4 RETURNING *',
    [title, description, imageUrl || null, id]
  );
  return result.rows[0];
}

export async function deleteDressCode(id: number) {
  await pool.query('DELETE FROM dress_code WHERE id = $1', [id]);
}

// ============ Schedule Functions ============
export async function listSchedules() {
  const result = await pool.query('SELECT * FROM schedules ORDER BY date DESC, created_at DESC');
  return result.rows;
}

export async function insertSchedule(type: string, title: string, description: string, date?: string, imageUrl?: string) {
  const result = await pool.query(
    'INSERT INTO schedules (type, title, description, date, image_url, created_at) VALUES ($1, $2, $3, $4, $5, NOW()) RETURNING *',
    [type, title, description, date || null, imageUrl || null]
  );
  return result.rows[0];
}

export async function updateSchedule(id: number, type: string, title: string, description: string, date?: string, imageUrl?: string) {
  const result = await pool.query(
    'UPDATE schedules SET type = $1, title = $2, description = $3, date = $4, image_url = $5 WHERE id = $6 RETURNING *',
    [type, title, description, date || null, imageUrl || null, id]
  );
  return result.rows[0];
}

export async function deleteSchedule(id: number) {
  await pool.query('DELETE FROM schedules WHERE id = $1', [id]);
}

// ============ Teacher Functions ============
export async function findTeacher(firstName: string, lastName: string) {
  const result = await pool.query(
    'SELECT id, first_name, last_name, password_hash, created_at FROM teachers WHERE first_name = $1 AND last_name = $2',
    [firstName, lastName]
  );
  return result.rows[0];
}

export async function createTeacher(firstName: string, lastName: string, passwordHash: string) {
  const result = await pool.query(
    'INSERT INTO teachers (first_name, last_name, password_hash, created_at) VALUES ($1, $2, $3, NOW()) RETURNING *',
    [firstName, lastName, passwordHash]
  );
  return result.rows[0];
}

export async function listAllTeachers() {
  const result = await pool.query(
    'SELECT id, first_name, last_name, created_at FROM teachers ORDER BY first_name ASC, last_name ASC'
  );
  return result.rows;
}

export async function deleteTeacher(teacherId: number) {
  await pool.query('DELETE FROM teachers WHERE id = $1', [teacherId]);
}

// ============ AI Knowledge Functions ============
export async function listAllAIKnowledge() {
  const result = await pool.query('SELECT * FROM ai_knowledge ORDER BY updated_at DESC');
  return result.rows;
}

export async function searchAIKnowledge(query: string) {
  const searchTerm = `%${query}%`;
  const result = await pool.query(
    `SELECT * FROM ai_knowledge 
     WHERE question ILIKE $1 OR answer ILIKE $1 OR keywords ILIKE $1
     ORDER BY updated_at DESC
     LIMIT 30`,
    [searchTerm]
  );
  return result.rows;
}

export async function insertAIKnowledge(question: string, answer: string, keywords?: string, category?: string) {
  const result = await pool.query(
    'INSERT INTO ai_knowledge (question, answer, keywords, category, created_at, updated_at) VALUES ($1, $2, $3, $4, NOW(), NOW()) RETURNING *',
    [question, answer, keywords || null, category || null]
  );
  return result.rows[0];
}

export async function updateAIKnowledge(id: number, question: string, answer: string, keywords?: string, category?: string) {
  const result = await pool.query(
    'UPDATE ai_knowledge SET question = $1, answer = $2, keywords = $3, category = $4, updated_at = NOW() WHERE id = $5 RETURNING *',
    [question, answer, keywords || null, category || null, id]
  );
  return result.rows[0];
}

export async function deleteAIKnowledge(id: number) {
  await pool.query('DELETE FROM ai_knowledge WHERE id = $1', [id]);
}

export { pool };
