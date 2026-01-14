import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import {
  searchAIKnowledge,
  listAnnouncements,
  listEvents,
  listSchedules,
  getUserById,
} from "@/lib/db";

// ระบบ AI Assistant ที่ใช้ Groq API (ฟรี เร็วมาก ฉลาด)
// ใช้โมเดล Llama 3.1 70B - ฉลาดที่สุดในบรรดา Open Source models

type Message = {
  role: string;
  content: string;
};

// Thai weekday helpers
const TH_WEEKDAYS = ["อาทิตย์", "จันทร์", "อังคาร", "พุธ", "พฤหัสบดี", "ศุกร์", "เสาร์"] as const;
type ThaiWeekday = typeof TH_WEEKDAYS[number];

function thaiWeekdayFromDate(d: Date): ThaiWeekday {
  // getDay(): 0=Sunday..6=Saturday
  return TH_WEEKDAYS[d.getDay()];
}

function normalizeRequestedDay(msg: string): ThaiWeekday | undefined {
  const m = msg.replace(/\s+/g, "").toLowerCase();
  // explicit weekdays
  if (m.includes("วันอาทิตย์") || m.includes("อาทิตย์")) return "อาทิตย์";
  if (m.includes("วันจันทร์") || m.includes("จันทร์")) return "จันทร์";
  if (m.includes("วันอังคาร") || m.includes("อังคาร")) return "อังคาร";
  if (m.includes("วันพุธ") || m.includes("พุธ")) return "พุธ";
  if (m.includes("วันพฤหัสบดี") || m.includes("พฤหัสบดี") || m.includes("พฤหัส")) return "พฤหัสบดี";
  if (m.includes("วันศุกร์") || m.includes("ศุกร์")) return "ศุกร์";
  if (m.includes("วันเสาร์") || m.includes("เสาร์")) return "เสาร์";
  // relative days
  const now = new Date();
  if (m.includes("วันนี้")) return thaiWeekdayFromDate(now);
  if (m.includes("พรุ่งนี้")) {
    const t = new Date(now); t.setDate(now.getDate() + 1); return thaiWeekdayFromDate(t);
  }
  if (m.includes("มะรืนนี้")) {
    const t = new Date(now); t.setDate(now.getDate() + 2); return thaiWeekdayFromDate(t);
  }
  return undefined;
}

function maybeAnswerSchedule(userMessage: string, user?: { id: number; first_name: string; last_name: string; class_code: string }): Promise<string | undefined> {
  return (async () => {
    // Trigger when message likely asks about schedule
    const low = userMessage.toLowerCase();
    const scheduleIntent = /(ตาราง|เรียน|คาบ|schedule)/.test(low);
    if (!scheduleIntent) return undefined;
    if (!user || !user.class_code) {
      return "โปรดเข้าสู่ระบบเพื่อระบุห้องเรียนของคุณ แล้วถามเช่น 'ตารางเรียนวันนี้' ครับ";
    }

    const day = normalizeRequestedDay(userMessage) || thaiWeekdayFromDate(new Date());
  
  // ลองค้นหาในหลายรูปแบบ (รองรับทุกระดับชั้น ทุกวัน)
  const searchPatterns = [
    `${user.class_code} วัน${day}`,
    `วัน${day} ${user.class_code}`,
    `ตารางเรียน ${user.class_code} วัน${day}`,
    `ตารางเรียน ${user.class_code}`,
    // กรณีเป็น ม.X/Y ให้ลองค้นหาแค่ระดับชั้น
    user.class_code.includes('/') ? `${user.class_code.split('/')[0]} วัน${day}` : null,
  ].filter(Boolean) as string[];

  try {
    // ลองค้นหาทุกรูปแบบ
    for (const pattern of searchPatterns) {
      const results = await searchAIKnowledge(pattern) as any[];
      if (results && results.length > 0) {
        // กรองผลลัพธ์ให้ตรงกับห้องเรียนและวัน
        const exactMatch = results.find((r: any) => {
          const q = r.question.toLowerCase();
          const a = r.answer.toLowerCase();
          const classMatch = q.includes(user.class_code.toLowerCase()) || a.includes(user.class_code.toLowerCase());
          const dayMatch = q.includes(day.toLowerCase()) || a.includes(day.toLowerCase());
          return classMatch && dayMatch;
        });

        if (exactMatch) {
          return formatScheduleAnswer(exactMatch.answer, user.class_code, day);
        }

        // ถ้าไม่มีที่ตรงทุกอย่าง ใช้ผลลัพธ์แรก
        const answer = results[0].answer as string;
        return formatScheduleAnswer(answer, user.class_code, day);
      }
    }
  } catch {}
  
  return `ยังไม่พบตารางของห้อง ${user.class_code} สำหรับวัน${day} ในระบบครับ 📚\n\nกรุณาติดต่อครูประจำชั้นหรือเจ้าหน้าที่เพื่อสอบถามข้อมูลครับ`;
  })();
}

