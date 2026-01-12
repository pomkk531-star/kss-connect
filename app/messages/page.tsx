"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import Swal from "sweetalert2";

type InboxItem = { id: number; body: string; createdAt: string; isRead: number };
type ClassItem = { classCode: string };
type UserItem = { id: number; firstName: string; lastName: string };

export default function MessagesPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [users, setUsers] = useState<UserItem[]>([]);
  const [selectedClass, setSelectedClass] = useState("");
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
  const [body, setBody] = useState("");
  const [inbox, setInbox] = useState<InboxItem[]>([]);
  const [revealedMessages, setRevealedMessages] = useState<Set<number>>(new Set());
  const [showUnreadOnly, setShowUnreadOnly] = useState(false);

  const unreadCount = useMemo(
    () => inbox.filter((m) => m.isRead === 0 && !revealedMessages.has(m.id)).length,
    [inbox, revealedMessages]
  );

  const displayedInbox = useMemo(
    () => (showUnreadOnly ? inbox.filter((m) => m.isRead === 0 && !revealedMessages.has(m.id)) : inbox),
    [inbox, showUnreadOnly, revealedMessages]
  );

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
    fetchClasses();
    fetchInbox();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function fetchClasses() {
    const res = await fetch("/api/classes", { credentials: "same-origin" });
    const json = await res.json();
    if (json?.ok) setClasses(json.classes || []);
  }

  async function fetchUsersByClass(code: string) {
    if (!code) return;
    const res = await fetch(`/api/users?class_code=${encodeURIComponent(code)}`, { credentials: "same-origin" });
    const json = await res.json();
    if (json?.ok) setUsers(json.users || []);
  }

  const groupedClasses = useMemo(() => {
    type Group = { grade: number; label: string; items: { code: string; room: number }[] };
    const map = new Map<number, Group>();
    for (const { classCode } of classes) {
      const m = classCode.match(/^ม\.(\d+)\/(\d+)$/);
      if (m) {
        const grade = Number(m[1]);
        const room = Number(m[2]);
        if (!map.has(grade)) map.set(grade, { grade, label: `ม.${grade}`, items: [] });
        map.get(grade)!.items.push({ code: classCode, room });
      } else {
        // If format is unexpected, put in grade 0 bucket
        if (!map.has(0)) map.set(0, { grade: 0, label: "อื่นๆ", items: [] });
        map.get(0)!.items.push({ code: classCode, room: 0 });
      }
    }
    return Array.from(map.values())
      .sort((a, b) => a.grade - b.grade)
      .map((g) => ({
        ...g,
        items: g.items.sort((a, b) => a.room - b.room),
      }));
  }, [classes]);

  async function fetchInbox() {
    const res = await fetch("/api/messages", { credentials: "same-origin" });
    const json = await res.json();
    if (json?.ok) setInbox(json.messages || []);
  }

  async function handleRevealMessage(id: number) {
    setRevealedMessages((prev) => new Set([...prev, id]));
    
    const res = await fetch(`/api/messages?id=${id}`, {
      method: "PUT",
      credentials: "same-origin",
    });
    const json = await res.json();
    if (json?.ok) {
      fetchInbox();
    }
  }

  async function handleDelete(id: number) {
    const result = await Swal.fire({
      title: "ลบข้อความ?",
      text: "คุณต้องการลบข้อความนี้หรือไม่",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#ef4444",
      cancelButtonColor: "#6b7280",
      confirmButtonText: "ลบ",
      cancelButtonText: "ยกเลิก",
    });

    if (!result.isConfirmed) return;

    const res = await fetch(`/api/messages?id=${id}`, {
      method: "DELETE",
      credentials: "same-origin",
    });
    const json = await res.json();
    if (json?.ok) {
      await Swal.fire({ icon: "success", title: "ลบแล้ว", text: "ข้อความถูกลบเรียบร้อย" });
      fetchInbox();
    } else {
      await Swal.fire({ icon: "error", title: "ลบไม่สำเร็จ", text: json?.message || "เกิดข้อผิดพลาด" });
    }
  }

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedUserId || !body.trim()) {
      await Swal.fire({ icon: "error", title: "ส่งไม่สำเร็จ", text: "กรุณาเลือกผู้รับและพิมพ์ข้อความ" });
      return;
    }
    const res = await fetch("/api/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "same-origin",
      body: JSON.stringify({ recipientId: selectedUserId, body }),
    });
    const json = await res.json();
    if (!json?.ok) {
      await Swal.fire({ icon: "error", title: "ส่งไม่สำเร็จ", text: json?.message || "เกิดข้อผิดพลาด" });
      return;
    }
    await Swal.fire({ icon: "success", title: "ส่งแล้ว", text: "ข้อความถูกส่งแบบไม่ระบุตัวตน" });
    setBody("");
    fetchInbox();
  }

  const hasSelection = useMemo(() => selectedClass && selectedUserId, [selectedClass, selectedUserId]);
  const totalCount = inbox.length;

  if (loading) {
    return (
      <div className="page-bg min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-school-600 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="page-bg min-h-screen">
      <div className="bg-white/95 backdrop-blur-sm shadow-md border-b border-school-100/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button onClick={() => router.push("/dashboard")} className="p-2 hover:bg-school-50 rounded-lg transition-colors">
                <svg className="w-6 h-6 text-school-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
              </button>
              <h1 className="text-xl font-bold text-school-700">ส่งข้อความแบบไม่ระบุตัวตน</h1>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 grid lg:grid-cols-2 gap-8">
        {/* Compose */}
        <div className="bg-white/95 backdrop-blur-sm rounded-2xl p-6 border-2 border-school-100/50 shadow-xl">
          <h2 className="text-lg font-semibold text-zinc-900 mb-4">ส่งข้อความ</h2>
          <form onSubmit={handleSend} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-zinc-700">เลือกห้อง</label>
                <select
                  className="mt-1 w-full rounded-xl border-2 border-school-200 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-school-400 bg-white text-zinc-800 placeholder-zinc-500 shadow-sm text-base"
                  value={selectedClass}
                  onChange={(e) => {
                    const code = e.target.value;
                    setSelectedClass(code);
                    setSelectedUserId(null);
                    setUsers([]);
                    if (code) fetchUsersByClass(code);
                  }}
                >
                  <option value="">เลือกห้องเรียน</option>
                  {groupedClasses.map((g) => (
                    <optgroup key={g.label} label={g.label}>
                      {g.items.map(({ code }) => (
                        <option key={code} value={code}>{code}</option>
                      ))}
                    </optgroup>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-sm font-medium text-zinc-700">เลือกผู้รับ</label>
                <select
                  className="mt-1 w-full rounded-xl border-2 border-school-200 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-school-400 bg-white text-zinc-800 placeholder-zinc-500 shadow-sm text-base disabled:opacity-60"
                  disabled={!selectedClass}
                  value={selectedUserId ?? ''}
                  onChange={(e) => setSelectedUserId(Number(e.target.value))}
                >
                  <option value="">เลือกผู้รับ</option>
                  {users.map((u) => (
                    <option key={u.id} value={u.id}>{u.firstName} {u.lastName}</option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-zinc-700">ข้อความ</label>
                <span className="text-xs text-zinc-400">สูงสุด 500 ตัวอักษร</span>
              </div>
              <textarea
                className="mt-1 w-full rounded-xl border-2 border-school-200 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-school-400 min-h-[160px] bg-white text-zinc-800 placeholder-zinc-500 shadow-sm text-base"
                value={body}
                onChange={(e) => setBody(e.target.value.slice(0, 500))}
                maxLength={500}
                placeholder="พิมพ์ข้อความที่ต้องการส่งแบบไม่ระบุตัวตน"
              />
              <div className="text-right text-xs text-zinc-400 mt-1">{body.length}/500</div>
            </div>

            <div className="flex justify-end">
              <button
                type="submit"
                className="btn-primary disabled:opacity-60"
                disabled={!hasSelection || !body.trim()}
              >
                ส่งข้อความ
              </button>
            </div>
          </form>
        </div>

        {/* Inbox */}
        <div className="bg-white/95 backdrop-blur-sm rounded-2xl p-6 border-2 border-school-100/50 shadow-xl">
          <div className="flex flex-col gap-3 mb-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-lg font-semibold text-zinc-900">กล่องข้อความที่ได้รับ</h2>
                <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-school-100 text-school-700">ทั้งหมด {totalCount}</span>
                <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-school-600 text-white">ยังไม่ได้อ่าน {unreadCount}</span>
              </div>
              <div className="inline-flex rounded-xl border border-school-200 overflow-hidden shadow-sm self-start">
                <button
                  onClick={() => setShowUnreadOnly(false)}
                  className={`px-3 py-1.5 text-xs font-semibold transition-colors ${
                    showUnreadOnly ? 'bg-white text-school-700 hover:bg-school-50' : 'bg-school-600 text-white'
                  }`}
                >
                  แสดงทั้งหมด
                </button>
                <button
                  onClick={() => setShowUnreadOnly(true)}
                  className={`px-3 py-1.5 text-xs font-semibold transition-colors ${
                    showUnreadOnly ? 'bg-school-600 text-white' : 'bg-white text-school-700 hover:bg-school-50'
                  }`}
                >
                  เฉพาะยังไม่ได้อ่าน
                </button>
              </div>
            </div>
            <div className="flex justify-end">
              <button onClick={fetchInbox} className="p-2 rounded-lg bg-school-600 text-white hover:bg-school-700 shadow-sm" aria-label="รีเฟรช">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9H9m11 11v-5h-.581m-15.357-2A8.003 8.003 0 0019.418 15H15" />
                </svg>
              </button>
            </div>
          </div>
          {displayedInbox.length === 0 ? (
            <p className="text-sm text-zinc-500">ยังไม่มีข้อความ</p>
          ) : (
            <div className="space-y-3">
              {displayedInbox.map((m) => {
                const isRevealed = m.isRead === 1 || revealedMessages.has(m.id);
                return (
                  <div
                    key={m.id}
                    className={`rounded-2xl border-2 px-4 py-3 relative transition-all ${
                      m.isRead === 0 && !isRevealed
                        ? "border-school-300 bg-school-50/60 shadow-md"
                        : "border-school-100 bg-white"
                    }`}
                  >
                    {m.isRead === 0 && !isRevealed && (
                      <div className="absolute top-2 right-2 bg-school-600 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                        ใหม่
                      </div>
                    )}

                    {isRevealed ? (
                      <div className={`text-base whitespace-pre-wrap pr-12 leading-relaxed ${m.isRead === 0 && !isRevealed ? "font-semibold text-zinc-900" : "text-zinc-700"}`}>
                        {m.body}
                      </div>
                    ) : (
                      <button
                        onClick={() => handleRevealMessage(m.id)}
                        className="w-full text-left"
                      >
                        <div className="text-base text-zinc-900 font-semibold flex items-center gap-2 pr-12">
                          <svg className="w-5 h-5 text-school-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          </svg>
                          <span className="blur-sm select-none">••••••••••••••••••</span>
                          <span className="text-school-700 ml-2 text-xs">คลิกเพื่ออ่าน</span>
                        </div>
                      </button>
                    )}

                    <div className="flex items-center justify-between mt-2">
                      <div className="text-xs text-zinc-400">
                        {new Date(m.createdAt).toLocaleString("th-TH", { dateStyle: "medium", timeStyle: "short" })}
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(m.id);
                        }}
                        className="text-red-500 hover:text-red-700 hover:bg-red-50 p-1.5 rounded-lg transition-colors"
                        title="ลบข้อความ"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
