# สรุปการ Migrate จาก SQLite ไปยัง Supabase (PostgreSQL)

## ✅ สิ่งที่ทำเสร็จแล้ว

### 1. สร้างไฟล์ SQL Schema
- ✅ สร้างไฟล์ `supabase-schema.sql` พร้อม:
  - 12 ตาราง (logins, admins, users, events, announcements, messages, admin_messages, reports, dress_code, schedules, teachers, ai_knowledge)
  - Indexes เพื่อเพิ่มประสิทธิภาพ
  - Row Level Security (RLS) policies

### 2. อัปเดตไฟล์ Environment
- ✅ เพิ่ม `NEXT_PUBLIC_SUPABASE_URL` และ `NEXT_PUBLIC_SUPABASE_ANON_KEY` ใน `.env.local`
- ✅ `DATABASE_URL` ใช้ Supabase PostgreSQL connection string

### 3. ลบไฟล์ SQLite และ Dependencies
- ✅ ลบ `data/kss.db*` (database files)
- ✅ ลบ `better-sqlite3` และ `@types/better-sqlite3` จาก `package.json`
- ✅ ลบ scripts ที่ใช้ SQLite:
  - `scripts/train-ai-knowledge.js`
  - `scripts/list-teachers.js`
  - `scripts/list-admins.js`
  - `scripts/create-student.js`
  - `scripts/create-admin.js`
  - `create-admin-direct.js`

### 4. แก้ไข API Routes
- ✅ `app/api/admin/users/route.ts` - ใช้ PostgreSQL
- ✅ `app/api/admin/teachers/route.ts` - ใช้ PostgreSQL

### 5. สร้างเอกสารประกอบ
- ✅ `SUPABASE_MIGRATION_GUIDE.md` - คู่มือการ migrate และใช้งาน

### 6. Database Layer
- ✅ `lib/db.ts` ใช้ PostgreSQL (pg) อยู่แล้ว

## 📋 ขั้นตอนถัดไปที่คุณต้องทำ

### 1. รัน SQL Schema บน Supabase (สำคัญมาก!)

```bash
# เปิดไฟล์ supabase-schema.sql
# คัดลอกเนื้อหาทั้งหมด
# ไปที่ Supabase Dashboard > SQL Editor
# Paste และ Run
```

หรือเข้าที่: https://app.supabase.com/project/vfjhlezyupshnozthsja/sql

### 2. สร้าง Admin User คนแรก

```powershell
# ใช้ script ที่มีอยู่
node scripts/create-admin-pg.js admin admin123

# หรือใช้ create-db.js
node create-db.js
```

### 3. ติดตั้ง Dependencies (ถ้ายังไม่ได้ทำ)

```powershell
npm install
```

### 4. Build และ Test

```powershell
# Build โปรเจกต์
npm run build

# รันโปรเจกต์
npm run dev
```

### 5. ทดสอบการทำงาน

1. เปิด http://localhost:3000
2. ไปที่ http://localhost:3000/admin/login
3. ล็อกอิน username: `admin`, password: `admin123`
4. ทดสอบสร้าง:
   - นักเรียน
   - ครู
   - ประกาศ
   - กิจกรรม

## 🔍 ตรวจสอบการเปลี่ยนแปลง

### ก่อน Migrate (SQLite)
```
├── data/
│   └── kss.db          ← SQLite database
├── lib/
│   └── db.ts          ← ใช้ better-sqlite3
└── scripts/
    ├── create-admin.js    ← SQLite
    └── list-admins.js     ← SQLite
```

### หลัง Migrate (Supabase)
```
├── data/
│   └── (ว่าง - ไม่มี .db files)
├── lib/
│   └── db.ts          ← ใช้ PostgreSQL (pg)
├── scripts/
│   └── create-admin-pg.js  ← PostgreSQL
├── supabase-schema.sql    ← Schema สำหรับ Supabase
└── SUPABASE_MIGRATION_GUIDE.md
```

## ⚙️ การตั้งค่า Supabase

### ข้อมูลการเชื่อมต่อ
- **Project URL**: https://vfjhlezyupshnozthsja.supabase.co
- **Database Host**: aws-1-ap-south-1.pooler.supabase.com
- **Database Port**: 6543
- **Database Name**: postgres

### Environment Variables
```env
DATABASE_URL=postgresql://postgres.vfjhlezyupshnozthsja:0967731558bestza@aws-1-ap-south-1.pooler.supabase.com:6543/postgres
NEXT_PUBLIC_SUPABASE_URL=https://vfjhlezyupshnozthsja.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_sNadDJyIH82Jq-mcfTIByQ_keK24jaZ
```

## 🎯 ตารางใน Database

| ตาราง | จุดประสงค์ |
|-------|----------|
| logins | บันทึกประวัติการเข้าสู่ระบบ |
| admins | ข้อมูลผู้ดูแลระบบ |
| users | ข้อมูลนักเรียน |
| teachers | ข้อมูลครู |
| events | กิจกรรม |
| announcements | ประกาศ |
| messages | ข้อความระหว่างผู้ใช้ |
| admin_messages | ข้อความถึงแอดมิน (รองรับ anonymous) |
| reports | รายงานปัญหา |
| dress_code | กฎระเบียบการแต่งกาย |
| schedules | ตารางเรียน/กำหนดการ |
| ai_knowledge | ฐานความรู้สำหรับ AI |

## 🚨 สิ่งที่ต้องระวัง

1. **RLS Policies**: ตอนนี้เปิด RLS แต่อนุญาตทุกอย่างสำหรับ service_role คุณอาจต้องปรับแต่งเพิ่มเติม
2. **Password Hashing**: ตรวจสอบว่า password hash ทำงานถูกต้อง
3. **Connection Pooling**: Supabase ใช้ connection pooling จำกัดจำนวน connections
4. **Backup**: ตั้งค่า automatic backup ใน Supabase Dashboard

## 📚 เอกสารเพิ่มเติม

- คู่มือการใช้งาน: `SUPABASE_MIGRATION_GUIDE.md`
- Supabase Dashboard: https://app.supabase.com/project/vfjhlezyupshnozthsja
- SQL Editor: https://app.supabase.com/project/vfjhlezyupshnozthsja/sql

## ✨ ความสามารถใหม่ที่ได้จาก Supabase

1. **Realtime**: สามารถใช้ Supabase Realtime สำหรับ live updates
2. **Storage**: ใช้ Supabase Storage สำหรับเก็บไฟล์
3. **Auth**: ใช้ Supabase Auth สำหรับการจัดการ authentication
4. **Dashboard**: จัดการข้อมูลผ่าน Supabase Dashboard
5. **Backup**: Automatic backup และ point-in-time recovery
6. **Scalability**: รองรับผู้ใช้งานจำนวนมากได้ดีกว่า SQLite

## 🎉 สรุป

โปรเจกต์ KSS Connect พร้อมสำหรับใช้งานกับ Supabase แล้ว! 

**ขั้นตอนสำคัญที่เหลือ:**
1. รัน SQL schema บน Supabase
2. สร้าง admin user
3. Test การทำงาน

หากมีปัญหาหรือข้อสงสัย ดูได้ที่ `SUPABASE_MIGRATION_GUIDE.md`
