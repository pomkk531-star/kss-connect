# SQL Schema สำหรับ Supabase - KSS Connect

## วิธีใช้งาน

### ขั้นตอนที่ 1: เปิด Supabase SQL Editor

1. ไปที่ https://app.supabase.com/project/vfjhlezyupshnozthsja/sql
2. คลิก "New Query" หรือกด `Ctrl+Enter` (Windows) / `Cmd+Enter` (Mac)

### ขั้นตอนที่ 2: คัดลอกและรัน SQL

1. เปิดไฟล์ `supabase-schema.sql` ในโปรเจกต์นี้
2. คัดลอกเนื้อหา **ทั้งหมด** (Ctrl+A, Ctrl+C)
3. Paste ใน SQL Editor ของ Supabase (Ctrl+V)
4. กดปุ่ม **Run** (หรือกด F5)
5. รอจนกว่าจะแสดง "Success" ✅

### ขั้นตอนที่ 3: ตรวจสอบตาราง

ไปที่ Table Editor เพื่อดูตารางที่สร้าง:
https://app.supabase.com/project/vfjhlezyupshnozthsja/editor

คุณควรเห็นตารางเหล่านี้:
- ✅ logins
- ✅ admins
- ✅ users
- ✅ teachers
- ✅ events
- ✅ announcements
- ✅ messages
- ✅ admin_messages
- ✅ reports
- ✅ dress_code
- ✅ schedules
- ✅ ai_knowledge

## ตารางและโครงสร้าง

### 1. admins - ผู้ดูแลระบบ
```sql
- id (SERIAL PRIMARY KEY)
- username (TEXT UNIQUE)
- password_hash (TEXT)
- email (TEXT)
- first_name (TEXT)
- last_name (TEXT)
- role (TEXT DEFAULT 'admin')
- created_at, updated_at (TIMESTAMP)
```

### 2. users - นักเรียน
```sql
- id (SERIAL PRIMARY KEY)
- username (TEXT UNIQUE)
- password (TEXT)
- email (TEXT)
- first_name (TEXT)
- last_name (TEXT)
- class_code (TEXT) ← ห้องเรียน
- role (TEXT DEFAULT 'student')
- created_at, updated_at (TIMESTAMP)
```

### 3. teachers - ครู
```sql
- id (SERIAL PRIMARY KEY)
- username (TEXT UNIQUE)
- password (TEXT)
- email (TEXT)
- first_name (TEXT)
- last_name (TEXT)
- subject (TEXT) ← วิชาที่สอน
- created_at, updated_at (TIMESTAMP)
```

### 4. events - กิจกรรม
```sql
- id (SERIAL PRIMARY KEY)
- title (TEXT)
- description (TEXT)
- event_date (DATE)
- location (TEXT)
- created_at, updated_at (TIMESTAMP)
```

### 5. announcements - ประกาศ
```sql
- id (SERIAL PRIMARY KEY)
- title (TEXT)
- content (TEXT)
- target_audience (TEXT) ← กลุ่มเป้าหมาย
- created_by (INTEGER) ← ผู้สร้าง
- created_at, updated_at (TIMESTAMP)
```

### 6. messages - ข้อความระหว่างผู้ใช้
```sql
- id (SERIAL PRIMARY KEY)
- sender_id (INTEGER)
- recipient_id (INTEGER)
- subject (TEXT)
- content (TEXT)
- is_read (BOOLEAN DEFAULT false)
- created_at, updated_at (TIMESTAMP)
```

### 7. admin_messages - ข้อความถึงแอดมิน
```sql
- id (SERIAL PRIMARY KEY)
- sender_name (TEXT)
- sender_email (TEXT)
- subject (TEXT)
- content (TEXT)
- is_anonymous (BOOLEAN DEFAULT false)
- is_read (BOOLEAN DEFAULT false)
- created_at (TIMESTAMP)
```

### 8. reports - รายงานปัญหา
```sql
- id (SERIAL PRIMARY KEY)
- reporter_id (INTEGER)
- report_type (TEXT)
- title (TEXT)
- description (TEXT)
- status (TEXT DEFAULT 'pending')
- created_at, updated_at (TIMESTAMP)
```

### 9. dress_code - กฎระเบียบการแต่งกาย
```sql
- id (SERIAL PRIMARY KEY)
- title (TEXT)
- description (TEXT)
- day_of_week (TEXT)
- created_at, updated_at (TIMESTAMP)
```

### 10. schedules - ตารางเรียน/กำหนดการ
```sql
- id (SERIAL PRIMARY KEY)
- title (TEXT)
- description (TEXT)
- type (TEXT)
- date (DATE)
- created_at, updated_at (TIMESTAMP)
```

### 11. ai_knowledge - ฐานความรู้ AI
```sql
- id (SERIAL PRIMARY KEY)
- question (TEXT)
- answer (TEXT)
- keywords (TEXT)
- category (TEXT)
- created_at, updated_at (TIMESTAMP)
```

