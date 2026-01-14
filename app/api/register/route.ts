import { NextResponse } from 'next/server';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import { createUser, insertLogin, findUser } from '@/lib/db';

export const runtime = 'nodejs';

const classCodes: string[] = [];
for (let grade = 1; grade <= 6; grade++) {
  const maxRoom = grade <= 3 ? 5 : 4;
  for (let room = 1; room <= maxRoom; room++) {
    classCodes.push(`ม.${grade}/${room}`);
  }
}

const RegisterSchema = z.object({
  firstName: z.string().min(1, 'กรุณากรอกชื่อ'),
  lastName: z.string().min(1, 'กรุณากรอกนามสกุล'),
  classCode: z.string().refine((v) => classCodes.includes(v), 'กรุณาเลือกห้องเรียนที่ถูกต้อง'),
  password: z.string().min(6, 'รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร'),
});

export async function POST(req: Request) {
  try {
    const data = await req.json();
    const parsed = RegisterSchema.safeParse(data);
    if (!parsed.success) {
      return NextResponse.json({ ok: false, errors: parsed.error.flatten() }, { status: 400 });
    }

    const { firstName, lastName, classCode, password } = parsed.data;

    // Generate username from firstName + lastName + classCode
    const username = `${firstName.toLowerCase()}.${lastName.toLowerCase()}`;
    
    const existing = await findUser(username);
    if (existing) {
      return NextResponse.json({ ok: false, message: 'มีผู้ใช้งานนี้อยู่แล้ว กรุณาเข้าสู่ระบบ' }, { status: 409 });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const created = await createUser(username, passwordHash, firstName, lastName, classCode);
    
    // Optional: initial login record
    await insertLogin(created.id, 'student', '', '');

    const res = NextResponse.json({ 
      ok: true, 
      id: created.id, 
      createdAt: created.created_at,
      userId: created.id,
      classCode: classCode
    });
    // Allow client-side checks for the login cookie
    res.cookies.set('kss_user', String(created.id), {
      httpOnly: false,
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 180, // 180 days
    });
    return res;
  } catch (err) {
    console.error('Register error:', err);
    return NextResponse.json({ ok: false, message: 'เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง' }, { status: 500 });
  }
}
