# 🔧 วิธีแก้ไข Error: "column "user_id" does not exist"

## 🚨 ปัญหา

```
ERROR: 42703: column "user_id" does not exist
```

ปัญหานี้เกิดจากตาราง `logins` มีอยู่แล้วจากการรัน schema ครั้งแรก แต่มีปัญหากับโครงสร้าง

## ✅ วิธีแก้ (เลือก 1 ใน 3 วิธี)

### **วิธี 1: ใช้ไฟล์ Clean Version** ⭐️ (ง่ายที่สุด)

1. เปิดไฟล์ `supabase-schema-clean.sql`
2. คัดลอกเนื้อหาทั้งหมด
3. ไปที่ SQL Editor: https://app.supabase.com/project/vfjhlezyupshnozthsja/sql
4. ลบโค้ดเก่า (Ctrl+A, Delete)
5. Paste โค้ดใหม่
6. กด Run
7. รอจนกว่าจะแสดง "Success" ✅

---

### **วิธี 2: รีเซ็ตตาราง Logins เท่านั้น**

ถ้าคุณต้องการเก็บข้อมูลอื่นๆ ให้รัน SQL นี้ก่อน:

```sql
-- ลบตาราง logins เท่านั้น
DROP TABLE IF EXISTS logins CASCADE;

-- สร้างตาราง logins ใหม่
CREATE TABLE logins (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL,
  user_type TEXT NOT NULL,
  login_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  ip_address TEXT,
  user_agent TEXT
);

CREATE INDEX idx_logins_user_id ON logins(user_id);
CREATE INDEX idx_logins_user_type ON logins(user_type);

ALTER TABLE logins ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Enable all for service role" ON logins FOR ALL USING (true);
```

---

### **วิธี 3: แก้ไขใน SQL Editor ทีละขั้นตอน**

```sql
-- 1. ตรวจสอบคอลัมน์ของตาราง logins
\d logins

-- 2. ถ้าหาไม่เจอ user_id ให้เพิ่มคอลัมน์
ALTER TABLE logins ADD COLUMN user_id INTEGER NOT NULL DEFAULT 1;
ALTER TABLE logins ADD COLUMN user_type TEXT NOT NULL DEFAULT 'student';
```

---

## 📋 ขั้นตอนหลังแก้ไข

หลังจากแก้ไขสำเร็จ:

1. ✅ รัน SQL ใหม่
2. ✅ ตรวจสอบตาราง ตามด้านล่าง
3. ✅ สร้าง admin user: `node scripts/create-admin-pg.js admin admin123`
4. ✅ รัน `npm run dev`

---

## 🔍 ตรวจสอบตาราง logins

รันค่าสั่ง SQL นี้เพื่อตรวจสอบ:

```sql
-- แสดงคอลัมน์ทั้งหมด
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'logins'
ORDER BY ordinal_position;

-- นับข้อมูล
SELECT COUNT(*) as total FROM logins;

-- แสดง 10 แถวแรก
SELECT * FROM logins LIMIT 10;
```

---

## 🎯 ตัวอักษร Error ที่เกี่ยวข้อง

| Error Code | ความหมาย | วิธีแก้ |
|-----------|---------|--------|
| 42703 | Column doesn't exist | ใช้ ALTER TABLE ADD COLUMN หรือลบสร้างใหม่ |
| 42P07 | Table already exists | ใช้ IF NOT EXISTS หรือ DROP TABLE |
| 23505 | Duplicate key | ลบข้อมูลซ้ำ หรือเพิ่ม UNIQUE constraint |

---

## 💡 สรุป

- ✅ ใช้ `supabase-schema-clean.sql` ถ้าต้องการรีเซ็ตทั้งหมด
- ✅ ใช้ SQL ด้านบน (วิธี 2) ถ้าต้องการเก็บข้อมูล
- ✅ ตรวจสอบด้วย query ด้านล่าง

ถ้ายังไม่ได้ให้ลอง **วิธี 1** (ใช้ clean version) ตรงไป ✅
