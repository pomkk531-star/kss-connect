import { NextResponse } from 'next/server';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import { insertLogin, findUser, findUsersByName } from '@/lib/db';

export const runtime = 'nodejs';

// Allowed class codes: ม.1/1-1/5, ม.2/1-2/5, ม.3/1-3/5, ม.4/1-4/4, ม.5/1-5/4, ม.6/1-6/4
const classCodes: string[] = [];
for (let grade = 1; grade <= 6; grade++) {
  const maxRoom = grade <= 3 ? 5 : 4; // grades 1-3 have 5 rooms; 4-6 have 4 rooms
  for (let room = 1; room <= maxRoom; room++) {
    classCodes.push(`ม.${grade}/${room}`);
  }
}

const LoginSchema = z.object({
  firstName: z.string().min(1, 'กรุณากรอกชื่อ'),
  lastName: z.string().min(1, 'กรุณากรอกนามสกุล'),
  classCode: z
    .string()
    .optional()
    .refine((v) => !v || classCodes.includes(v), 'กรุณาเลือกห้องเรียนที่ถูกต้อง'),
  password: z.string().min(1, 'กรุณากรอกรหัสผ่าน'),
});

export async function POST(req: Request) {
  try {
    const data = await req.json();
    const parsed = LoginSchema.safeParse(data);
    if (!parsed.success) {
      return NextResponse.json({ ok: false, errors: parsed.error.flatten() }, { status: 400 });
    }

    const { firstName, lastName, classCode, password } = parsed.data;

    let user: Awaited<ReturnType<typeof findUsersByName>>[number] | undefined;
    
    const matches = await findUsersByName(firstName, lastName);
    
    if (classCode) {
      // ถ้าระบุห้องเรียน ค้นหาตาม classCode
      user = matches.find(u => u.class_code === classCode);
    } else {
      // ถ้าไม่ระบุห้อง ตรวจสอบว่ามีชื่อซ้ำหลายห้องหรือไม่
      if (matches.length > 1) {
        return NextResponse.json(
          { ok: false, message: 'พบชื่อซ้ำหลายห้อง กรุณาเข้าสู่ระบบด้วยห้องเรียนที่ถูกต้องหรือสมัครใหม่เพื่ออัปเดตข้อมูล' },
          { status: 409 }
        );
      }
      user = matches[0];
    }

    if (!user) {
      return NextResponse.json({ ok: false, message: 'ไม่พบบัญชี กรุณาสมัครก่อนเข้าสู่ระบบ' }, { status: 404 });
    }
    
    const isPasswordValid = await bcrypt.compare(password, user.password_hash);
    if (!isPasswordValid) {
      return NextResponse.json({ ok: false, message: 'รหัสผ่านไม่ถูกต้อง' }, { status: 401 });
    }
    
    const result = await insertLogin(firstName, lastName, user.class_code);
    const res = NextResponse.json({ 
      ok: true, 
      id: user.id, 
      createdAt: result.created_at,
      userId: user.id,
      classCode: user.class_code
    });
    // Allow the client-side cookie check used for redirects
    res.cookies.set('kss_user', String(user.id), {
      httpOnly: false,
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 180, // 180 days
    });
    return res;
  } catch (err) {
    return NextResponse.json({ ok: false, message: 'เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง' }, { status: 500 });
  }
}
