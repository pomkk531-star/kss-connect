-- KSS Connect Database Schema for Supabase
-- สร้างตารางทั้งหมดสำหรับระบบ KSS Connect

-- ลบตาราง (ถ้ามีปัญหา) - ถ้าเคยรัน schema มาแล้วและมีข้อมูล ให้เก็บข้อมูลแทน
DROP TABLE IF EXISTS logins CASCADE;
DROP TABLE IF EXISTS admins CASCADE;
DROP TABLE IF EXISTS users CASCADE;
DROP TABLE IF EXISTS teachers CASCADE;
DROP TABLE IF EXISTS events CASCADE;
DROP TABLE IF EXISTS announcements CASCADE;
DROP TABLE IF EXISTS messages CASCADE;
DROP TABLE IF EXISTS admin_messages CASCADE;
DROP TABLE IF EXISTS reports CASCADE;
DROP TABLE IF EXISTS dress_code CASCADE;
DROP TABLE IF EXISTS schedules CASCADE;
DROP TABLE IF EXISTS ai_knowledge CASCADE;

-- ตาราง logins: บันทึกประวัติการเข้าสู่ระบบ
CREATE TABLE IF NOT EXISTS logins (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL,
  user_type TEXT NOT NULL,
  login_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  ip_address TEXT,
  user_agent TEXT
);

-- ตาราง admins: ข้อมูลผู้ดูแลระบบ
CREATE TABLE IF NOT EXISTS admins (
  id SERIAL PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  email TEXT,
  first_name TEXT,
  last_name TEXT,
  role TEXT DEFAULT 'admin',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ตาราง users: ข้อมูลนักเรียน
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  email TEXT,
  first_name TEXT,
  last_name TEXT,
  class_code TEXT,
  role TEXT DEFAULT 'student',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ตาราง events: กิจกรรมต่างๆ
CREATE TABLE IF NOT EXISTS events (
  id SERIAL PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  event_date DATE NOT NULL,
  location TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ตาราง announcements: ประกาศ
CREATE TABLE IF NOT EXISTS announcements (
  id SERIAL PRIMARY KEY,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  target_audience TEXT,
  created_by INTEGER,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ตาราง messages: ข้อความระหว่างผู้ใช้
CREATE TABLE IF NOT EXISTS messages (
  id SERIAL PRIMARY KEY,
  sender_id INTEGER,
  recipient_id INTEGER,
  subject TEXT,
  content TEXT NOT NULL,
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ตาราง admin_messages: ข้อความถึงผู้ดูแล (สามารถส่งแบบไม่ระบุตัวตน)
CREATE TABLE IF NOT EXISTS admin_messages (
  id SERIAL PRIMARY KEY,
  sender_name TEXT,
  sender_email TEXT,
  subject TEXT NOT NULL,
  content TEXT NOT NULL,
  is_anonymous BOOLEAN DEFAULT false,
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ตาราง reports: รายงานปัญหา
CREATE TABLE IF NOT EXISTS reports (
  id SERIAL PRIMARY KEY,
  reporter_id INTEGER,
  report_type TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ตาราง dress_code: กฎระเบียบการแต่งกาย
CREATE TABLE IF NOT EXISTS dress_code (
  id SERIAL PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  day_of_week TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ตาราง schedules: ตารางเรียน/กำหนดการ
CREATE TABLE IF NOT EXISTS schedules (
  id SERIAL PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  type TEXT,
  date DATE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ตาราง teachers: ข้อมูลครู
CREATE TABLE IF NOT EXISTS teachers (
  id SERIAL PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  email TEXT,
  first_name TEXT,
  last_name TEXT,
  subject TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ตาราง ai_knowledge: ฐานความรู้สำหรับ AI
CREATE TABLE IF NOT EXISTS ai_knowledge (
  id SERIAL PRIMARY KEY,
  question TEXT NOT NULL,
  answer TEXT NOT NULL,
  keywords TEXT,
  category TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- สร้าง indexes เพื่อเพิ่มประสิทธิภาพ
CREATE INDEX IF NOT EXISTS idx_logins_user_id ON logins(user_id);
CREATE INDEX IF NOT EXISTS idx_logins_user_type ON logins(user_type);
CREATE INDEX IF NOT EXISTS idx_users_class_code ON users(class_code);
CREATE INDEX IF NOT EXISTS idx_messages_recipient ON messages(recipient_id);
CREATE INDEX IF NOT EXISTS idx_messages_sender ON messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_messages_read ON messages(is_read);
CREATE INDEX IF NOT EXISTS idx_events_date ON events(event_date);
CREATE INDEX IF NOT EXISTS idx_schedules_date ON schedules(date);
CREATE INDEX IF NOT EXISTS idx_ai_knowledge_category ON ai_knowledge(category);

-- Enable Row Level Security (RLS) - ควรปรับแต่งตามความต้องการ
ALTER TABLE logins ENABLE ROW LEVEL SECURITY;
ALTER TABLE admins ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE dress_code ENABLE ROW LEVEL SECURITY;
ALTER TABLE schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE teachers ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_knowledge ENABLE ROW LEVEL SECURITY;

-- ตัวอย่าง RLS Policies (ปรับแต่งตามความต้องการ)
-- ให้สิทธิ์ service_role ทำทุกอย่างได้
CREATE POLICY "Enable all for service role" ON logins FOR ALL USING (true);
CREATE POLICY "Enable all for service role" ON admins FOR ALL USING (true);
CREATE POLICY "Enable all for service role" ON users FOR ALL USING (true);
CREATE POLICY "Enable all for service role" ON events FOR ALL USING (true);
CREATE POLICY "Enable all for service role" ON announcements FOR ALL USING (true);
CREATE POLICY "Enable all for service role" ON messages FOR ALL USING (true);
CREATE POLICY "Enable all for service role" ON admin_messages FOR ALL USING (true);
CREATE POLICY "Enable all for service role" ON reports FOR ALL USING (true);
CREATE POLICY "Enable all for service role" ON dress_code FOR ALL USING (true);
CREATE POLICY "Enable all for service role" ON schedules FOR ALL USING (true);
CREATE POLICY "Enable all for service role" ON teachers FOR ALL USING (true);
CREATE POLICY "Enable all for service role" ON ai_knowledge FOR ALL USING (true);
