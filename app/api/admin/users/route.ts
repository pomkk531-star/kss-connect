import { NextResponse } from 'next/server';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import { listAllUsers, deleteUser, updateUserRole, createUser, findUser } from '@/lib/db';

export const runtime = 'nodejs';

function isAdminSession(req: Request) {
  const adminId = req.headers.get('cookie')?.match(/kss_admin=([^;]+)/)?.[1];
  return !!adminId;
}

const DeleteSchema = z.object({ userId: z.number().int().positive() });
const UpdateRoleSchema = z.object({
  userId: z.number().int().positive(),
  role: z.enum(['student', 'teacher', 'admin'])
});
const UpdatePasswordSchema = z.object({
  userId: z.number().int().positive(),
  password: z.string().min(6)
});
const CreateStudentSchema = z.object({
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  classCode: z.string().min(1),
  password: z.string().min(6),
});

export async function GET(req: Request) {
  if (!isAdminSession(req)) {
    return NextResponse.json({ ok: false, message: 'ต้องเข้าสู่ระบบแอดมินก่อน' }, { status: 401 });
  }
  const users = listAllUsers();
  return NextResponse.json({ ok: true, users });
}

export async function POST(req: Request) {
  if (!isAdminSession(req)) {
    return NextResponse.json({ ok: false, message: 'ต้องเข้าสู่ระบบแอดมินก่อน' }, { status: 401 });
  }

  try {
    const body = await req.json();
    const parsed = CreateStudentSchema.safeParse(body);
    
    if (!parsed.success) {
      return NextResponse.json({ 
        ok: false, 
        message: 'กรุณากรอกข้อมูลให้ครบถ้วน (รหัสผ่าน 6+ ตัวอักษร)' 
      }, { status: 400 });
    }

    const { firstName, lastName, classCode, password } = parsed.data;

    // Check if student exists
    const existing = findUser(firstName, lastName, classCode);
    if (existing) {
      return NextResponse.json({ ok: false, message: 'มีนักเรียนนี้อยู่แล้ว' }, { status: 409 });
    }

    // Hash password and create student
    const passwordHash = await bcrypt.hash(password, 10);
    const created = createUser(firstName, lastName, classCode, passwordHash);

    return NextResponse.json({ ok: true, id: created.id });
  } catch (err) {
    return NextResponse.json({ ok: false, message: 'เกิดข้อผิดพลาด' }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  if (!isAdminSession(req)) {
    return NextResponse.json({ ok: false, message: 'ต้องเข้าสู่ระบบแอดมินก่อน' }, { status: 401 });
  }

  try {
    const body = await req.json();
    const parsed = UpdateRoleSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ ok: false, errors: parsed.error.flatten() }, { status: 400 });
    }

    const { userId, role } = parsed.data;
    updateUserRole(userId, role);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ ok: false, message: 'เกิดข้อผิดพลาด' }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  if (!isAdminSession(req)) {
    return NextResponse.json({ ok: false, message: 'ต้องเข้าสู่ระบบแอดมินก่อน' }, { status: 401 });
  }

  try {
    const body = await req.json();
    const parsed = UpdatePasswordSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ ok: false, message: 'ข้อมูลไม่ถูกต้อง' }, { status: 400 });
    }

    const { userId, password } = parsed.data;
    const passwordHash = await bcrypt.hash(password, 10);
    
    // Update password in database
    const db = require('better-sqlite3')(require('path').join(process.cwd(), 'data', 'kss.db'));
    const stmt = db.prepare('UPDATE users SET password_hash = ? WHERE id = ?');
    stmt.run(passwordHash, userId);
    db.close();

    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ ok: false, message: 'เกิดข้อผิดพลาด' }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  if (!isAdminSession(req)) {
    return NextResponse.json({ ok: false, message: 'ต้องเข้าสู่ระบบแอดมินก่อน' }, { status: 401 });
  }

  try {
    const body = await req.json();
    const parsed = DeleteSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ ok: false, errors: parsed.error.flatten() }, { status: 400 });
    }

    const { userId } = parsed.data;
    deleteUser(userId);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ ok: false, message: 'เกิดข้อผิดพลาด' }, { status: 500 });
  }
}