function formatScheduleAnswer(answer: string, classCode: string, day: ThaiWeekday): string {
  // ถ้าคำตอบมีรูปแบบที่ดีอยู่แล้ว (มี emoji หรือ line breaks) ให้ใช้เลย
  if (answer.includes('📚') || answer.includes('\n\n')) {
    return answer;
  }

  // ถ้ายังไม่สวย ให้จัดรูปแบบใหม่
  const lines = answer.split('\n').filter(l => l.trim());
  if (lines.length <= 2) {
    return `📚 ตารางเรียนห้อง ${classCode} วัน${day}\n\n${answer}`;
  }

  // มีหลายบรรทัด ให้เพิ่มหัวข้อ
  return `📚 ตารางเรียนห้อง ${classCode} วัน${day}\n\n${answer}`;
}

function formatDateTH(dateStr?: string) {
  if (!dateStr) return "";
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString("th-TH", { year: "numeric", month: "short", day: "numeric" });
  } catch {
    return dateStr;
  }
}

async function buildSystemContext(user?: { id: number; first_name: string; last_name: string; class_code: string }): Promise<string> {
  // Collect real-time data from school systems
  const announcements = (await listAnnouncements() as any[]).slice(0, 5);
  const events = (await listEvents() as any[]).slice(0, 5);
  const schedules = (await listSchedules() as any[]).slice(0, 5);
  const knowledge = (await searchAIKnowledge("") as any[]).slice(0, 10);

  const userInfo = user 
    ? `ผู้ใช้ปัจจุบัน: ${user.first_name} ${user.last_name} ห้อง ${user.class_code}\n\n`
    : "";

  let context = `คุณคือผู้ช่วย AI ของโรงเรียน ที่ฉลาด เป็นมิตร และให้ข้อมูลที่แม่นยำเกี่ยวกับโรงเรียน กิจกรรม และข้อมูลต่างๆ

${userInfo}ข้อมูลสดจากระบบโรงเรียน:

`;

  // Add announcements context
  if (announcements.length > 0) {
    context += `📢 ประกาศล่าสุด:\n`;
    announcements.forEach((a: any) => {
      context += `- ${a.title}: ${a.content} (${formatDateTH(a.created_at)})\n`;
    });
    context += "\n";
  }

  // Add events context
  if (events.length > 0) {
    context += `📅 กิจกรรมที่จะถึง:\n`;
    events.forEach((e: any) => {
      context += `- ${e.title}: ${e.description || ""} (วันที่: ${formatDateTH(e.eventDate)})\n`;
    });
    context += "\n";
  }

  // Add schedules context
  if (schedules.length > 0) {
    context += `🗓️ ตารางล่าสุด:\n`;
    schedules.forEach((s: any) => {
      context += `- ${s.title} (${s.type}): ${s.description || ""} ${s.date ? `(${formatDateTH(s.date)})` : ""}\n`;
    });
    context += "\n";
  }

  // Add knowledge base
  if (knowledge.length > 0) {
    context += `💡 ฐานความรู้โรงเรียน:\n`;
    knowledge.forEach((k: any) => {
      context += `Q: ${k.question}\nA: ${k.answer}\n\n`;
    });
  }

  context += `\nคำแนะนำ:
- ตอบคำถามด้วยภาษาที่เป็นมิตร เข้าใจง่าย
- ใช้ข้อมูลสดจากระบบข้างต้นในการตอบ
- ถ้าไม่แน่ใจหรือไม่มีข้อมูล แนะนำให้ติดต่อเจ้าหน้าที่โรงเรียน
- ใช้อีโมจิให้เหมาะสมเพื่อความน่าสนใจ
- ให้ข้อมูลที่เป็นประโยชน์และตรงประเด็น`;

  return context;
}

