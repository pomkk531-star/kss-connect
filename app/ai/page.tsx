"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, useRef } from "react";
import Swal from "sweetalert2";

type Message = {
  id: number;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
};

export default function AIAssistantPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const cookieId = document.cookie
      .split("; ")
      .find((row) => row.startsWith("kss_user="))
      ?.split("=")[1];

    if (!cookieId) {
      router.push("/");
      return;
    }
    setLoading(false);

    // Welcome message
    setMessages([
      {
        id: 1,
        role: "assistant",
        content: "สวัสดีครับ! ผมคือผู้ช่วย AI ของโรงเรียน พร้อมให้ความช่วยเหลือเกี่ยวกับ:\n\n📚 ข้อมูลเกี่ยวกับโรงเรียน\n📅 ตารางเวลาและกิจกรรม\n📖 วิชาเรียนและการบ้าน\n🏫 สถานที่ต่างๆ ในโรงเรียน\n❓ คำถามทั่วไป\n\nมีอะไรให้ช่วยไหมครับ?",
        timestamp: new Date(),
      },
    ]);
  }, [router]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || sending) return;

    const userMessage: Message = {
      id: Date.now(),
      role: "user",
      content: input.trim(),
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setSending(true);

    try {
      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: input.trim(), history: messages }),
      });

      const json = await res.json();

      if (json?.ok && json?.response) {
        const aiMessage: Message = {
          id: Date.now() + 1,
          role: "assistant",
          content: json.response,
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, aiMessage]);
      } else {
        throw new Error("Invalid response");
      }
    } catch (error) {
      await Swal.fire({
        icon: "error",
        title: "เกิดข้อผิดพลาด",
        text: "ไม่สามารถส่งข้อความได้ กรุณาลองใหม่อีกครั้ง",
      });
    } finally {
      setSending(false);
      inputRef.current?.focus();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend(e as any);
    }
  };

  const clearChat = () => {
    setMessages([
      {
        id: 1,
        role: "assistant",
        content: "ล้างประวัติการสนทนาแล้ว มีอะไรให้ช่วยไหมครับ?",
        timestamp: new Date(),
      },
    ]);
  };

  if (loading) {
    return (
      <div className="page-bg min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-school-600 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="page-bg min-h-screen flex flex-col">
      {/* Header */}
      <div className="bg-white/95 backdrop-blur-sm shadow-md border-b border-school-100/50">
        <div className="w-full max-w-5xl mx-auto px-3 sm:px-4 md:px-6 py-3 sm:py-4">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 sm:gap-3 min-w-0">
              <button
                onClick={() => router.push("/dashboard")}
                className="p-2 hover:bg-school-50 rounded-lg transition-colors flex-shrink-0"
              >
                <svg className="w-5 sm:w-6 h-5 sm:h-6 text-school-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
              </button>
              <div className="flex items-center gap-2 min-w-0">
                <div className="w-8 sm:w-10 h-8 sm:h-10 rounded-xl bg-gradient-to-br from-purple-500 to-purple-700 flex items-center justify-center shadow-lg flex-shrink-0">
                  <svg className="w-5 sm:w-6 h-5 sm:h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                  </svg>
                </div>
                <div className="min-w-0">
                  <h1 className="text-base sm:text-xl font-bold text-school-700 truncate">ผู้ช่วย AI ของโรงเรียน</h1>
                  <p className="text-xs text-zinc-500 hidden sm:block">ถามคำถามเกี่ยวกับโรงเรียนได้เลย</p>
                </div>
              </div>
            </div>
            <button
              onClick={clearChat}
              className="px-3 py-2 bg-school-600 hover:bg-school-700 text-white text-xs sm:text-sm rounded-lg transition-colors flex items-center gap-1 sm:gap-2 flex-shrink-0"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
              <span className="hidden sm:inline">ล้างแชท</span>
            </button>
          </div>
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 w-full max-w-5xl mx-auto px-3 sm:px-4 md:px-6 py-4 sm:py-6 overflow-y-auto">
        <div className="space-y-4">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[85%] sm:max-w-[75%] rounded-2xl px-4 py-3 ${
                  msg.role === "user"
                    ? "bg-gradient-to-br from-school-500 to-school-600 text-white shadow-lg"
                    : "bg-white border-2 border-school-100 text-zinc-800 shadow-md"
                }`}
              >
                <div className="text-sm sm:text-base whitespace-pre-wrap leading-relaxed">
                  {msg.content}
                </div>
                <div
                  className={`text-xs mt-2 ${
                    msg.role === "user" ? "text-white/80" : "text-zinc-400"
                  }`}
                >
                  {msg.timestamp.toLocaleTimeString("th-TH", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </div>
              </div>
            </div>
          ))}
          {sending && (
            <div className="flex justify-start">
              <div className="bg-white border-2 border-school-100 rounded-2xl px-4 py-3 shadow-md">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-school-600 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                  <div className="w-2 h-2 bg-school-600 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                  <div className="w-2 h-2 bg-school-600 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input Area */}
      <div className="bg-white/95 backdrop-blur-sm border-t border-school-100/50 sticky bottom-0">
        <div className="w-full max-w-5xl mx-auto px-3 sm:px-4 md:px-6 py-3 sm:py-4">
          <form onSubmit={handleSend} className="flex gap-2 sm:gap-3">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="พิมพ์คำถามเกี่ยวกับโรงเรียน"
              className="flex-1 rounded-xl border-2 border-school-200 px-3 sm:px-4 py-2 sm:py-3 focus:outline-none focus:ring-2 focus:ring-school-400 bg-white text-zinc-800 placeholder-zinc-400 text-sm sm:text-base resize-none"
              rows={1}
              style={{ minHeight: "44px", maxHeight: "120px" }}
              disabled={sending}
            />
            <button
              type="submit"
              disabled={!input.trim() || sending}
              className="px-4 sm:px-6 py-2 sm:py-3 bg-gradient-to-r from-school-500 to-school-600 hover:from-school-600 hover:to-school-700 text-white rounded-xl font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl flex-shrink-0 flex items-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
              </svg>
              <span className="hidden sm:inline">ส่ง</span>
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
