import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { createAdmin, findAdmin } from '@/lib/db';

export const runtime = 'nodejs';

// API สำหรับสร้างแอดมิน
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { username, password } = body;

    if (!username || !password) {
      return NextResponse.json({ ok: false, message: 'กรุณาระบุ username และ password' }, { status: 400 });
    }

    // ตรวจสอบว่ามี username นี้แล้วหรือไม่
    const existing = await findAdmin(username);
    if (existing) {
      return NextResponse.json({ ok: false, message: `มี username "${username}" อยู่แล้ว` }, { status: 409 });
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);
    
    // สร้างแอดมิน
    const result = await createAdmin(username, passwordHash);

    return NextResponse.json({
      ok: true,
      message: 'สร้างแอดมินสำเร็จ',
      admin: {
        id: result.id,
        username: username,
        createdAt: result.createdAt,
      },
    });
  } catch (err) {
    console.error('Error creating admin:', err);
    return NextResponse.json({ ok: false, message: 'เกิดข้อผิดพลาด' }, { status: 500 });
  }
}