### 12. logins - ประวัติการเข้าสู่ระบบ
```sql
- id (SERIAL PRIMARY KEY)
- user_id (INTEGER)
- user_type (TEXT) ← admin/student/teacher
- login_time (TIMESTAMP)
- ip_address (TEXT)
- user_agent (TEXT)
```

## Indexes

Schema นี้สร้าง indexes เพื่อเพิ่มความเร็วในการค้นหา:

- `idx_logins_user_id` - ค้นหาประวัติล็อกอินตาม user
- `idx_logins_user_type` - ค้นหาตามประเภทผู้ใช้
- `idx_users_class_code` - ค้นหานักเรียนตามห้อง
- `idx_messages_recipient` - ค้นหาข้อความของผู้รับ
- `idx_messages_sender` - ค้นหาข้อความของผู้ส่ง
- `idx_messages_read` - ค้นหาข้อความที่ยังไม่ได้อ่าน
- `idx_events_date` - ค้นหากิจกรรมตามวันที่
- `idx_schedules_date` - ค้นหาตารางตามวันที่
- `idx_ai_knowledge_category` - ค้นหาความรู้ตามหมวดหมู่

## Row Level Security (RLS)

ทุกตารางเปิด RLS แล้ว และมี policy พื้นฐาน:
- Service role สามารถทำทุกอย่างได้
- คุณอาจต้องเพิ่ม policies สำหรับ users ปกติ

### ตัวอย่าง Policy สำหรับ Messages
```sql
-- ผู้ใช้สามารถอ่านข้อความของตัวเองเท่านั้น
CREATE POLICY "Users can read own messages" ON messages
  FOR SELECT USING (
    auth.uid()::text::int = sender_id 
    OR auth.uid()::text::int = recipient_id
  );

-- ผู้ใช้สามารถส่งข้อความได้
CREATE POLICY "Users can send messages" ON messages
  FOR INSERT WITH CHECK (
    auth.uid()::text::int = sender_id
  );
```

## การตรวจสอบหลังรัน SQL

### ตรวจสอบตาราง
```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name;
```

### ตรวจสอบจำนวนข้อมูลในแต่ละตาราง
```sql
SELECT 
  'admins' as table_name, COUNT(*) as count FROM admins
UNION ALL
SELECT 'users', COUNT(*) FROM users
UNION ALL
SELECT 'teachers', COUNT(*) FROM teachers
UNION ALL
SELECT 'events', COUNT(*) FROM events
UNION ALL
SELECT 'announcements', COUNT(*) FROM announcements
UNION ALL
SELECT 'messages', COUNT(*) FROM messages
UNION ALL
SELECT 'admin_messages', COUNT(*) FROM admin_messages
UNION ALL
SELECT 'reports', COUNT(*) FROM reports
UNION ALL
SELECT 'dress_code', COUNT(*) FROM dress_code
UNION ALL
SELECT 'schedules', COUNT(*) FROM schedules
UNION ALL
SELECT 'ai_knowledge', COUNT(*) FROM ai_knowledge
UNION ALL
SELECT 'logins', COUNT(*) FROM logins;
```

### ตรวจสอบ Indexes
```sql
SELECT 
  tablename, 
  indexname, 
  indexdef 
FROM pg_indexes 
WHERE schemaname = 'public' 
ORDER BY tablename, indexname;
```

## ปัญหาที่อาจพบ

### ❌ Error: "relation already exists"
**แก้ไข**: ตารางมีอยู่แล้ว ใช้ `DROP TABLE IF EXISTS table_name CASCADE;` ก่อนรัน schema ใหม่

### ❌ Error: "permission denied"
**แก้ไข**: ตรวจสอบว่าคุณใช้ service_role key หรือมีสิทธิ์เพียงพอ

### ❌ Error: "syntax error"
**แก้ไข**: ตรวจสอบว่าคัดลอก SQL ครบทั้งหมด และไม่มีการตัดบรรทัด

## ขั้นตอนถัดไป

หลังจากรัน SQL สำเร็จแล้ว:

1. ✅ สร้าง Admin user ด้วย `node scripts/create-admin-pg.js admin admin123`
2. ✅ รันโปรเจกต์ด้วย `npm run dev`
3. ✅ ทดสอบเข้าสู่ระบบที่ http://localhost:3000/admin/login
4. ✅ สำรวจระบบและสร้างข้อมูลทดสอบ

## ลิงก์ที่เป็นประโยชน์

- **SQL Editor**: https://app.supabase.com/project/vfjhlezyupshnozthsja/sql
- **Table Editor**: https://app.supabase.com/project/vfjhlezyupshnozthsja/editor
- **Database Settings**: https://app.supabase.com/project/vfjhlezyupshnozthsja/settings/database
- **API Docs**: https://app.supabase.com/project/vfjhlezyupshnozthsja/api
- **Logs**: https://app.supabase.com/project/vfjhlezyupshnozthsja/logs/explorer

---

**หมายเหตุ**: ไฟล์นี้เป็นเอกสารประกอบ ไม่จำเป็นต้องรัน ให้ใช้ไฟล์ `supabase-schema.sql` แทน
