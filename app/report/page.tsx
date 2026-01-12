"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Swal from "sweetalert2";

export default function ReportPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [title, setTitle] = useState("");
  const [detail, setDetail] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [imagePreview, setImagePreview] = useState<string | null>(null);

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) {
      setImageUrl("");
      setImagePreview(null);
      return;
    }

    // Validate file type
    if (!file.type.startsWith("image/")) {
      Swal.fire({ icon: "error", title: "ผิดพลาด", text: "กรุณาเลือกไฟล์รูปภาพเท่านั้น" });
      e.target.value = "";
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      Swal.fire({ icon: "error", title: "ผิดพลาด", text: "ไฟล์รูปภาพต้องมีขนาดไม่เกิน 5MB" });
      e.target.value = "";
      return;
    }

    // Convert to base64
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64 = reader.result as string;
      setImageUrl(base64);
      setImagePreview(base64);
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      await Swal.fire({ icon: "error", title: "ผิดพลาด", text: "กรุณากรอกหัวข้อ" });
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, detail, imageUrl: imageUrl || undefined }),
      });
      const data = await res.json();
      if (data.ok) {
        await Swal.fire({
          icon: "success",
          title: "แจ้งปัญหาสำเร็จ",
          text: "ทีมงานจะรับทราบและดำเนินการต่อไป",
          confirmButtonColor: "#2e7d32",
        });
        setTitle("");
        setDetail("");
        setImageUrl("");
        setImagePreview(null);
      } else {
        await Swal.fire({ icon: "error", title: "ผิดพลาด", text: data.message || "เกิดข้อผิดพลาด" });
      }
    } catch (err) {
      await Swal.fire({ icon: "error", title: "ผิดพลาด", text: "เกิดข้อผิดพลาด" });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="page-bg min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-school-600 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="page-bg min-h-screen">
      {/* Header with back button */}
      <div className="bg-white/95 backdrop-blur-sm shadow-md border-b border-school-100/50 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center gap-3">
            <button 
              onClick={() => router.push("/dashboard")} 
              className="group p-2.5 hover:bg-school-50 rounded-xl transition-all duration-200 hover:shadow-md"
              aria-label="กลับ"
            >
              <svg className="w-6 h-6 text-school-700 group-hover:text-school-800 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
            </button>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-school-700">แจ้งปัญหาภายในโรงเรียน</h1>
              <p className="text-xs sm:text-sm text-zinc-500">รายงานปัญหาเพื่อการแก้ไขที่รวดเร็ว</p>
            </div>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        {/* Header card with icon */}
        <div className="relative mb-8">
          <div className="absolute inset-0 bg-gradient-to-r from-orange-500/10 via-red-500/10 to-orange-500/10 rounded-3xl blur-2xl" />
          <div className="relative bg-white/98 backdrop-blur-sm rounded-3xl p-6 sm:p-8 border-2 border-orange-100/50 shadow-xl">
            <div className="flex items-start gap-4 sm:gap-6">
              <div className="flex-shrink-0 w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-gradient-to-br from-orange-500 via-orange-600 to-red-600 flex items-center justify-center text-white shadow-lg shadow-orange-500/30 ring-4 ring-orange-50">
                <svg className="w-8 h-8 sm:w-9 sm:h-9" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <div className="flex-1">
                <h2 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-orange-600 to-red-600 bg-clip-text text-transparent mb-2">
                  แจ้งปัญหาที่คุณพบ
                </h2>
                <p className="text-sm sm:text-base text-zinc-600 leading-relaxed">
                  ช่วยเราปรับปรุงโรงเรียนให้ดีขึ้น กรอกรายละเอียดปัญหาด้านล่างเพื่อแจ้งให้ทีมงานทราบ
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Form card */}
        <div className="relative">
          <div className="absolute inset-0 bg-gradient-to-br from-school-500/5 to-school-600/5 rounded-3xl blur-xl" />
          <div className="relative bg-white/98 backdrop-blur-sm rounded-3xl p-6 sm:p-10 border-2 border-school-100/50 shadow-2xl">
            <form onSubmit={handleSubmit} className="space-y-6 sm:space-y-8">
              {/* Title input */}
              <div className="group">
                <label className="form-label flex items-center gap-2">
                  <svg className="w-5 h-5 text-school-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
                  </svg>
                  หัวข้อปัญหา
                  <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="เช่น ห้องน้ำชั้น 2 ประตูเสีย, โต๊ะในห้องเรียนชำรุด"
                  className="input-base group-hover:border-school-300 transition-all"
                  required
                  maxLength={200}
                />
                <div className="flex justify-between mt-1.5">
                  <p className="text-xs text-zinc-500">ระบุสถานที่และปัญหาให้ชัดเจน</p>
                  <p className="text-xs text-zinc-400">{title.length}/200</p>
                </div>
              </div>

              {/* Detail textarea */}
              <div className="group">
                <label className="form-label flex items-center gap-2">
                  <svg className="w-5 h-5 text-school-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  รายละเอียดเพิ่มเติม
                  <span className="text-zinc-400 text-xs font-normal">(ไม่บังคับ)</span>
                </label>
                <textarea
                  value={detail}
                  onChange={(e) => setDetail(e.target.value)}
                  placeholder="อธิบายรายละเอียดเพิ่มเติม เช่น ระดับความรุนแรง เวลาที่พบ หรือข้อเสนอแนะ..."
                  className="input-base min-h-[140px] group-hover:border-school-300 transition-all resize-none"
                  maxLength={1000}
                />
                <div className="text-right text-xs text-zinc-400 mt-1.5">{detail.length}/1000 ตัวอักษร</div>
              </div>

              {/* Image upload */}
              <div className="group">
                <label className="form-label flex items-center gap-2">
                  <svg className="w-5 h-5 text-school-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  แนบรูปภาพประกอบ
                  <span className="text-zinc-400 text-xs font-normal">(ไม่บังคับ)</span>
                </label>
                
                {/* Two upload options: Camera and Gallery */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Camera button (mobile) */}
                  <div className="relative">
                    <input
                      id="camera-upload"
                      type="file"
                      accept="image/*"
                      capture="environment"
                      onChange={handleImageChange}
                      className="hidden"
                    />
                    <label
                      htmlFor="camera-upload"
                      className="block w-full cursor-pointer"
                    >
                      <div className="flex items-center gap-3 p-4 rounded-xl border-2 border-dashed border-school-200 hover:border-school-400 bg-school-50/30 hover:bg-school-50 transition-all duration-200 group-hover:shadow-md">
                        <div className="flex-shrink-0 w-12 h-12 rounded-lg bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white shadow-md">
                          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                          </svg>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-school-700 truncate">
                            ถ่ายรูป
                          </p>
                          <p className="text-xs text-zinc-500 mt-0.5">
                            เปิดกล้อง
                          </p>
                        </div>
                      </div>
                    </label>
                  </div>

                  {/* Gallery button */}
                  <div className="relative">
                    <input
                      id="gallery-upload"
                      type="file"
                      accept="image/*"
                      onChange={handleImageChange}
                      className="hidden"
                    />
                    <label
                      htmlFor="gallery-upload"
                      className="block w-full cursor-pointer"
                    >
                      <div className="flex items-center gap-3 p-4 rounded-xl border-2 border-dashed border-school-200 hover:border-school-400 bg-school-50/30 hover:bg-school-50 transition-all duration-200 group-hover:shadow-md">
                        <div className="flex-shrink-0 w-12 h-12 rounded-lg bg-gradient-to-br from-school-400 to-school-600 flex items-center justify-center text-white shadow-md">
                          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-school-700 truncate">
                            {imagePreview ? "✓ เลือกแล้ว" : "เลือกรูปภาพ"}
                          </p>
                          <p className="text-xs text-zinc-500 mt-0.5">
                            จากแกลเลอรี่
                          </p>
                        </div>
                      </div>
                    </label>
                  </div>
                </div>
                
                <p className="text-xs text-zinc-500 mt-2 text-center">
                  รองรับ JPG, PNG, GIF • สูงสุด 5MB
                </p>
                
                {/* Image preview */}
                {imagePreview && (
                  <div className="mt-4 p-4 rounded-xl bg-gradient-to-br from-school-50 to-white border-2 border-school-200">
                    <div className="flex items-center gap-2 mb-3">
                      <svg className="w-5 h-5 text-school-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                      <p className="text-sm font-semibold text-school-700">ตัวอย่างรูปภาพ</p>
                    </div>
                    <div className="relative group/img inline-block w-full">
                      <img 
                        src={imagePreview} 
                        alt="Preview" 
                        className="w-full max-h-80 object-contain rounded-lg border-2 border-school-100 shadow-lg"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          setImageUrl("");
                          setImagePreview(null);
                          const input = document.getElementById("image-upload") as HTMLInputElement;
                          if (input) input.value = "";
                        }}
                        className="absolute top-3 right-3 bg-red-500/90 backdrop-blur-sm text-white rounded-full p-2 hover:bg-red-600 shadow-lg transition-all opacity-0 group-/img:opacity-100 hover:scale-110"
                        title="ลบรูป"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Action buttons */}
              <div className="flex flex-col sm:flex-row gap-3 pt-4">
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 group relative overflow-hidden rounded-xl bg-gradient-to-r from-school-500 via-school-600 to-school-700 text-white font-bold py-4 px-6 shadow-lg hover:shadow-xl hover:shadow-school-500/30 transition-all duration-300 hover:-translate-y-0.5 disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:translate-y-0"
                >
                  <span className="relative z-10 flex items-center justify-center gap-2">
                    {submitting ? (
                      <>
                        <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24" fill="none">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                        </svg>
                        กำลังส่งรายงาน...
                      </>
                    ) : (
                      <>
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                        </svg>
                        ส่งรายงานปัญหา
                      </>
                    )}
                  </span>
                  <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000" />
                </button>
                
                <button
                  type="button"
                  onClick={() => router.push("/dashboard")}
                  className="sm:w-auto px-6 py-4 rounded-xl border-2 border-zinc-200 text-zinc-700 font-semibold hover:bg-zinc-50 hover:border-zinc-300 transition-all duration-200 hover:shadow-md"
                >
                  ยกเลิก
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* Helper text */}
        <div className="mt-6 text-center">
          <p className="text-sm text-zinc-500">
            💡 ทีมงานจะตรวจสอบและดำเนินการแก้ไขโดยเร็วที่สุด
          </p>
        </div>
      </div>
    </div>
  );
}
