# 🚀 KSS Connect - Quick Reference Guide

## การใช้งานระบบ

### 🔑 Default Test Accounts

```
👨‍🎓 Student Account (Create via UI)
- ชื่อ: สมชาย
- นามสกุล: ใจดี
- ห้องเรียน: ม.1/1
- รหัสผ่าน: password123

👨‍💼 Admin Account (Create via script)
node scripts/create-admin.js admin123 password123

👨‍🏫 Teacher Account (Create via script)
node scripts/create-teacher.js นาย สมดี password123
```

---

## 🛠️ Quick Commands

### Installation & Running
```bash
# 1. Install dependencies
npm install

# 2. Start development server
npm run dev

# 3. Open browser
http://localhost:3000
```

### Create Test Data
```bash
# Create admin
node scripts/create-admin.js admin123 mypassword

# Create student
node scripts/create-student.js สมชาย ใจดี ม.1/1 password123

# Create teacher
node scripts/create-teacher.js นาย สมดี password123

# Train AI knowledge
node scripts/train-ai-knowledge.js
```

### List Data
```bash
# List all admins
node scripts/list-admins.js

# List all teachers
node scripts/list-teachers.js
```

---

## 🎯 User Workflows

### Student Workflow
```
1. เปิด http://localhost:3000
2. ลงทะเบียน (สร้างบัญชี)
   - กรอก: ชื่อ, นามสกุล, ห้องเรียน, รหัสผ่าน
3. เข้าสู่ระบบ (ใช้ชื่อ, นามสกุล, ห้องเรียน, รหัสผ่าน)
4. ใช้ Dashboard
   - 📅 ดูปฏิทิน
   - 💬 ส่งข้อความ
   - 📝 ส่งรายงาน
```

### Admin Workflow
```
1. เปิด http://localhost:3000
2. เข้าสู่ระบบแอดมิน
   - กรอก: ชื่อผู้ใช้ (ไม่มีนามสกุล), รหัสผ่าน
3. เข้า Admin Panel (/admin)
4. จัดการ:
   - 👥 นักเรียน
   - 👨‍🏫 ครู
   - 📢 ประกาศ
   - 📅 กิจกรรม
   - 💬 ข้อความ
   - 📋 รายงาน
   - 🤖 AI Knowledge
```

### Teacher Workflow
```
1. เปิด http://localhost:3000
2. คลิก "เข้าสู่ระบบสำหรับครู"
3. เข้าสู่ระบบ (ชื่อ, นามสกุล, รหัสผ่าน)
4. เข้า Teacher Portal (/teacher)
5. จัดการ:
   - 📢 ประกาศ
   - 📅 กิจกรรม
   - 📋 รายงาน
```

---

## 📁 Project Structure

```
kss-connect/
├── app/
│   ├── page.tsx              ← Login/Register page
│   ├── layout.tsx            ← Root layout
│   ├── globals.css           ← Global styles
│   ├── dashboard/            ← Student dashboard
│   ├── admin/                ← Admin pages
│   ├── teacher/              ← Teacher pages
│   ├── api/                  ← API routes
│   ├── components/           ← Reusable components
│   ├── messages/             ← Messaging page
│   ├── calendar/             ← Calendar page
│   ├── report/               ← Report page
│   └── ai/                   ← AI chat page
├── lib/
│   └── db.ts                 ← Database layer (1,968 lines)
├── public/
│   ├── create-admin.html     ← Admin creation UI
│   ├── create-student.html   ← Student creation UI
│   ├── create-teacher.html   ← Teacher creation UI
│   └── train-ai.html         ← AI training UI
├── scripts/
│   ├── create-admin.js
│   ├── create-student.js
│   ├── create-teacher.js
│   ├── list-admins.js
│   └── train-ai-knowledge.js
├── data/
│   └── kss.db                ← SQLite database
├── package.json              ← Dependencies
├── tsconfig.json             ← TypeScript config
├── next.config.ts            ← Next.js config
└── README.md                 ← Documentation
```

---

## 🗄️ Database Info

### Database File
```
Location: data/kss.db
Type: SQLite (better-sqlite3)
Auto-created: On first run
```

### Tables
```
logins         - บันทึกการเข้าใช้งาน
users          - บัญชีนักเรียน
admins         - บัญชีแอดมิน
teachers       - บัญชีครู
messages       - ข้อความระหว่างผู้ใช้
announcements  - ประกาศ
events         - กิจกรรม
reports        - รายงานปัญหา
dress_code     - ระเบียบแต่งกาย
schedules      - ตารางเรียน
ai_knowledge   - ฐานความรู้ AI
```

---

## 🌐 URLs Reference

### Student URLs
```
Home/Login    http://localhost:3000
Dashboard     http://localhost:3000/dashboard
Messages      http://localhost:3000/messages
Calendar      http://localhost:3000/calendar
Report        http://localhost:3000/report
AI Chat       http://localhost:3000/ai
```

