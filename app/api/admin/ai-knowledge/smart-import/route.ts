import { NextResponse } from "next/server";
import { insertAIKnowledge } from "@/lib/db";

function isAdminSession(request: Request): boolean {
  const cookie = request.headers.get("cookie");
  if (!cookie) return false;
  return cookie.includes("kss_admin=");
}

/**
 * ใช้ Groq AI แปลงข้อความธรรมดาให้เป็น Q&A pairs อัตโนมัติ
 */
async function extractQAWithAI(text: string): Promise<Array<{ question: string; answer: string }>> {
  const apiKey = process.env.GROQ_API_KEY;
  
  if (!apiKey) {
    console.error("GROQ_API_KEY not configured");
    return [];
  }

  try {
    const systemPrompt = `คุณคือผู้ช่วยที่เชี่ยวชาญในการแปลงข้อมูลเป็นคำถาม-คำตอบ (Q&A pairs)

ภารกิจของคุณ:
1. อ่านข้อความที่ผู้ใช้ให้มา (อาจเป็นข้อมูลโรงเรียน ระเบียบ ข้อมูลติดต่อ ฯลฯ)
2. สร้างคำถามที่คนทั่วไปอาจจะถาม จากข้อมูลนั้น
3. ให้คำตอบที่ชัดเจน ตรงประเด็น

กฎการสร้าง:
- สร้าง 3-10 คู่ Q&A ขึ้นอยู่กับความยาวของข้อมูล
- คำถามต้องเป็นธรรมชาติ เหมือนคนถามจริงๆ
- คำตอบต้องตรงคำถาม กระชับ มีประโยชน์
- หากข้อมูลมีหลายหัวข้อ ให้แยก Q&A ตามหัวข้อ
- อย่าสร้างคำถามที่ไม่มีคำตอบในข้อมูล

รูปแบบ output: JSON array ของ objects
[
  { "question": "...", "answer": "..." },
  { "question": "...", "answer": "..." }
]

ตอบเฉพาะ JSON array เท่านั้น ห้ามใส่ข้อความอื่น`;

    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `ข้อมูล:\n${text}` }
        ],
        temperature: 0.7,
        max_tokens: 2048,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Groq API error:", response.status, errorText);
      return [];
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || "";

    // แยก JSON จากข้อความ (บางครั้ง AI ใส่ markdown code block มาด้วย)
    let jsonText = content.trim();
    if (jsonText.startsWith("```")) {
      jsonText = jsonText.replace(/```(?:json)?\n?/g, "").trim();
    }

    const pairs = JSON.parse(jsonText);

    // ตรวจสอบว่าเป็น array และมี question, answer
    if (Array.isArray(pairs)) {
      return pairs.filter((p) => p.question && p.answer);
    }

    return [];
  } catch (error) {
    console.error("Error in extractQAWithAI:", error);
    return [];
  }
}

/**
 * Smart Import endpoint
 */
export async function POST(request: Request) {
  if (!isAdminSession(request)) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { text } = body;

    if (!text || !text.trim()) {
      return NextResponse.json({ ok: false, error: "Text is required" }, { status: 400 });
    }

    // ใช้ AI แยก Q&A
    const qaItems = await extractQAWithAI(text);

    if (qaItems.length === 0) {
      return NextResponse.json({ 
        ok: false, 
        error: "ไม่สามารถแปลงข้อความเป็น Q&A ได้ กรุณาลองใหม่หรือเพิ่มเนื้อหาให้มากขึ้น" 
      }, { status: 400 });
    }

    // บันทึกลงฐานข้อมูล
    const results = [];
    for (const item of qaItems) {
      try {
        // ให้ระบบคัดแยกหมวดหมู่และคีย์เวิร์ดอัตโนมัติ
        const result = insertAIKnowledge(item.question, item.answer, "", "อัตโนมัติ");
        results.push(result);
      } catch (err) {
        console.error("Error inserting Q&A:", err);
      }
    }

    return NextResponse.json({ 
      ok: true, 
      items: results,
      count: results.length 
    });

  } catch (error) {
    console.error("Error in smart import:", error);
    return NextResponse.json({ 
      ok: false, 
      error: "ไม่สามารถประมวลผลได้ กรุณาลองใหม่อีกครั้ง" 
    }, { status: 500 });
  }
}
