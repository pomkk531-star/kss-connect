import { NextResponse } from "next/server";
import { listAllAIKnowledge, insertAIKnowledge, updateAIKnowledge, deleteAIKnowledge } from "@/lib/db";

function normalize(text: string): string {
  return (text || "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

function hasAny(text: string, tokens: string[]): boolean {
  const t = normalize(text);
  return tokens.some((k) => t.includes(k));
}

function detectCategory(question: string, answer: string): string {
  const txt = `${normalize(question)} ${normalize(answer)}`;

  if (hasAny(txt, ["เวลาเรียน", "เข้าเรียน", "เลิกเรียน", "ตารางเรียน", "schedule", "time"])) {
    return "เวลาเรียน";
  }
  if (hasAny(txt, ["กิจกรรม", "ปฏิทิน", "event", "งาน", "ชุมนุม"])) {
    return "กิจกรรม";
  }
  if (hasAny(txt, ["แต่งกาย", "ระเบียบ", "เครื่องแบบ", "กฎ", "ข้อบังคับ"])) {
    return "ระเบียบ";
  }
  if (hasAny(txt, ["ติดต่อ", "โทร", "เบอร์", "อีเมล", "email", "facebook"])) {
    return "ติดต่อ";
  }
  if (hasAny(txt, ["ห้องสมุด", "library", "โรงอาหาร", "อาคาร", "ตำแหน่ง", "สถานที่"])) {
    return "สถานที่";
  }
  return "ทั่วไป";
}

function buildKeywords(category: string, question: string, answer: string): string {
  const base: Record<string, string[]> = {
    "เวลาเรียน": ["เวลา", "เข้าเรียน", "เลิกเรียน", "ตาราง", "พักเที่ยง"],
    "กิจกรรม": ["กิจกรรม", "ปฏิทิน", "งาน", "ชุมนุม", "แข่งขัน"],
    "ระเบียบ": ["ระเบียบ", "แต่งกาย", "เครื่องแบบ", "กฎ", "วินัย"],
    "ติดต่อ": ["ติดต่อ", "โทร", "เบอร์", "อีเมล", "facebook"],
    "สถานที่": ["ห้องสมุด", "โรงอาหาร", "อาคาร", "ห้อง", "ตำแหน่ง"],
    "ทั่วไป": ["ข้อมูล", "โรงเรียน", "ทั่วไป"],
  };
  const txt = `${normalize(question)} ${normalize(answer)}`;
  const extras: string[] = [];

  // ดึงคีย์เวิร์ดที่พบจริงในข้อความ
  for (const kw of base[category] || []) {
    if (txt.includes(kw)) extras.push(kw);
  }

  // กันลิสต์ซ้ำ และประกอบเป็นสตริง
  const uniq = Array.from(new Set([...(base[category] || []), ...extras]));
  return uniq.join(", ");
}

function isAdminSession(request: Request): boolean {
  const cookie = request.headers.get("cookie");
  if (!cookie) return false;
  return cookie.includes("kss_admin=");
}

export async function GET(request: Request) {
  if (!isAdminSession(request)) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    const knowledge = listAllAIKnowledge();
    return NextResponse.json({ ok: true, knowledge });
  } catch (error) {
    console.error("Error fetching AI knowledge:", error);
    return NextResponse.json({ ok: false, error: "Failed to fetch knowledge" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  if (!isAdminSession(request)) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { question, answer } = body;
    let { keywords, category } = body;

    if (!question || !answer) {
      return NextResponse.json({ ok: false, error: "Question and answer are required" }, { status: 400 });
    }

    // คัดแยกหมวดหมู่และคีย์เวิร์ดอัตโนมัติ หากไม่ได้ระบุหรือเป็น "ทั่วไป"
    const autoCat = detectCategory(question, answer);
    const finalCat = category && category !== "ทั่วไป" && category !== "อัตโนมัติ" && category !== "auto" ? category : autoCat;
    const finalKeywords = keywords && String(keywords).trim().length > 0 ? keywords : buildKeywords(finalCat, question, answer);

    const result = insertAIKnowledge(question, answer, finalKeywords, finalCat);
    return NextResponse.json({ ok: true, id: result.id });
  } catch (error) {
    console.error("Error creating AI knowledge:", error);
    return NextResponse.json({ ok: false, error: "Failed to create knowledge" }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  if (!isAdminSession(request)) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { id, question, answer } = body;
    let { keywords, category } = body;

    if (!id || !question || !answer) {
      return NextResponse.json({ ok: false, error: "ID, question and answer are required" }, { status: 400 });
    }

    // อัปเดตโดยคัดแยกอัตโนมัติถ้าไม่ได้ระบุหรือเป็น "ทั่วไป" หรือ keywords ว่าง
    const autoCat = detectCategory(question, answer);
    const finalCat = category && category !== "ทั่วไป" && category !== "อัตโนมัติ" && category !== "auto" ? category : autoCat;
    const finalKeywords = keywords && String(keywords).trim().length > 0 ? keywords : buildKeywords(finalCat, question, answer);

    updateAIKnowledge(id, question, answer, finalKeywords, finalCat);
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Error updating AI knowledge:", error);
    return NextResponse.json({ ok: false, error: "Failed to update knowledge" }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  if (!isAdminSession(request)) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    const url = new URL(request.url);
    const id = url.searchParams.get("id");

    if (!id) {
      return NextResponse.json({ ok: false, error: "ID is required" }, { status: 400 });
    }

    deleteAIKnowledge(Number(id));
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Error deleting AI knowledge:", error);
    return NextResponse.json({ ok: false, error: "Failed to delete knowledge" }, { status: 500 });
  }
}
