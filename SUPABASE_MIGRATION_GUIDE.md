# คู่มือการ Migrate ไปยัง Supabase

## ขั้นตอนที่ 1: สร้าง Database บน Supabase

1. เข้าสู่ระบบที่ [Supabase Dashboard](https://app.supabase.com)
2. เลือกโปรเจกต์ของคุณ: `vfjhlezyupshnozthsja`
3. ไปที่ SQL Editor (เมนูด้านซ้าย)
4. สร้าง New Query
5. คัดลอกเนื้อหาทั้งหมดจากไฟล์ `supabase-schema.sql`
6. Paste ลงใน SQL Editor
7. กด Run (F5 หรือปุ่ม Run)

## ขั้นตอนที่ 2: ตรวจสอบการเชื่อมต่อ

ตรวจสอบไฟล์ `.env.local` ว่ามีข้อมูลดังนี้:

```env
DATABASE_URL=your_supabase_database_url_here
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url_here
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key_here
GROQ_API_KEY=your_groq_api_key_here
ADMIN_KEY=admin123
TEACHER_KEY=teacher123
```

## ขั้นตอนที่ 3: สร้างผู้ดูแลระบบคนแรก

รันคำสั่งเพื่อสร้างแอดมิน:

```powershell
node create-db.js
```

หรือใช้ node script:

```powershell
node scripts/create-admin-pg.js
```

## ขั้นตอนที่ 4: Build และรันโปรเจกต์

```powershell
# Build โปรเจกต์
npm run build

# รันเซิร์ฟเวอร์ development
npm run dev

# หรือรันเซิร์ฟเวอร์ production
npm start
```

## ขั้นตอนที่ 5: ทดสอบการเชื่อมต่อ

1. เปิดเบราว์เซอร์ไปที่ http://localhost:3000
2. เข้าสู่ระบบแอดมินที่ http://localhost:3000/admin/login
3. ทดสอบสร้างข้อมูลต่างๆ

## การเปลี่ยนแปลงที่สำคัญ

### ไฟล์ที่ถูกลบ
- ❌ `data/kss.db` - SQLite database
- ❌ `data/kss.db-shm` - SQLite shared memory
- ❌ `data/kss.db-wal` - SQLite write-ahead log
- ❌ `scripts/train-ai-knowledge.js` - ใช้ SQLite
- ❌ `scripts/list-teachers.js` - ใช้ SQLite
- ❌ `scripts/list-admins.js` - ใช้ SQLite
- ❌ `scripts/create-student.js` - ใช้ SQLite
- ❌ `scripts/create-admin.js` - ใช้ SQLite
- ❌ `create-admin-direct.js` - ใช้ SQLite

### ไฟล์ที่ถูกแก้ไข
- ✅ `lib/db.ts` - ใช้ PostgreSQL (pg) แทน SQLite
- ✅ `app/api/admin/users/route.ts` - อัปเดตให้ใช้ PostgreSQL
- ✅ `app/api/admin/teachers/route.ts` - อัปเดตให้ใช้ PostgreSQL
- ✅ `package.json` - ลบ better-sqlite3 dependencies

### ไฟล์ใหม่
- ✨ `supabase-schema.sql` - SQL schema สำหรับ Supabase

## Row Level Security (RLS)

Schema ที่สร้างมีการเปิด RLS ไว้แล้ว แต่มี policy ที่อนุญาตให้ service_role ทำทุกอย่างได้

หากต้องการความปลอดภัยมากขึ้น สามารถปรับแต่ง RLS policies ได้ที่ Supabase Dashboard > Authentication > Policies

## การ Backup ข้อมูล

Supabase มีระบบ backup อัตโนมัติ แต่คุณสามารถทำ manual backup ได้โดย:

1. ไปที่ Supabase Dashboard
2. เลือก Database > Backups
3. คลิก "Create backup"

## Troubleshooting

### ปัญหา: ไม่สามารถเชื่อมต่อ database
- ตรวจสอบ `DATABASE_URL` ใน `.env.local`
- ตรวจสอบว่า Supabase project ยังทำงานอยู่
- ตรวจสอบ network/firewall settings

### ปัญหา: Build error
- รัน `npm install` ใหม่
- ลบโฟลเดอร์ `.next` และ build ใหม่
- ตรวจสอบว่าไม่มี syntax errors

### ปัญหา: ไม่มีข้อมูลในตาราง
- รัน SQL schema อีกครั้ง
- ตรวจสอบ RLS policies
- ตรวจสอบ logs ใน Supabase Dashboard

## การเพิ่ม Service Role Key (ถ้าต้องการ)

หากต้องการใช้ service role key สำหรับการทำงานที่ bypass RLS:

1. ไปที่ Supabase Dashboard > Settings > API
2. คัดลอก `service_role` key
3. เพิ่มใน `.env.local`:
   ```env
   SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
   ```

**⚠️ คำเตือน**: ห้ามใช้ service_role key ใน client-side code!

## ข้อมูลเพิ่มเติม

- [Supabase Documentation](https://supabase.com/docs)
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
- [Next.js Documentation](https://nextjs.org/docs)
