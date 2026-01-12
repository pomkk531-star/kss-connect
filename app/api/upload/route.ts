import { NextRequest, NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';
import { existsSync } from 'fs';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File;
    
    if (!file) {
      return NextResponse.json({ ok: false, message: 'ไม่พบไฟล์' }, { status: 400 });
    }

    // Check file type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json({ ok: false, message: 'รองรับเฉพาะไฟล์ JPG, PNG, GIF' }, { status: 400 });
    }

    // Check file size (5MB max)
    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json({ ok: false, message: 'ไฟล์ใหญ่เกิน 5MB' }, { status: 400 });
    }

    // Create uploads directory if not exists
    const uploadDir = path.join(process.cwd(), 'public', 'uploads');
    if (!existsSync(uploadDir)) {
      await mkdir(uploadDir, { recursive: true });
    }

    // Generate unique filename
    const timestamp = Date.now();
    const ext = path.extname(file.name);
    const filename = `${timestamp}${ext}`;
    const filepath = path.join(uploadDir, filename);

    // Convert file to buffer and save
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    await writeFile(filepath, buffer);

    // Return URL path
    const imageUrl = `/uploads/${filename}`;
    return NextResponse.json({ ok: true, imageUrl });
  } catch (error: any) {
    console.error('Upload error:', error);
    return NextResponse.json({ ok: false, message: 'เกิดข้อผิดพลาดในการอัปโหลด' }, { status: 500 });
  }
}
