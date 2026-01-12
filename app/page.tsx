"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Swal from "sweetalert2";

const classOptions: string[] = (() => {
  const opts: string[] = [];
  for (let grade = 1; grade <= 6; grade++) {
    const maxRoom = grade <= 3 ? 5 : 4;
    for (let room = 1; room <= maxRoom; room++) {
      opts.push(`ม.${grade}/${room}`);
    }
  }
  return opts;
})();

export default function Home() {
  const router = useRouter();
  const [isRegisterMode, setIsRegisterMode] = useState(false);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [classCode, setClassCode] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    // Check if already logged in, redirect to dashboard
    const cookieId = document.cookie
      .split("; ")
      .find((row) => row.startsWith("kss_user="))
      ?.split("=")[1];

    if (cookieId) {
      router.push("/dashboard");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    // Prefill class code from stored profile so login can reuse the previously chosen room
    try {
      const raw = localStorage.getItem("kss_profile");
      if (raw) {
        const profile = JSON.parse(raw);
        if (profile?.classCode) {
          setClassCode(profile.classCode);
        }
      }
    } catch {}
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      // Register mode
      if (isRegisterMode) {
        if (!firstName.trim() || !lastName.trim() || !classCode || !password) {
          await Swal.fire({ icon: "error", title: "ผิดพลาด", text: "กรุณากรอกข้อมูลให้ครบถ้วน" });
          return;
        }
        
        const res = await fetch("/api/register", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ firstName, lastName, classCode, password }),
        });
        const json = await res.json();
        
        if (!res.ok || !json?.ok) {
          const message = json?.errors?.formErrors?.join("\n") || json?.message || "ไม่สามารถสมัครสมาชิกได้";
          await Swal.fire({ icon: "error", title: "ไม่สำเร็จ", text: message });
          return;
        }
        
        await Swal.fire({
          icon: "success",
          title: "สมัครสมาชิกสำเร็จ",
          text: "กำลังเข้าสู่ระบบ...",
          confirmButtonColor: "#138F2D",
          timer: 1500
        });
        
        try {
          localStorage.setItem("kss_profile", JSON.stringify({ 
            firstName, 
            lastName, 
            classCode: json.classCode || classCode,
            userId: json.userId
          }));
          window.dispatchEvent(new Event("kss:profile-updated"));
        } catch {}
        
        router.push("/dashboard");
        return;
      }
      
      // Try admin login ONLY if no lastName is provided (admin uses username only)
      if (!lastName.trim()) {
        const adminRes = await fetch("/api/admin/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ username: firstName, password }),
        });
        const adminJson = await adminRes.json();
        
        if (adminRes.ok && adminJson?.ok) {
          localStorage.setItem('kss_admin', String(adminJson.adminId));
          await Swal.fire({
            icon: "success",
            title: "เข้าสู่ระบบแอดมินสำเร็จ",
            confirmButtonColor: "#138F2D",
          });
          router.push("/admin");
          return;
        }
      }

      // Student login (requires firstName, lastName)
      const res = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ firstName, lastName, classCode, password }),
      });
      const json = await res.json();
      if (!res.ok || !json?.ok) {
        const message = json?.errors?.formErrors?.join("\n") || json?.message || "ข้อมูลไม่ถูกต้อง";
        await Swal.fire({ icon: "error", title: "ไม่สำเร็จ", text: message });
        return;
      }
      await Swal.fire({
        icon: "success",
        title: "เข้าสู่ระบบสำเร็จ",
        text: `บันทึกเวลา: ${new Date(json.createdAt).toLocaleString()}`,
        confirmButtonColor: "#138F2D",
      });
      try {
        localStorage.setItem("kss_profile", JSON.stringify({ 
          firstName, 
          lastName, 
          classCode: json.classCode || classCode,
          userId: json.userId
        }));
        // แจ้งส่วนหัว (UserInfo) ให้รีเฟรชข้อมูลทันที โดยไม่ต้องรีเฟรชหน้า
        window.dispatchEvent(new Event("kss:profile-updated"));
      } catch {}
      
      // Redirect to dashboard
      router.push("/dashboard");
    } catch (err) {
      await Swal.fire({ icon: "error", title: "เกิดข้อผิดพลาด", text: "กรุณาลองใหม่อีกครั้ง" });
    } finally {
      setSubmitting(false);
    }
  }

  // Build grouped options for select
  const groups = [
    { grade: 1, rooms: 5 },
    { grade: 2, rooms: 5 },
    { grade: 3, rooms: 5 },
    { grade: 4, rooms: 4 },
    { grade: 5, rooms: 4 },
    { grade: 6, rooms: 4 },
  ];

  return (
    <div className="page-bg min-h-screen flex items-center justify-center px-4 py-16 relative overflow-hidden">
      {/* Decorative floating elements */}
      <div className="absolute top-24 left-8 w-32 h-32 bg-gradient-to-br from-school-200 to-school-300 rounded-full opacity-25 blur-3xl animate-pulse" />
      <div className="absolute bottom-24 right-12 w-40 h-40 bg-gradient-to-tl from-school-100 to-school-200 rounded-full opacity-30 blur-3xl animate-pulse" style={{animationDelay: '1.5s'}} />
      <div className="absolute top-1/2 right-1/4 w-24 h-24 bg-school-100 rounded-full opacity-20 blur-2xl animate-pulse" style={{animationDelay: '0.8s'}} />
      
      <div className="w-full max-w-2xl bg-white/97 backdrop-blur-md rounded-[20px] card-shadow border border-school-100/40 relative z-10 mx-auto overflow-hidden">
        <div className="accent-bar" />
        <div className="px-6 sm:px-10 pt-8 sm:pt-10 pb-5">
          <div className="flex items-center gap-3 sm:gap-4 mb-4">
            <div className="w-12 sm:w-14 h-12 sm:h-14 rounded-2xl bg-gradient-to-br from-school-400 via-school-500 to-school-600 flex items-center justify-center shadow-lg shadow-school-500/30 flex-shrink-0">
              <svg className="w-6 sm:w-7 h-6 sm:h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
            </div>
            <h1 className="text-xl sm:text-3xl font-extrabold text-school-700 tracking-tight">
              {isRegisterMode ? "สมัครสมาชิกนักเรียน" : "ระบบลงชื่อเข้าใช้งานนักเรียน"}
            </h1>
          </div>
          <p className="text-sm sm:text-base text-zinc-600 leading-relaxed pl-1">
            {isRegisterMode 
              ? "กรอกข้อมูลเพื่อสมัครสมาชิก" 
              : "กรอกข้อมูลเพื่อเข้าสู่ระบบ"
            }
          </p>
        </div>

        <form className="p-4 sm:p-8 pt-2 sm:pt-4 space-y-4 sm:space-y-5" onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5">
            <div>
              <label className="form-label text-sm sm:text-base">ชื่อ</label>
              <input
                type="text"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                placeholder="เช่น สันติ"
                className="input-base text-sm sm:text-base"
                required
                aria-label="ชื่อ"
              />
            </div>
            <div>
              <label className="form-label text-sm sm:text-base">นามสกุล</label>
              <input
                type="text"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                placeholder="เช่น สุขใจ"
                className="input-base text-sm sm:text-base"
                aria-label="นามสกุล"
              />
            </div>
          </div>

          <div>
            <label className="form-label text-sm sm:text-base">ห้องเรียน</label>
            <select
              value={classCode}
              onChange={(e) => setClassCode(e.target.value)}
              className="input-base text-sm sm:text-base cursor-pointer max-h-[200px] sm:max-h-[300px]"
              aria-label="เลือกห้องเรียน"
              size={1}
            >
              <option value="" disabled>
                กรุณาเลือกห้องเรียน
              </option>
              {groups.map(({ grade, rooms }) => (
                <optgroup key={grade} label={`ม.${grade}`}>
                  {Array.from({ length: rooms }, (_, i) => i + 1).map((room) => {
                    const val = `ม.${grade}/${room}`;
                    return (
                      <option key={val} value={val}>
                        {val}
                      </option>
                    );
                  })}
                </optgroup>
              ))}
            </select>
          </div>

          <div>
            <label className="form-label text-sm sm:text-base">รหัสผ่าน</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="กรอกรหัสผ่าน"
              className="input-base text-sm sm:text-base"
              required
              aria-label="รหัสผ่าน"
            />
          </div>

          <button type="submit" disabled={submitting} className="btn-primary mt-5 sm:mt-7 w-full text-sm sm:text-base py-2.5 sm:py-3">
            {submitting ? (
              <span className="inline-flex items-center gap-2">
                <svg className="animate-spin h-4 sm:h-5 w-4 sm:w-5" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                </svg>
                กำลังบันทึก...
              </span>
            ) : (
              isRegisterMode ? "สมัครสมาชิก" : "เข้าสู่ระบบ"
            )}
          </button>

          {/* Toggle between Login and Register */}
          <div className="pt-3 text-center">
            <button
              type="button"
              onClick={() => setIsRegisterMode(!isRegisterMode)}
              className="text-school-600 hover:text-school-700 text-sm font-medium transition-colors"
            >
              {isRegisterMode ? "มีบัญชีแล้ว? เข้าสู่ระบบ" : "ยังไม่มีบัญชี? สมัครสมาชิก"}
            </button>
          </div>

          {/* Teacher Login Link */}
          {!isRegisterMode && (
          <div className="pt-4 border-t border-school-100/50 text-center">
            <button
              type="button"
              onClick={() => router.push('/teacher/login')}
              className="text-school-600 hover:text-school-700 text-sm font-medium inline-flex items-center gap-2 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
              เข้าสู่ระบบสำหรับครู
            </button>
          </div>
          )}
        </form>
      </div>
    </div>
  );
}
