import { NextResponse } from 'next/server';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import Database from 'better-sqlite3';
import path from 'path';

export const runtime = 'nodejs';

function isAdminSession(req: Request) {
  const adminId = req.headers.get('cookie')?.match(/kss_admin=([^;]+)/)?.[1];
  return !!adminId;
}

function getDb() {
  const dbPath = path.join(process.cwd(), 'data', 'kss.db');
  return new Database(dbPath);
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
    const db = getDb();
    const teachers = db.prepare('SELECT id, first_name, last_name, created_at FROM teachers ORDER BY id DESC').all();
    db.close();
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

  let db;
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
    db = getDb();

    // Check if teacher exists (by name)
    const existing = db.prepare('SELECT id FROM teachers WHERE first_name = ? AND last_name = ?').get(firstName, lastName);
    if (existing) {
      db.close();
      return NextResponse.json({ ok: false, message: 'มีครูนี้อยู่แล้ว' }, { status: 409 });
    }

    // Hash password and insert
    const passwordHash = await bcrypt.hash(password, 10);
    const stmt = db.prepare(`
      INSERT INTO teachers (first_name, last_name, password_hash, created_at)
      VALUES (?, ?, ?, datetime('now'))
    `);
    const result = stmt.run(firstName, lastName, passwordHash);
    db.close();

    return NextResponse.json({ ok: true, id: result.lastInsertRowid });
  } catch (err: any) {
    if (db) {
      try { db.close(); } catch (e) {}
    }
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

  let db;
  try {
    const body = await req.json();
    const parsed = UpdatePasswordSchema.safeParse(body);
    
    if (!parsed.success) {
      return NextResponse.json({ ok: false, message: 'ข้อมูลไม่ถูกต้อง' }, { status: 400 });
    }

    const { teacherId, password } = parsed.data;
    
    // Hash new password
    const passwordHash = await bcrypt.hash(password, 10);
    
    db = getDb();
    db.prepare('UPDATE teachers SET password_hash = ? WHERE id = ?').run(passwordHash, teacherId);
    db.close();

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    if (db) {
      try { db.close(); } catch (e) {}
    }
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
    const db = getDb();
    db.prepare('DELETE FROM teachers WHERE id = ?').run(teacherId);
    db.close();

    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ ok: false, message: 'เกิดข้อผิดพลาด' }, { status: 500 });
  }
}
