'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Swal from 'sweetalert2';

export default function TeacherLoginPage() {
  const router = useRouter();
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    // Redirect if already logged in
    const cookieId = document.cookie
      .split("; ")
      .find((row) => row.startsWith("kss_teacher="))
      ?.split("=")[1];

    if (cookieId) {
      router.push("/teacher");
    }
  }, [router]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch("/api/teacher/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ firstName, lastName, password }),
      });
      const json = await res.json();
      if (!res.ok || !json?.ok) {
        const message = json?.message || "ชื่อ-นามสกุลหรือรหัสผ่านไม่ถูกต้อง";
        await Swal.fire({ 
          icon: "error", 
          title: "ไม่สำเร็จ", 
          text: message,
          confirmButtonColor: "#138F2D"
        });
        return;
      }
      await Swal.fire({
        icon: "success",
        title: "เข้าสู่ระบบสำเร็จ",
        text: `ยินดีต้อนรับ คุณ${json.firstName || ''} ${json.lastName || ''}`,
        confirmButtonColor: "#138F2D",
      });
      try {
        localStorage.setItem('kss_teacher', String(json.teacherId));
      } catch {}
      
      router.push("/teacher");
    } catch (err) {
      await Swal.fire({ 
        icon: "error", 
        title: "เกิดข้อผิดพลาด", 
        text: "กรุณาลองใหม่อีกครั้ง",
        confirmButtonColor: "#138F2D"
      });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="page-bg min-h-screen flex items-center justify-center px-4 py-12 relative overflow-hidden">
      {/* Decorative floating elements */}
      <div className="absolute top-32 left-10 w-20 h-20 bg-school-100 rounded-full opacity-40 blur-xl animate-pulse" />
      <div className="absolute bottom-32 right-16 w-32 h-32 bg-school-200 rounded-full opacity-30 blur-2xl animate-pulse" style={{animationDelay: '1s'}} />
      
      <div className="w-full max-w-2xl bg-white/98 backdrop-blur-sm rounded-2xl sm:rounded-[var(--radius-card)] card-shadow border border-school-100/50 relative z-10 mx-auto">
        <div className="accent-bar" />
        <div className="px-4 sm:px-8 pt-6 sm:pt-8 pb-4">
          <div className="flex items-center gap-2 sm:gap-3 mb-3">
            <div className="w-9 sm:w-10 h-9 sm:h-10 rounded-lg sm:rounded-xl bg-gradient-to-br from-school-400 to-school-600 flex items-center justify-center shadow-lg flex-shrink-0">
              <svg className="w-5 sm:w-6 h-5 sm:h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </div>
            <h1 className="text-xl sm:text-3xl font-bold text-school-700 tracking-tight">ระบบลงชื่อเข้าใช้งานครู</h1>
          </div>
          <p className="text-xs sm:text-sm text-zinc-600 leading-relaxed px-1">
            กรอกข้อมูลเพื่อเข้าสู่ระบบสำหรับบุคลากรและครู
          </p>
        </div>

        <form className="p-4 sm:p-8 pt-2 sm:pt-4 space-y-4 sm:space-y-5" onSubmit={handleSubmit}>
          <div>
            <label className="form-label text-sm sm:text-base">ชื่อ</label>
            <input
              type="text"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              placeholder="กรอกชื่อ"
              className="input-base text-sm sm:text-base"
              required
              disabled={submitting}
              aria-label="ชื่อ"
            />
          </div>

          <div>
            <label className="form-label text-sm sm:text-base">นามสกุล</label>
            <input
              type="text"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              placeholder="กรอกนามสกุล"
              className="input-base text-sm sm:text-base"
              required
              disabled={submitting}
              aria-label="นามสกุล"
            />
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
              disabled={submitting}
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
                กำลังเข้าสู่ระบบ...
              </span>
            ) : (
              "เข้าสู่ระบบ"
            )}
          </button>

          {/* Back to Student Login Link */}
          <div className="pt-4 border-t border-school-100/50 text-center">
            <button
              type="button"
              onClick={() => router.push('/')}
              className="text-school-600 hover:text-school-700 text-sm font-medium inline-flex items-center gap-2 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              กลับหน้าเข้าสู่ระบบนักเรียน
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