async function getAIResponse(
  userMessage: string,
  history: Message[],
  user?: { id: number; first_name: string; last_name: string; class_code: string }
): Promise<string> {
  try {
    // ตรวจสอบว่ามี Groq API key หรือไม่
    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey || apiKey === 'YOUR_GROQ_API_KEY_HERE') {
      console.warn("Groq API key not configured, using fallback");
      return await getFallbackResponse(userMessage, user);
    }

    // Build system context with school data
    const systemContext = await buildSystemContext(user);

    // Prepare messages for Groq API
    const messages: any[] = [
      {
        role: "system",
        content: systemContext
      }
    ];

    // Add conversation history (last 6 turns)
    history.slice(-12).forEach((msg) => {
      messages.push({
        role: msg.role === "user" ? "user" : "assistant",
        content: msg.content
      });
    });

    // Add current user message
    messages.push({
      role: "user",
      content: userMessage
    });

    // Call Groq API
    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        messages: messages,
        temperature: 0.7,
        max_tokens: 1024,
        top_p: 0.9,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Groq API error:", response.status, errorText);
      return await getFallbackResponse(userMessage, user);
    }

    const data = await response.json();
    const aiResponse = data.choices?.[0]?.message?.content;

    if (!aiResponse || aiResponse.trim().length === 0) {
      return await getFallbackResponse(userMessage, user);
    }

    return aiResponse.trim();
  } catch (error: any) {
    console.error("AI Error:", error.message || error);
    return await getFallbackResponse(userMessage, user);
  }
}

async function getFallbackResponse(userMessage: string, user?: { id: number; first_name: string; last_name: string; class_code: string }): Promise<string> {
  const msg = userMessage.toLowerCase();

  // ประกาศ
  if (/(ประกาศ|ข่าว|แจ้ง)/.test(msg)) {
    const ann = (await listAnnouncements() as any[]).slice(0, 3);
    if (!ann.length) return "ยังไม่มีประกาศใหม่ในขณะนี้ครับ";
    const lines = ann.map((a: any) => `• ${a.title}\n  ${String(a.content || "").slice(0, 100)}...`);
    return `📢 ประกาศล่าสุด:\n\n${lines.join("\n\n")}`;
  }

  // กิจกรรม
  if (/(กิจกรรม|ปฏิทิน|event)/.test(msg)) {
    const today = new Date();
    const events = (await listEvents() as any[])
      .filter((e: any) => {
        const d = new Date(e.eventDate);
        return !isNaN(d.getTime()) && d >= new Date(today.toDateString());
      })
      .slice(0, 3);
    if (!events.length) return "ยังไม่มีกิจกรรมที่จะถึงเร็วๆ นี้ครับ";
    const lines = events.map((e: any) => `• ${e.title} — ${formatDateTH(e.eventDate)}`);
    return `📅 กิจกรรมที่จะถึง:\n\n${lines.join("\n")}`;
  }

  // ตารางเรียน
  if (/(ตาราง|schedule|สอบ)/.test(msg)) {
    const schedules = (await listSchedules() as any[]).slice(0, 3);
    if (!schedules.length) return "ยังไม่พบตารางในระบบครับ";
    const lines = schedules.map((s: any) => `• ${s.title} (${s.type})`);
    return `🗓️ ตารางล่าสุด:\n\n${lines.join("\n")}`;
  }

  // ค้นหาฐานความรู้
  try {
    const results = await searchAIKnowledge(userMessage);
    if (results && results.length > 0) {
      return results[0].answer;
    }
  } catch {}

  return `สวัสดีครับ! 😊 ผมคือผู้ช่วย AI ของโรงเรียน\n\nคุณสามารถถามผมเกี่ยวกับ:\n• ประกาศและข่าวสาร\n• กิจกรรมโรงเรียน\n• ตารางเรียนและตารางสอบ\n• ข้อมูลทั่วไปของโรงเรียน\n\nลองถามคำถามของคุณได้เลยครับ!`;
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { message, history = [] } = body;

    if (!message || typeof message !== "string") {
      return NextResponse.json(
        { ok: false, error: "Invalid message" },
        { status: 400 }
      );
    }

    // ดึงบริบทผู้ใช้จากคุกกี้ (ถ้ามี)
    const cookieStore = await cookies();
    const userId = Number(cookieStore.get('kss_user')?.value || 0);
    const user = userId ? await getUserById(userId) : undefined;

    // Try deterministic schedule answer first
    const scheduleAnswer = await maybeAnswerSchedule(message, user);
    const response = scheduleAnswer ?? (await getAIResponse(message, history, user));

    return NextResponse.json({
      ok: true,
      response,
    });
  } catch (error) {
    console.error("AI Chat Error:", error);
    return NextResponse.json(
      { ok: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
