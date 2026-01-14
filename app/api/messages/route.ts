import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { countUnreadMessages, deleteMessage, getUserById, insertMessage, listInbox, markMessageAsRead } from '@/lib/db';

export const runtime = 'nodejs';

const SendSchema = z.object({
  body: z.string().min(1, 'กรุณากรอกข้อความ'),
  recipientId: z.coerce.number().int().positive(),
});

// Profanity list (Thai + English).
// Intentionally broad; extend as needed.
const PROFANITY = [
  // Thai common
  'เหี้ย', 'เฮี้ย', 'ห่า', 'สัส', 'สัด', 'สัตว์', 'ไอสัส', 'ไอสัด', 'ไอเหี้ย', 'ควย', 'ค ว ย', 'ค วย', 'คว ย', 'ควาย',
  'ไอควาย', 'อีควาย', 'ไอบ้า', 'ไอ่บ้า', 'ไอบอ', 'แม่ง', 'พ่อง', 'พ่อมึง', 'แม่มึง', 'มึง', 'กู', 'ไอ้สัตว์', 'เชี่ย',
  'ชิบหาย', 'สถุน', 'อีดอก', 'ดอกทอง', 'เงี่ยน', 'เย็ด', 'หี', 'ตูด', 'อีสัส', 'ไอสัส', 'สาด', 'สาดด',
  // English common / leet-prone
  'fuck', 'shit', 'bitch', 'bastard', 'asshole', 'dick', 'pussy', 'cunt', 'slut', 'whore', 'fag', 'faggot',
  'motherfucker', 'mf', 'wtf', 'bullshit', 'douche', 'douchebag', 'jerk', 'prick'
];

function normalizeForProfanity(text: string) {
  const lowered = text.toLowerCase();
  const noMarks = lowered.normalize('NFKD').replace(/\p{M}+/gu, '');
  // Remove anything that is not a letter or digit to catch spaced/emoji/underscore separated words
  return noMarks.replace(/[^\p{L}\p{N}]+/gu, '');
}

function leetToAlpha(text: string) {
  return text
    .replace(/0/g, 'o')
    .replace(/1/g, 'i')
    .replace(/3/g, 'e')
    .replace(/4/g, 'a')
    .replace(/5/g, 's')
    .replace(/7/g, 't')
    .replace(/8/g, 'b')
    .replace(/@/g, 'a')
    .replace(/\$/g, 's')
    .replace(/!/g, 'i')
    .replace(/\+/g, 't');
}

function containsProfanity(text: string) {
  const candidates = [] as string[];
  const lowered = text.toLowerCase();
  candidates.push(lowered);
  const normalized = normalizeForProfanity(text);
  candidates.push(normalized);
  candidates.push(leetToAlpha(normalized));

  return candidates.some((candidate) =>
    PROFANITY.some((word) => candidate.includes(word.replace(/\s+/g, '')))
  );
}
export async function GET() {
  try {
    const cookieStore = await cookies();
    const userId = Number(cookieStore.get('kss_user')?.value || 0);
    if (!userId) {
      return NextResponse.json({ ok: false, message: 'ยังไม่ได้เข้าสู่ระบบ' }, { status: 401 });
    }
    const messages = listInbox(userId);
    return NextResponse.json({ ok: true, messages });
  } catch (error: any) {
    console.error('[GET /api/messages] error:', error);
    const msg = process.env.NODE_ENV !== 'production' && error?.message ? String(error.message) : 'เกิดข้อผิดพลาด';
    return NextResponse.json({ ok: false, message: msg }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const cookieStore = await cookies();
    const senderId = Number(cookieStore.get('kss_user')?.value || 0);
    if (!senderId) {
      return NextResponse.json({ ok: false, message: 'ยังไม่ได้เข้าสู่ระบบ' }, { status: 401 });
    }
    const data = await req.json();
    const parsed = SendSchema.safeParse(data);
    if (!parsed.success) {
      const errs = parsed.error.flatten();
      const msg = errs.formErrors?.join('\n') || Object.values(errs.fieldErrors || {}).flat().join('\n') || 'ข้อมูลไม่ถูกต้อง';
      return NextResponse.json({ ok: false, message: msg, errors: errs }, { status: 400 });
    }
    const { body, recipientId } = parsed.data;

    if (containsProfanity(body)) {
      return NextResponse.json({ ok: false, message: 'ข้อความมีคำไม่เหมาะสม โปรดแก้ไข' }, { status: 400 });
    }
    
    if (recipientId === senderId) {
      return NextResponse.json({ ok: false, message: 'ไม่สามารถส่งข้อความให้ตัวเองได้' }, { status: 400 });
    }
    
    const recipient = await getUserById(recipientId);
    if (!recipient) {
      return NextResponse.json({ ok: false, message: 'ไม่พบผู้รับ' }, { status: 404 });
    }
    const result = await insertMessage(senderId, recipientId, 'ข้อความใหม่', body);
    return NextResponse.json({ ok: true, id: result.id, createdAt: result.createdAt });
  } catch (error: any) {
    console.error('[POST /api/messages] error:', error);
    const msg = process.env.NODE_ENV !== 'production' && error?.message ? String(error.message) : 'เกิดข้อผิดพลาด';
    return NextResponse.json({ ok: false, message: msg }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const cookieStore = await cookies();
    const userId = Number(cookieStore.get('kss_user')?.value || 0);
    if (!userId) {
      return NextResponse.json({ ok: false, message: 'ยังไม่ได้เข้าสู่ระบบ' }, { status: 401 });
    }
    const { searchParams } = new URL(req.url);
    const messageId = Number(searchParams.get('id') || 0);
    if (!messageId) {
      return NextResponse.json({ ok: false, message: 'ต้องระบุ id' }, { status: 400 });
    }
    await markMessageAsRead(messageId);
    return NextResponse.json({ ok: true });
  } catch (error: any) {
    console.error('[PUT /api/messages] error:', error);
    const msg = process.env.NODE_ENV !== 'production' && error?.message ? String(error.message) : 'เกิดข้อผิดพลาด';
    return NextResponse.json({ ok: false, message: msg }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const cookieStore = await cookies();
    const userId = Number(cookieStore.get('kss_user')?.value || 0);
    if (!userId) {
      return NextResponse.json({ ok: false, message: 'ยังไม่ได้เข้าสู่ระบบ' }, { status: 401 });
    }
    const { searchParams } = new URL(req.url);
    const messageId = Number(searchParams.get('id') || 0);
    if (!messageId) {
      return NextResponse.json({ ok: false, message: 'ต้องระบุ id' }, { status: 400 });
    }
    await deleteMessage(messageId);
    return NextResponse.json({ ok: true });
  } catch (error: any) {
    console.error('[DELETE /api/messages] error:', error);
    const msg = process.env.NODE_ENV !== 'production' && error?.message ? String(error.message) : 'เกิดข้อผิดพลาด';
    return NextResponse.json({ ok: false, message: msg }, { status: 500 });
  }
}
