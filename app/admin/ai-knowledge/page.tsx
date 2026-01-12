"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Swal from "sweetalert2";

type Knowledge = {
  id: number;
  question: string;
  answer: string;
  keywords: string;
  category: string;
  created_at: string;
  updated_at: string;
};

export default function AIKnowledgePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [knowledge, setKnowledge] = useState<Knowledge[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [smartMode, setSmartMode] = useState(false);
  const [smartText, setSmartText] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [form, setForm] = useState({ question: "", answer: "", keywords: "", category: "อัตโนมัติ" });

  const categories = ["ทั่วไป", "เวลาเรียน", "สถานที่", "กิจกรรม", "ระเบียบ", "ติดต่อ", "อื่นๆ"];

  useEffect(() => {
    const adminCookie = document.cookie
      .split("; ")
      .find((row) => row.startsWith("kss_admin="));

    if (!adminCookie) {
      router.push("/");
      return;
    }

    setLoading(false);
    fetchKnowledge();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function fetchKnowledge() {
    try {
      const res = await fetch("/api/admin/ai-knowledge");
      const json = await res.json();
      if (json?.ok) {
        setKnowledge(json.knowledge || []);
      }
    } catch (error) {
      console.error("Error fetching knowledge:", error);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!form.question.trim() || !form.answer.trim()) {
      await Swal.fire({ icon: "error", title: "กรุณากรอกข้อมูลให้ครบ" });
      return;
    }

    try {
      const endpoint = "/api/admin/ai-knowledge";
      const method = editingId ? "PUT" : "POST";
      const body = editingId ? { id: editingId, ...form } : form;

      const res = await fetch(endpoint, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const json = await res.json();

      if (json?.ok) {
        await Swal.fire({
          icon: "success",
          title: editingId ? "แก้ไขสำเร็จ" : "เพิ่มสำเร็จ",
          timer: 1500,
          showConfirmButton: false,
        });
        setForm({ question: "", answer: "", keywords: "", category: "ทั่วไป" });
        setEditingId(null);
        fetchKnowledge();
      } else {
        throw new Error("Failed");
      }
    } catch (error) {
      await Swal.fire({ icon: "error", title: "เกิดข้อผิดพลาด" });
    }
  }

  async function handleDelete(id: number) {
    const result = await Swal.fire({
      icon: "warning",
      title: "ยืนยันการลบ?",
      text: "คุณแน่ใจหรือไม่ที่จะลบข้อมูลนี้",
      showCancelButton: true,
      confirmButtonText: "ลบ",
      cancelButtonText: "ยกเลิก",
      confirmButtonColor: "#d33",
    });

    if (!result.isConfirmed) return;

    try {
      const res = await fetch(`/api/admin/ai-knowledge?id=${id}`, { method: "DELETE" });
      const json = await res.json();

      if (json?.ok) {
        await Swal.fire({
          icon: "success",
          title: "ลบสำเร็จ",
          timer: 1500,
          showConfirmButton: false,
        });
        fetchKnowledge();
      }
    } catch (error) {
      await Swal.fire({ icon: "error", title: "เกิดข้อผิดพลาด" });
    }
  }

  function handleEdit(item: Knowledge) {
    setEditingId(item.id);
    setForm({
      question: item.question,
      answer: item.answer,
      keywords: item.keywords,
      category: item.category,
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function handleCancel() {
    setEditingId(null);
    setForm({ question: "", answer: "", keywords: "", category: "ทั่วไป" });
  }

  async function handleLoadExample() {
    if (knowledge.length === 0) {
      await Swal.fire({ 
        icon: "info", 
        title: "ไม่มีข้อมูลในระบบ", 
        text: "กรุณาเพิ่มข้อมูลใหม่เข้าสู่ระบบก่อน" 
      });
      return;
    }
    
    const examples = knowledge.slice(0, 5).map(k => `• ${k.answer}`).join('\n');
    setSmartText(examples);
  }

  async function handleSmartImport() {
    if (!smartText.trim()) {
      await Swal.fire({ icon: "error", title: "กรุณากรอกข้อความ" });
      return;
    }

    setIsProcessing(true);

    try {
      const res = await fetch("/api/admin/ai-knowledge/smart-import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: smartText }),
      });

      const json = await res.json();

      if (json?.ok && json.items?.length > 0) {
        await Swal.fire({
          icon: "success",
          title: `นำเข้าสำเร็จ ${json.items.length} รายการ`,
          timer: 2000,
          showConfirmButton: false,
        });
        setSmartText("");
        setSmartMode(false);
        fetchKnowledge();
      } else {
        throw new Error(json?.error || "Failed to process");
      }
    } catch (error) {
      console.error("Smart import error:", error);
      await Swal.fire({ 
        icon: "error", 
        title: "เกิดข้อผิดพลาด",
        text: "ไม่สามารถประมวลผลข้อความได้ กรุณาลองใหม่"
      });
    } finally {
      setIsProcessing(false);
    }
  }

  const filteredKnowledge = knowledge.filter(
    (item) =>
      item.question.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.answer.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.keywords.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-school-50 to-white">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-school-600 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-school-50 to-white">
      <div className="w-full max-w-7xl mx-auto px-3 sm:px-4 md:px-6 py-6 sm:py-8">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <button
            onClick={() => router.push("/admin")}
            className="p-2 hover:bg-school-100 rounded-lg transition-colors"
          >
            <svg className="w-6 h-6 text-school-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
          </button>
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-school-700">จัดการข้อมูล AI</h1>
            <p className="text-sm text-gray-900 font-bold">เพิ่ม แก้ไข ลบ ข้อมูลที่ AI จะใช้ตอบคำถาม</p>
          </div>
        </div>

        {/* Form */}
        <div className="bg-white rounded-2xl p-4 sm:p-6 shadow-lg border-2 border-school-100 mb-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-lg sm:text-xl font-bold text-gray-900 mb-1">
                {smartMode ? "🤖 นำเข้าอัจฉริยะ (AI จะแยก Q&A เอง)" : (editingId ? "แก้ไขข้อมูล" : "เพิ่มข้อมูลใหม่")}
              </h2>
              <p className="text-sm text-gray-700">
                {smartMode ? "พิมพ์ข้อความ ข้อมูล หรือความรู้ที่ต้องการสอน AI" : "ระบบจะคัดแยกหมวดหมู่และคีย์เวิร์ดอัตโนมัติเมื่อบันทึก"}
              </p>
            </div>
            {!editingId && (
              <button
                type="button"
                onClick={() => {
                  setSmartMode(!smartMode);
                  setSmartText("");
                  setForm({ question: "", answer: "", keywords: "", category: "อัตโนมัติ" });
                }}
                className="px-4 py-2 bg-gradient-to-r from-purple-500 to-purple-600 text-white rounded-xl font-semibold hover:from-purple-600 hover:to-purple-700 transition-all shadow-md text-sm whitespace-nowrap"
              >
                {smartMode ? "⚙️ โหมดปกติ" : "🤖 AI Mode"}
              </button>
            )}
          </div>
          {smartMode ? (
            <div className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-bold text-gray-900">
                    📝 ข้อความหรือข้อมูลที่ต้องการให้ AI เรียนรู้
                  </label>
                  <button
                    type="button"
                    onClick={handleLoadExample}
                    className="px-3 py-1 text-xs bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors font-semibold"
                  >
                    📋 โหลดตัวอย่าง
                  </button>
                </div>
                <textarea
                  value={smartText}
                  onChange={(e) => setSmartText(e.target.value)}
                  placeholder={`ตัวอย่าง:\n\n• โรงเรียนเปิดเวลา 8:00 ปิดเวลา 16:30\n• นักเรียนต้องแต่งกายด้วยเครื่องแบบนักเรียน\n• ห้องสมุดอยู่ชั้น 3 อาคาร A เปิดทุกวันจันทร์-ศุกร์\n• ครูประจำชั้น ม.1/1 คือ คุณสมชาย โทร 081-xxx-xxxx\n\nหรือพิมพ์แบบอิสระ ระบบจะแยกเป็นคำถาม-คำตอบเอง`}
                  className="w-full px-4 py-3 border-2 border-purple-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-400 min-h-[200px] resize-vertical placeholder:text-gray-600 text-gray-900"
                />
                <p className="text-xs text-gray-600 mt-2">
                  💡 เคล็ดลับ: กด "โหลดตัวอย่าง" เพื่อดูข้อมูลเก่าที่มีอยู่ หรือพิมพ์ข้อมูลใหม่เป็นประโยค AI จะแปลงเป็นคำถาม-คำตอบอัตโนมัติ
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleSmartImport}
                  disabled={isProcessing || !smartText.trim()}
                  className="px-6 py-2.5 bg-gradient-to-r from-purple-500 to-purple-600 text-white rounded-xl font-semibold hover:from-purple-600 hover:to-purple-700 transition-all shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {isProcessing ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                      <span>กำลังประมวลผล...</span>
                    </>
                  ) : (
                    <>
                      <span>🚀</span>
                      <span>นำเข้าด้วย AI</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
            {/* Advanced toggle */}
            <div>
              <button
                type="button"
                onClick={() => setShowAdvanced((v) => !v)}
                className="px-4 py-2 text-sm rounded-xl border-2 border-school-200 hover:bg-school-50 transition text-gray-900 "
              >
                {showAdvanced ? "ซ่อนตัวเลือกเพิ่มเติม" : "ตัวเลือกเพิ่มเติม (หมวดหมู่/คีย์เวิร์ด)"}
              </button>
            </div>

            {showAdvanced && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-gray-900 mb-2">หมวดหมู่</label>
                  <select
                    value={form.category}
                    onChange={(e) => setForm({ ...form, category: e.target.value })}
                    className="w-full px-4 py-2 border-2 border-school-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-school-400 text-gray-900"
                  >
                    <option value="อัตโนมัติ">อัตโนมัติ</option>
                    {categories.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-900 mb-2">คำค้น (คั่นด้วยเครื่องหมายจุลภาค)</label>
                  <input
                    type="text"
                    value={form.keywords}
                    onChange={(e) => setForm({ ...form, keywords: e.target.value })}
                    placeholder="เช่น เวลา, เข้าเรียน, เลิกเรียน"
                    className="w-full px-4 py-2 border-2 border-school-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-school-400 placeholder:text-gray-700 placeholder:font-semibold text-gray-900"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-sm font-bold text-gray-900 mb-2">คำถาม *</label>
              <input
                type="text"
                value={form.question}
                onChange={(e) => setForm({ ...form, question: e.target.value })}
                placeholder="เช่น เวลาเรียนเท่าไหร่"
                className="w-full px-4 py-2 border-2 border-school-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-school-400 placeholder:text-gray-700 placeholder:font-semibold text-gray-900"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-bold text-gray-900 mb-2">คำตอบ *</label>
              <textarea
                value={form.answer}
                onChange={(e) => setForm({ ...form, answer: e.target.value })}
                placeholder="พิมพ์คำตอบที่ AI จะตอบ..."
                className="w-full px-4 py-3 border-2 border-school-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-school-400 min-h-[120px] resize-vertical placeholder:text-gray-700 placeholder:font-semibold text-gray-900"
                required
              />
            </div>

            <div className="flex gap-2">
              <button
                type="submit"
                className="px-6 py-2.5 bg-gradient-to-r from-school-500 to-school-600 text-white rounded-xl font-semibold hover:from-school-600 hover:to-school-700 transition-all shadow-lg"
              >
                {editingId ? "บันทึกการแก้ไข" : "เพิ่มข้อมูล"}
              </button>
              {editingId && (
                <button
                  type="button"
                  onClick={handleCancel}
                  className="px-6 py-2.5 bg-zinc-200 text-zinc-700 rounded-xl font-semibold hover:bg-zinc-300 transition-all"
                >
                  ยกเลิก
                </button>
              )}
            </div>
          </form>
          )}
        </div>

        {/* Search */}
        <div className="mb-4">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="🔍 ค้นหาคำถาม คำตอบ หรือคำค้น..."
            className="w-full px-4 py-3 border-2 border-school-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-school-400 bg-white placeholder:text-gray-700 placeholder:font-semibold text-gray-900"
          />
        </div>

        {/* List */}
        <div className="bg-white rounded-2xl shadow-lg border-2 border-school-100 overflow-hidden">
          <div className="p-4 bg-gradient-to-r from-school-500 to-school-600 text-white">
            <h2 className="text-lg font-bold">ข้อมูลทั้งหมด ({filteredKnowledge.length} รายการ)</h2>
          </div>

          {filteredKnowledge.length === 0 ? (
            <div className="p-8 text-center text-gray-900 font-bold">
              {searchTerm ? "ไม่พบข้อมูลที่ค้นหา" : "ยังไม่มีข้อมูล"}
            </div>
          ) : (
            <div className="divide-y divide-school-100">
              {filteredKnowledge.map((item) => (
                <div key={item.id} className="p-4 sm:p-6 hover:bg-school-50/30 transition-colors">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="px-3 py-1 bg-school-100 text-school-700 text-xs font-semibold rounded-full">
                          {item.category}
                        </span>
                        {item.keywords && (
                          <span className="text-xs text-gray-800 font-bold">
                            🏷️ {item.keywords}
                          </span>
                        )}
                      </div>
                      <h3 className="font-bold text-gray-900 mb-2 text-sm sm:text-base">❓ {item.question}</h3>
                      <p className="text-sm text-gray-900 font-bold whitespace-pre-wrap break-words">💬 {item.answer}</p>
                      <p className="text-xs text-gray-700 font-semibold mt-2">
                        อัปเดต: {new Date(item.updated_at).toLocaleString("th-TH")}
                      </p>
                    </div>
                    <div className="flex gap-2 flex-shrink-0">
                      <button
                        onClick={() => handleEdit(item)}
                        className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        title="แก้ไข"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      </button>
                      <button
                        onClick={() => handleDelete(item.id)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="ลบ"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
