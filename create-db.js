const fs = require('fs');
const path = require('path');

const dbContent = `import { Pool } from 'pg';
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
export const db = pool;
export async function initializeDatabase() {
  const client = await pool.connect();
  try {
    await client.query(\`CREATE TABLE IF NOT EXISTS logins (id SERIAL PRIMARY KEY, user_id INTEGER NOT NULL, user_type TEXT NOT NULL, login_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP, ip_address TEXT, user_agent TEXT); CREATE TABLE IF NOT EXISTS admins (id SERIAL PRIMARY KEY, username TEXT UNIQUE NOT NULL, password_hash TEXT NOT NULL, email TEXT, first_name TEXT, last_name TEXT, role TEXT DEFAULT 'admin', created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP); CREATE TABLE IF NOT EXISTS users (id SERIAL PRIMARY KEY, username TEXT UNIQUE NOT NULL, password TEXT NOT NULL, email TEXT, first_name TEXT, last_name TEXT, class_code TEXT, role TEXT DEFAULT 'student', created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP); CREATE TABLE IF NOT EXISTS events (id SERIAL PRIMARY KEY, title TEXT NOT NULL, description TEXT, event_date DATE NOT NULL, location TEXT, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP); CREATE TABLE IF NOT EXISTS announcements (id SERIAL PRIMARY KEY, title TEXT NOT NULL, content TEXT NOT NULL, target_audience TEXT, created_by INTEGER, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP); CREATE TABLE IF NOT EXISTS messages (id SERIAL PRIMARY KEY, sender_id INTEGER, recipient_id INTEGER, subject TEXT, content TEXT NOT NULL, is_read BOOLEAN DEFAULT false, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP); CREATE TABLE IF NOT EXISTS admin_messages (id SERIAL PRIMARY KEY, sender_name TEXT, sender_email TEXT, subject TEXT NOT NULL, content TEXT NOT NULL, is_anonymous BOOLEAN DEFAULT false, is_read BOOLEAN DEFAULT false, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP); CREATE TABLE IF NOT EXISTS reports (id SERIAL PRIMARY KEY, reporter_id INTEGER, report_type TEXT NOT NULL, title TEXT NOT NULL, description TEXT, status TEXT DEFAULT 'pending', created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP); CREATE TABLE IF NOT EXISTS dress_code (id SERIAL PRIMARY KEY, title TEXT NOT NULL, description TEXT, day_of_week TEXT, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP); CREATE TABLE IF NOT EXISTS schedules (id SERIAL PRIMARY KEY, title TEXT NOT NULL, description TEXT, type TEXT, date DATE, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP); CREATE TABLE IF NOT EXISTS teachers (id SERIAL PRIMARY KEY, username TEXT UNIQUE NOT NULL, password TEXT NOT NULL, email TEXT, first_name TEXT, last_name TEXT, subject TEXT, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP); CREATE TABLE IF NOT EXISTS ai_knowledge (id SERIAL PRIMARY KEY, question TEXT NOT NULL, answer TEXT NOT NULL, keywords TEXT, category TEXT, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP);\`);
  } catch (err) {
    if (err.code !== '42P07') console.error('DB init:', err);
  } finally {
    client.release();
  }
}
export async function findAdmin(u) { const r = await pool.query('SELECT * FROM admins WHERE username = $1', [u]); return r.rows[0]; }
export async function createAdmin(u, p, f, l, e) { const r = await pool.query('INSERT INTO admins (username, password_hash, first_name, last_name, email) VALUES ($1, $2, $3, $4, $5) RETURNING *', [u, p, f || null, l || null, e || null]); return r.rows[0]; }
export async function findUser(u) { const r = await pool.query('SELECT * FROM users WHERE username = $1', [u]); return r.rows[0]; }
export async function getUserById(i) { const r = await pool.query('SELECT * FROM users WHERE id = $1', [i]); return r.rows[0]; }
export async function findUsersByName(f, l) { const r = await pool.query('SELECT * FROM users WHERE first_name = $1 AND last_name = $2', [f, l]); return r.rows; }
export async function insertUser(u, p, f, l, c, e) { const r = await pool.query('INSERT INTO users (username, password, first_name, last_name, class_code, email) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *', [u, p, f || null, l || null, c || null, e || null]); return r.rows[0]; }
export async function insertLogin(ui, ut, ia, ua) { const r = await pool.query('INSERT INTO logins (user_id, user_type, ip_address, user_agent) VALUES ($1, $2, $3, $4) RETURNING *', [ui, ut, ia || null, ua || null]); return r.rows[0]; }
export async function listAnnouncements() { const r = await pool.query('SELECT * FROM announcements ORDER BY created_at DESC'); return r.rows; }
export async function insertAnnouncement(t, c, ta, cb) { const r = await pool.query('INSERT INTO announcements (title, content, target_audience, created_by) VALUES ($1, $2, $3, $4) RETURNING *', [t, c, ta || null, cb || null]); return r.rows[0]; }
export async function updateAnnouncement(id, t, c, ta) { await pool.query('UPDATE announcements SET title = $1, content = $2, target_audience = $3, updated_at = CURRENT_TIMESTAMP WHERE id = $4', [t, c, ta || null, id]); }
export async function deleteAnnouncement(id) { await pool.query('DELETE FROM announcements WHERE id = $1', [id]); }
export async function listEvents() { const r = await pool.query('SELECT * FROM events ORDER BY event_date DESC'); return r.rows; }
export async function insertEvent(t, d, ed, l) { const r = await pool.query('INSERT INTO events (title, description, event_date, location) VALUES ($1, $2, $3, $4) RETURNING *', [t, d || null, ed || null, l || null]); return r.rows[0]; }
export async function updateEvent(id, t, d, ed, l) { await pool.query('UPDATE events SET title = $1, description = $2, event_date = $3, location = $4, updated_at = CURRENT_TIMESTAMP WHERE id = $5', [t, d || null, ed || null, l || null, id]); }
export async function deleteEvent(id) { await pool.query('DELETE FROM events WHERE id = $1', [id]); }
export async function listSchedules() { const r = await pool.query('SELECT * FROM schedules ORDER BY date DESC'); return r.rows; }
export async function insertSchedule(t, d, ty, da) { const r = await pool.query('INSERT INTO schedules (title, description, type, date) VALUES ($1, $2, $3, $4) RETURNING *', [t, d || null, ty || null, da || null]); return r.rows[0]; }
export async function updateSchedule(id, t, d, ty, da) { await pool.query('UPDATE schedules SET title = $1, description = $2, type = $3, date = $4, updated_at = CURRENT_TIMESTAMP WHERE id = $5', [t, d || null, ty || null, da || null, id]); }
export async function deleteSchedule(id) { await pool.query('DELETE FROM schedules WHERE id = $1', [id]); }
export async function listClasses() { const r = await pool.query('SELECT DISTINCT class_code FROM users WHERE class_code IS NOT NULL ORDER BY class_code'); return r.rows.map(r => ({class_code: r.class_code})); }
export async function listAllUsers() { const r = await pool.query('SELECT * FROM users ORDER BY created_at DESC'); return r.rows; }
export async function deleteUser(id) { await pool.query('DELETE FROM users WHERE id = $1', [id]); }
export async function updateUserRole(id, ro) { await pool.query('UPDATE users SET role = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2', [ro, id]); }
export async function createUser(u, p, f, l, c) { const r = await pool.query('INSERT INTO users (username, password, first_name, last_name, class_code) VALUES ($1, $2, $3, $4, $5) RETURNING *', [u, p, f, l, c]); return r.rows[0]; }
export async function listInbox(ri) { const r = await pool.query('SELECT * FROM messages WHERE recipient_id = $1 ORDER BY created_at DESC', [ri]); return r.rows; }
export async function insertMessage(si, ri, s, c) { const r = await pool.query('INSERT INTO messages (sender_id, recipient_id, subject, content) VALUES ($1, $2, $3, $4) RETURNING *', [si, ri, s, c]); return r.rows[0]; }
export async function markMessageAsRead(id) { await pool.query('UPDATE messages SET is_read = true, updated_at = CURRENT_TIMESTAMP WHERE id = $1', [id]); }
export async function deleteMessage(id) { await pool.query('DELETE FROM messages WHERE id = $1', [id]); }
export async function countUnreadMessages(ri) { const r = await pool.query('SELECT COUNT(*) as count FROM messages WHERE recipient_id = $1 AND is_read = false', [ri]); return parseInt(r.rows[0].count); }
export async function insertAnonymousMessage(sn, se, s, c) { const r = await pool.query('INSERT INTO admin_messages (sender_name, sender_email, subject, content, is_anonymous) VALUES ($1, $2, $3, $4, true) RETURNING *', [sn, se, s, c]); return r.rows[0]; }
export async function listAllMessagesDetailed() { const r = await pool.query('SELECT * FROM admin_messages ORDER BY created_at DESC'); return r.rows; }
export async function deleteAdminMessage(id) { await pool.query('DELETE FROM admin_messages WHERE id = $1', [id]); }
export async function insertReport(ri, rt, t, d) { const r = await pool.query('INSERT INTO reports (reporter_id, report_type, title, description) VALUES ($1, $2, $3, $4) RETURNING *', [ri, rt, t, d || null]); return r.rows[0]; }
export async function listReports() { const r = await pool.query('SELECT * FROM reports ORDER BY created_at DESC'); return r.rows; }
export async function deleteReport(id) { await pool.query('DELETE FROM reports WHERE id = $1', [id]); }
export async function listDressCode() { const r = await pool.query('SELECT * FROM dress_code ORDER BY created_at DESC'); return r.rows; }
export async function insertDressCode(t, d, dw) { const r = await pool.query('INSERT INTO dress_code (title, description, day_of_week) VALUES ($1, $2, $3) RETURNING *', [t, d || null, dw || null]); return r.rows[0]; }
export async function updateDressCode(id, t, d, dw) { await pool.query('UPDATE dress_code SET title = $1, description = $2, day_of_week = $3, updated_at = CURRENT_TIMESTAMP WHERE id = $4', [t, d || null, dw || null, id]); }
export async function deleteDressCode(id) { await pool.query('DELETE FROM dress_code WHERE id = $1', [id]); }
export async function findTeacher(u) { const r = await pool.query('SELECT * FROM teachers WHERE username = $1', [u]); return r.rows[0]; }
export async function createTeacher(u, p, f, l, e, s) { const r = await pool.query('INSERT INTO teachers (username, password, first_name, last_name, email, subject) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *', [u, p, f, l, e || null, s || null]); return r.rows[0]; }
export async function listTeachers() { const r = await pool.query('SELECT * FROM teachers ORDER BY created_at DESC'); return r.rows; }
export async function deleteTeacher(id) { await pool.query('DELETE FROM teachers WHERE id = $1', [id]); }
export async function listAllAIKnowledge() { const r = await pool.query('SELECT * FROM ai_knowledge ORDER BY updated_at DESC'); return r.rows; }
export async function searchAIKnowledge(q) { const t = \`%\${q}%\`; const r = await pool.query('SELECT * FROM ai_knowledge WHERE question ILIKE $1 OR answer ILIKE $2 OR keywords ILIKE $3 ORDER BY updated_at DESC LIMIT 30', [t, t, t]); return r.rows; }
export async function insertAIKnowledge(q, a, k, c) { const r = await pool.query('INSERT INTO ai_knowledge (question, answer, keywords, category) VALUES ($1, $2, $3, $4) RETURNING *', [q, a, k || null, c || null]); return r.rows[0]; }
export async function updateAIKnowledge(id, q, a, k, c) { await pool.query('UPDATE ai_knowledge SET question = $1, answer = $2, keywords = $3, category = $4, updated_at = CURRENT_TIMESTAMP WHERE id = $5', [q, a, k || null, c || null, id]); }
export async function deleteAIKnowledge(id) { await pool.query('DELETE FROM ai_knowledge WHERE id = $1', [id]); }
export { Pool };`;

fs.writeFileSync(path.join(__dirname, 'lib', 'db.ts'), dbContent, 'utf8');
console.log('DB file created');
