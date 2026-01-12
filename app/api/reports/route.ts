import { NextResponse } from 'next/server';
import { z } from 'zod';
import { insertReport } from '@/lib/db';

export const runtime = 'nodejs';

const ReportSchema = z.object({
  title: z.string().min(1, 'กรุณากรอกเรื่องที่แจ้ง'),
  detail: z.string().optional().default(''),
  imageUrl: z.string().url().optional(),
});

export async function POST(req: Request) {
  try {
    const data = await req.json();
    const parsed = ReportSchema.safeParse(data);
    if (!parsed.success) {
      return NextResponse.json({ ok: false, errors: parsed.error.flatten() }, { status: 400 });
    }
    const { title, detail, imageUrl } = parsed.data;
    const result = insertReport(title, detail ?? '', imageUrl);
    return NextResponse.json({ ok: true, id: result.id, createdAt: result.createdAt });
  } catch (err) {
    return NextResponse.json({ ok: false, message: 'เกิดข้อผิดพลาด' }, { status: 500 });
  }
}