### Admin URLs
```
Admin Panel   http://localhost:3000/admin
Users         http://localhost:3000/admin/users
Teachers      http://localhost:3000/admin/teachers
Announce      http://localhost:3000/admin/announcements
Events        http://localhost:3000/admin/events
Messages      http://localhost:3000/admin/messages
Reports       http://localhost:3000/admin/reports
Dress Code    http://localhost:3000/admin/dress-code
AI Knowledge  http://localhost:3000/admin/ai-knowledge
```

### Teacher URLs
```
Teacher       http://localhost:3000/teacher
Announce      http://localhost:3000/teacher/announcements
Events        http://localhost:3000/teacher/events
Reports       http://localhost:3000/teacher/reports
```

---

## 🎨 Theme Colors

```css
Primary (Kbank Green):  #138F2D
Light Green:           #40AC53
Dark Green:            #0F7124
Very Light:            #E7F5EA
Background:            #ffffff
```

---

## 🔌 API Quick Reference

### Login
```
POST /api/login
{
  "firstName": "สมชาย",
  "lastName": "ใจดี",
  "classCode": "ม.1/1",
  "password": "password123"
}
```

### Register
```
POST /api/register
{
  "firstName": "สมชาย",
  "lastName": "ใจดี",
  "classCode": "ม.1/1",
  "password": "password123"
}
```

### Send Message
```
POST /api/messages
{
  "recipientId": 1,
  "body": "ข้อความของฉัน"
}
```

### Create Report
```
POST /api/reports
{
  "title": "ชื่อรายงาน",
  "detail": "รายละเอียด",
  "imageUrl": "https://..."
}
```

---

## 🔍 Troubleshooting

### Issue: Port 3000 already in use
```bash
# Kill process on port 3000
lsof -ti:3000 | xargs kill -9
# Then run again
npm run dev
```

### Issue: Database not found
```bash
# Delete old database
rm -rf data/kss.db
# Run app again (will auto-create)
npm run dev
```

### Issue: Module not found
```bash
# Reinstall dependencies
rm -rf node_modules package-lock.json
npm install
npm run dev
```

### Issue: Build errors
```bash
# Clear cache
rm -rf .next
# Rebuild
npm run build
```

---

## 📞 Support Features

### Built-in Help
- Each page has descriptions
- Error messages in Thai
- Form validation messages
- Alert tooltips

### Admin Tools (HTML)
Open these in browser:
- `public/create-admin.html`
- `public/create-student.html`
- `public/create-teacher.html`
- `public/train-ai.html`

---

## 🎓 Class Codes (23 Total)

```
ม.1: ม.1/1 ม.1/2 ม.1/3 ม.1/4 ม.1/5
ม.2: ม.2/1 ม.2/2 ม.2/3 ม.2/4 ม.2/5
ม.3: ม.3/1 ม.3/2 ม.3/3 ม.3/4 ม.3/5
ม.4: ม.4/1 ม.4/2 ม.4/3 ม.4/4
ม.5: ม.5/1 ม.5/2 ม.5/3 ม.5/4
ม.6: ม.6/1 ม.6/2 ม.6/3 ม.6/4
```

---

## 📝 Development Tips

### Hot Reload
- Edit files and save
- Changes auto-reload in browser

### Debugging
```bash
# Browser DevTools
F12 or Ctrl+Shift+I

# Console logs
console.log('debug info')

# Network tab
Watch API calls
```

### Testing
1. Create multiple student accounts
2. Login as different users
3. Send messages between users
4. Create/edit events
5. Submit reports with images
6. Test admin features

---

## 🔐 Security Tips

### For Development
- ✅ Use strong passwords
- ✅ Don't commit secrets
- ✅ Use HTTPS in production
- ✅ Validate all inputs

### For Production
```bash
# Build for production
npm run build
npm start

# Set environment variables
export NODE_ENV=production
```

---

## 📊 Performance Tips

### Optimization
- Tailwind CSS already optimized
- Images lazy-loaded
- Database queries prepared
- Components memoized where needed

### Monitoring
- Check browser DevTools
- Monitor API responses
- Check database query performance
- Test with multiple users

---

## 🆘 Common Issues & Solutions

| Issue | Solution |
|-------|----------|
| Login fails | Check username/password/class code |
| Message not send | Ensure profanity filter pass |
| File upload fail | Check file size (max 5MB) |
| Admin can't login | Use username (no surname) |
| Teacher can't access | Check teacher login URL |
| AI not responding | Check API key is set |

---

## 📚 Documentation Files

- `README.md` - Project overview
- `FUNCTIONALITY_TEST_REPORT.md` - Detailed feature list
- `FUNCTIONALITY_CHECK_SUMMARY.md` - Thai summary
- `FEATURE_CHECKLIST.md` - Complete checklist
- `QUICK_REFERENCE.md` - This file

---

## 🚀 Next Steps

1. ✅ `npm install` - Install dependencies
2. ✅ `npm run dev` - Start development
3. ✅ Open `http://localhost:3000`
4. ✅ Create test accounts
5. ✅ Test all features
6. ✅ Deploy to production

---

**Happy coding! 🎉**

Need help? Check the documentation or test the features!
