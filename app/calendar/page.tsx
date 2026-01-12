"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import Swal from "sweetalert2";

type EventItem = {
  id: number;
  title: string;
  description: string;
  eventDate: string; // yyyy-mm-dd
};

// Thai day labels starting on Sunday
const dayLabels = ["อา", "จ", "อ", "พ", "พฤ", "ศ", "ส"];

export default function CalendarPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [events, setEvents] = useState<EventItem[]>([]);
  const [monthCursor, setMonthCursor] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const [form, setForm] = useState({ title: "", description: "", eventDate: "" });

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
    fetchEvents();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function fetchEvents() {
    const res = await fetch("/api/events");
    const json = await res.json();
    if (json?.ok) setEvents(json.events || []);
  }

  function getStatus(dateStr: string) {
    const today = new Date();
    const d = new Date(dateStr + "T00:00:00");
    const td = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    if (d.getTime() < td.getTime()) return "past";
    if (d.getTime() === td.getTime()) return "current";
    return "upcoming";
  }

  function isToday(dateStr?: string) {
    if (!dateStr) return false;
    const now = new Date();
    const d = new Date(dateStr + "T00:00:00");
    return (
      d.getFullYear() === now.getFullYear() &&
      d.getMonth() === now.getMonth() &&
      d.getDate() === now.getDate()
    );
  }

  const days = useMemo(() => {
    const year = monthCursor.getFullYear();
    const month = monthCursor.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const slots = [] as Array<{ day: number | null; dateStr?: string; status?: string; hasEvent?: boolean; events?: EventItem[] }>;
    for (let i = 0; i < firstDay; i++) slots.push({ day: null });
    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
      const dayEvents = events.filter((e) => e.eventDate === dateStr);
      slots.push({
        day: d,
        dateStr,
        status: getStatus(dateStr),
        hasEvent: dayEvents.length > 0,
        events: dayEvents,
      });
    }
    return slots;
  }, [monthCursor, events]);

  const monthEvents = useMemo(() => {
    const year = monthCursor.getFullYear();
    const month = monthCursor.getMonth();
    return events
      .filter((e) => {
        const d = new Date(e.eventDate + "T00:00:00");
        return d.getFullYear() === year && d.getMonth() === month;
      })
      .sort((a, b) => (a.eventDate > b.eventDate ? 1 : a.eventDate < b.eventDate ? -1 : 0));
  }, [events, monthCursor]);

  async function handleAddEvent(e: React.FormEvent) {
    e.preventDefault();
    if (!form.title || !form.eventDate) {
      await Swal.fire({ icon: "error", title: "ไม่สำเร็จ", text: "กรุณากรอกชื่อกิจกรรมและวันที่" });
      return;
    }
    const res = await fetch("/api/events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const json = await res.json();
    if (!json?.ok) {
      await Swal.fire({ icon: "error", title: "ไม่สำเร็จ", text: json?.message || "บันทึกไม่สำเร็จ" });
      return;
    }
    await Swal.fire({ icon: "success", title: "เพิ่มกิจกรรมแล้ว" });
    setForm({ title: "", description: "", eventDate: "" });
    fetchEvents();
  }

  function badgeColor(status?: string) {
    if (status === "past") return "bg-gray-300 text-gray-800";
    if (status === "current") return "bg-green-500 text-white";
    return "bg-amber-300 text-amber-900";
  }

  const monthLabel = monthCursor.toLocaleString("th-TH", { month: "long", year: "numeric" });

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
              <h1 className="text-xl font-bold text-school-700">ปฏิทินกิจกรรมโรงเรียน</h1>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white/95 backdrop-blur-sm rounded-2xl p-6 border-2 border-school-100/50 shadow-xl">
          {/* Status Legend - Top */}
          <div className="mb-6 p-4 bg-gradient-to-r from-school-50/50 to-green-50/30 rounded-xl border border-school-100">
            <h4 className="text-sm font-semibold text-school-700 mb-3 flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
              </svg>
              สถานะสีกิจกรรม
            </h4>
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-2 text-sm text-gray-700 bg-white px-3 py-1.5 rounded-lg shadow-sm">
                <span className="w-4 h-4 rounded-full bg-gray-300 shadow-sm" />
                <span className="font-medium">ผ่านไปแล้ว</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-amber-800 bg-white px-3 py-1.5 rounded-lg shadow-sm">
                <span className="w-4 h-4 rounded-full bg-amber-300 shadow-sm" />
                <span className="font-medium">กำลังจะเกิดขึ้น</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-green-800 bg-white px-3 py-1.5 rounded-lg shadow-sm">
                <span className="w-4 h-4 rounded-full bg-green-500 shadow-sm" />
                <span className="font-medium">วันนี้ / กำลังเกิดขึ้น</span>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between mb-4">
            <button
              onClick={() => setMonthCursor(new Date(monthCursor.getFullYear(), monthCursor.getMonth() - 1, 1))}
              className="p-2 rounded-lg hover:bg-school-50"
            >
              ◀
            </button>
            <div className="text-lg font-semibold text-school-700">{monthLabel}</div>
            <button
              onClick={() => setMonthCursor(new Date(monthCursor.getFullYear(), monthCursor.getMonth() + 1, 1))}
              className="p-2 rounded-lg hover:bg-school-50"
            >
              ▶
            </button>
          </div>

          <div className="grid grid-cols-7 text-sm font-semibold text-zinc-500 mb-2">
            {dayLabels.map((d) => (
              <div key={d} className="text-center py-2">
                {d}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-2 text-sm">
            {days.map((slot, idx) => {
              const today = isToday(slot.dateStr);
              return (
                <div
                  key={idx}
                  className={`min-h-[80px] rounded-xl border px-2 py-2 transition-all duration-150 ${
                    slot.day
                      ? today
                        ? "border-green-500 bg-green-50 ring-2 ring-green-200"
                        : "border-zinc-100 bg-white/80 hover:border-school-200"
                      : "bg-transparent border-none"
                  }`}
                >
                  {slot.day && (
                    <div className="flex items-center justify-between text-zinc-800 font-semibold">
                      <span className={today ? "text-green-700" : undefined}>{slot.day}</span>
                      {slot.hasEvent && (
                        <span className={`inline-flex items-center justify-center w-6 h-6 text-xs rounded-full ${badgeColor(slot.status)}`}>
                          {slot.events?.length}
                        </span>
                      )}
                    </div>
                  )}
                  {slot.day && slot.events && (
                    <div className="mt-1 space-y-1">
                      {slot.events.slice(0, 2).map((ev) => (
                        <div
                          key={ev.id}
                          className={`text-[11px] px-2 py-1 rounded-lg ${badgeColor(slot.status)}`}
                          title={ev.description}
                        >
                          {ev.title}
                        </div>
                      ))}
                      {slot.events.length > 2 && (
                        <div className="text-[11px] text-zinc-500">+{slot.events.length - 2} เพิ่มเติม</div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <div className="mt-6">
            <h3 className="text-lg font-semibold text-zinc-900 mb-4">กิจกรรมในเดือนนี้</h3>
            {monthEvents.length === 0 ? (
              <p className="text-sm text-zinc-500">ไม่มีบันทึกกิจกรรมในเดือนนี้</p>
            ) : (
              <div className="space-y-3">
                {monthEvents.map((ev) => (
                  <div key={ev.id} className="flex items-start gap-4 rounded-2xl border-2 border-school-100 bg-white px-4 py-3 shadow-sm">
                    <div className="px-3 py-2 rounded-xl bg-school-50 text-school-800 text-sm font-semibold min-w-[140px] text-center">
                      {new Date(ev.eventDate + "T00:00:00").toLocaleDateString("th-TH", {
                        weekday: "short",
                        day: "numeric",
                        month: "long",
                        year: "numeric",
                      })}
                    </div>
                    <div className="flex-1">
                      <div className="text-base font-semibold text-zinc-900">{ev.title}</div>
                      {ev.description && <div className="text-sm text-zinc-600 mt-1 leading-relaxed">{ev.description}</div>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
