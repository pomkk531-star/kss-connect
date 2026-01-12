"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Swal from "sweetalert2";
import AnnouncementPopup from "../components/AnnouncementPopup";

export default function Dashboard() {
  const router = useRouter();
  const [profile, setProfile] = useState<{ firstName: string; lastName: string; classCode: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);

  interface SystemCard {
    id: string;
    title: string;
    description: string;
    badge?: number;
    icon: React.ReactNode;
    color: string;
    href: string;
  }

  useEffect(() => {
    // Check if user is logged in
    const checkAuth = () => {
      const cookieId = document.cookie
        .split("; ")
        .find((row) => row.startsWith("kss_user="))
        ?.split("=")[1];

      if (!cookieId) {
        router.push("/");
        return;
      }

      try {
        const raw = localStorage.getItem("kss_profile");
        if (raw) {
          setProfile(JSON.parse(raw));
        }
      } catch {}
      setLoading(false);
      fetchUnreadCount();
    };

    checkAuth();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function fetchUnreadCount() {
    try {
      const res = await fetch("/api/messages/unread", { credentials: "same-origin" });
      const json = await res.json();
      if (json?.ok) setUnreadCount(json.count || 0);
    } catch {}
  }

  async function handleLogout() {
    await fetch("/api/logout", { method: "POST" });
    try {
      localStorage.removeItem("kss_profile");
    } catch {}
    router.push("/");
  }

  if (loading) {
    return (
      <div className="page-bg min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-school-600 border-t-transparent" />
      </div>
    );
  }

  const systems = [
    {
      id: "calendar",
      title: "ปฏิทินกิจกรรมโรงเรียน",
      description: "ดูและติดตามกิจกรรมต่างๆของโรงเรียน",
      icon: (
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      ),
      color: "from-blue-500 to-blue-700",
      href: "/calendar",
    },
    {
      id: "messages",
      title: "ส่งข้อความแบบไม่ระบุตัวตน",
      description: "ส่งข้อความโดยไม่ต้องระบุว่าคุณคือใคร",
      badge: unreadCount,
      icon: (
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
        </svg>
      ),
      color: "from-school-500 to-school-700",
      href: "/messages",
    },
    {
      id: "ai",
      title: "ผู้ช่วย AI ของโรงเรียน",
      description: "ถามคำถามเกี่ยวกับโรงเรียน กิจกรรม และข้อมูลต่างๆ",
      icon: (
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
        </svg>
      ),
      color: "from-purple-500 to-purple-700",
      href: "/ai",
    },
    {
      id: "report",
      title: "แจ้งปัญหาภายในโรงเรียน",
      description: "แจ้งปัญหาต่างๆ พร้อมแนบรูปภาพประกอบ",
      icon: (
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
      ),
      color: "from-orange-500 to-orange-700",
      href: "/report",
    },
  ];

  return (
    <div className="page-bg min-h-screen">
      {/* Announcement Popup */}
      <AnnouncementPopup />
      
      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-14 pt-24">
        <div className="mb-8 sm:mb-10">
          <h2 className="text-3xl sm:text-4xl font-extrabold text-school-700 mb-3">เลือกระบบที่ต้องการใช้งาน</h2>
          <p className="text-sm sm:text-base text-zinc-600">กดที่การ์ดด้านล่างเพื่อเข้าใช้งานระบบต่างๆ</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-7">
          {systems.map((system) => (
            <button
              key={system.id}
              onClick={() => router.push(system.href)}
              className="group bg-white/96 backdrop-blur-md rounded-[18px] p-5 sm:p-7 border border-school-100/40 hover:border-school-300/60 transition-all duration-300 hover:shadow-2xl hover:shadow-school-500/15 hover:-translate-y-2 text-left relative overflow-hidden"
            >
              {system.badge !== undefined && system.badge > 0 && (
                <div className="absolute -top-2.5 -right-2.5 bg-gradient-to-br from-school-600 to-school-700 text-white text-xs font-extrabold rounded-full w-9 h-9 flex items-center justify-center shadow-lg shadow-school-600/40 ring-2 ring-white">
                  {system.badge}
                </div>
              )}
              <div className={`w-14 sm:w-18 h-14 sm:h-18 rounded-2xl bg-gradient-to-br ${system.color} flex items-center justify-center text-white mb-4 sm:mb-5 group-hover:scale-110 transition-transform duration-300 shadow-xl`}>
                {system.icon}
              </div>
              <h3 className="text-base sm:text-xl font-bold text-zinc-800 mb-2 group-hover:text-school-700 transition-colors">
                {system.title}
              </h3>
              <p className="text-xs sm:text-sm text-zinc-600 leading-relaxed">{system.description}</p>
              <div className="mt-3 sm:mt-4 flex items-center text-school-600 font-semibold text-xs sm:text-sm group-hover:translate-x-2 transition-transform">
                เข้าใช้งาน
                <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
