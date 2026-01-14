import { NextResponse } from 'next/server';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import { createTeacher, listTeachers, deleteTeacher } from '@/lib/db';
import { db } from '@/lib/db';

export const runtime = 'nodejs';

function isAdminSession(req: Request) {
  const adminId = req.headers.get('cookie')?.match(/kss_admin=([^;]+)/)?.[1];
  return !!adminId;
}

const CreateTeacherSchema = z.object({
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  password: z.string().min(6),
});

const DeleteTeacherSchema = z.object({
  teacherId: z.number().int().positive(),
});

const UpdatePasswordSchema = z.object({
  teacherId: z.number().int().positive(),
  password: z.string().min(6),
});

// GET - List all teachers
export async function GET(req: Request) {
  if (!isAdminSession(req)) {
    return NextResponse.json({ ok: false, message: 'ต้องเข้าสู่ระบบแอดมินก่อน' }, { status: 401 });
  }

  try {
    const teachers = await listTeachers();
    return NextResponse.json({ ok: true, teachers });
  } catch (err: any) {
    console.error('Error loading teachers:', err);
    return NextResponse.json({ ok: false, message: err.message || 'เกิดข้อผิดพลาด' }, { status: 500 });
  }
}

// POST - Create new teacher
export async function POST(req: Request) {
  if (!isAdminSession(req)) {
    return NextResponse.json({ ok: false, message: 'ต้องเข้าสู่ระบบแอดมินก่อน' }, { status: 401 });
  }

  try {
    const body = await req.json();
    const parsed = CreateTeacherSchema.safeParse(body);
    
    if (!parsed.success) {
      return NextResponse.json({ 
        ok: false, 
        message: 'กรุณากรอกข้อมูลให้ครบถ้วน (รหัสผ่าน 6+ ตัวอักษร)' 
      }, { status: 400 });
    }

    const { firstName, lastName, password } = parsed.data;

    // Check if teacher exists (by name)
    const result = await db.query('SELECT id FROM teachers WHERE first_name = $1 AND last_name = $2', [firstName, lastName]);
    if (result.rows.length > 0) {
      return NextResponse.json({ ok: false, message: 'มีครูนี้อยู่แล้ว' }, { status: 409 });
    }

    // Hash password and insert
    const passwordHash = await bcrypt.hash(password, 10);
    const teacher = await createTeacher(
      `${firstName.toLowerCase()}${lastName.toLowerCase()}`,
      passwordHash,
      firstName,
      lastName,
      '',
      ''
    );

    return NextResponse.json({ ok: true, id: teacher.id });
  } catch (err: any) {
    console.error('Error creating teacher:', err);
    return NextResponse.json({ 
      ok: false, 
      message: err.message || 'เกิดข้อผิดพลาด' 
    }, { status: 500 });
  }
}

// PATCH - Update teacher password
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

    const { teacherId, password } = parsed.data;
    
    // Hash new password
    const passwordHash = await bcrypt.hash(password, 10);
    
    await db.query('UPDATE teachers SET password = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2', [passwordHash, teacherId]);

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    console.error('Error updating teacher password:', err);
    return NextResponse.json({ 
      ok: false, 
      message: err.message || 'เกิดข้อผิดพลาด' 
    }, { status: 500 });
  }
}

// DELETE - Delete teacher
export async function DELETE(req: Request) {
  if (!isAdminSession(req)) {
    return NextResponse.json({ ok: false, message: 'ต้องเข้าสู่ระบบแอดมินก่อน' }, { status: 401 });
  }

  try {
    const body = await req.json();
    const parsed = DeleteTeacherSchema.safeParse(body);
    
    if (!parsed.success) {
      return NextResponse.json({ ok: false, message: 'ข้อมูลไม่ถูกต้อง' }, { status: 400 });
    }

    const { teacherId } = parsed.data;
    await deleteTeacher(teacherId);

    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ ok: false, message: 'เกิดข้อผิดพลาด' }, { status: 500 });
  }
}
