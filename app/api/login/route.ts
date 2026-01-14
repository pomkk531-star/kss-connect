import { NextResponse } from 'next/server';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import { insertLogin, findUser } from '@/lib/db';

export const runtime = 'nodejs';

const LoginSchema = z.object({
  username: z.string().min(1, 'กรุณากรอกชื่อผู้ใช้'),
  password: z.string().min(1, 'กรุณากรอกรหัสผ่าน'),
});

export async function POST(req: Request) {
  try {
    const data = await req.json();
    const parsed = LoginSchema.safeParse(data);
    if (!parsed.success) {
      return NextResponse.json({ ok: false, errors: parsed.error.flatten() }, { status: 400 });
    }

    const { username, password } = parsed.data;
    const user = await findUser(username);
    
    if (!user) {
      return NextResponse.json(
        { ok: false, message: 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง' },
        { status: 401 }
      );
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return NextResponse.json(
        { ok: false, message: 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง' },
        { status: 401 }
      );
    }

    await insertLogin(user.id, 'student', '', '');

    const res = NextResponse.json({
      ok: true,
      userId: user.id,
      firstName: user.first_name,
      lastName: user.last_name,
      classCode: user.class_code,
    });

    res.cookies.set('kss_user', String(user.id), {
      httpOnly: false,
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 180,
    });

    return res;
  } catch (err) {
    console.error('Login error:', err);
    return NextResponse.json({ ok: false, message: 'เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง' }, { status: 500 });
  }
}
