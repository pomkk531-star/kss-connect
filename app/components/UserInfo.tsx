"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import Swal from "sweetalert2";

export default function UserInfo() {
  const [profile, setProfile] = useState<{ firstName: string; lastName: string; classCode: string; userId?: number } | null>(null);
  const router = useRouter();
  const pathname = usePathname();

  // Hide UserInfo on admin pages
  const isAdminPage = pathname?.startsWith('/admin');

  useEffect(() => {
    const loadProfile = () => {
      try {
        const raw = localStorage.getItem("kss_profile");
        if (raw) {
          setProfile(JSON.parse(raw));
        } else {
          setProfile(null);
        }
      } catch {}
    };

    // Initial load and refresh on route change
    loadProfile();

    // Listen for custom updates from login/register/logout
    const onProfileUpdated = () => loadProfile();
    window.addEventListener("kss:profile-updated", onProfileUpdated);

    return () => {
      window.removeEventListener("kss:profile-updated", onProfileUpdated);
    };
  }, [pathname]);

  const handleLogout = async () => {
    await fetch("/api/logout", { method: "POST" });
    try {
      localStorage.removeItem("kss_profile");
    } catch {}
    // Notify other components to refresh state immediately
    window.dispatchEvent(new Event("kss:profile-updated"));
    router.push("/");
  };

  const handleShowAccountInfo = () => {
    if (!profile) return;
    
    Swal.fire({
      title: '📋 ข้อมูลบัญชี',
      html: `
        <div class="text-left space-y-3">
          <div class="border-b pb-2">
            <p class="text-sm text-gray-600 font-semibold">ชื่อ-นามสกุล</p>
            <p class="text-lg font-bold text-gray-900">${profile.firstName} ${profile.lastName}</p>
          </div>
          <div class="pb-2">
            <p class="text-sm text-gray-600 font-semibold">ห้องเรียน</p>
            <p class="text-lg font-bold text-gray-900">${profile.classCode}</p>
          </div>
        </div>
      `,
      confirmButtonColor: '#138F2D',
      confirmButtonText: 'ปิด',
      width: 400
    });
  };

  // ถ้าอยู่ในหน้า admin แล้ว ไม่ต้องแสดงอะไร
  if (isAdminPage) return null;

  // ถ้าไม่มี profile และไม่ใช่แอดมิน ไม่แสดงอะไร
  if (!profile) return null;

  return (
    <>
      {/* Mobile Version */}
      <div className="sm:hidden w-full flex items-center justify-end">
        <div className="user-info-card flex-1 flex items-center gap-0.5 px-3 py-2 bg-white/15 backdrop-blur-md rounded-2xl border border-white/20 cursor-pointer hover:bg-white/20 transition-all" onClick={handleShowAccountInfo}>
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleLogout();
            }}
            className="logout-btn h-8 px-2 text-white bg-white/15 hover:bg-white/25 rounded-lg transition-all border border-white/25 hover:border-white/35 flex items-center justify-center"
            title="ออกจากระบบ"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
          </button>

          <div className="flex-1 flex flex-col leading-tight text-white font-semibold text-sm text-right pr-2">
            <span>{profile.firstName}</span>
            <span className="text-xs text-white/90">{profile.lastName} — {profile.classCode}</span>
          </div>
        </div>
      </div>

      {/* Desktop Version */}
      <div className="hidden sm:flex items-center gap-3">
        <div 
          className="user-info-card flex items-center gap-3 px-4 py-2 bg-white/15 backdrop-blur-md rounded-full border border-white/20 cursor-pointer hover:bg-white/20 transition-all"
          onClick={handleShowAccountInfo}
          title="คลิกเพื่อดูข้อมูลบัญชี"
        >
          <div className="w-7 h-7 rounded-full bg-white/20 flex items-center justify-center">
            <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
          </div>
          <span className="text-base text-white font-semibold leading-tight">
            {profile.firstName} {profile.lastName} — {profile.classCode}
          </span>
        </div>
        <button
          onClick={handleLogout}
          className="logout-btn h-10 px-3 text-white bg-white/15 hover:bg-white/25 rounded-lg transition-all border border-white/25 hover:border-white/35 flex items-center justify-center"
          title="ออกจากระบบ"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
        </button>
      </div>
    </>
  );
}
