'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Swal from 'sweetalert2';

interface Report {
  id: number;
  title: string;
  detail: string;
  imageUrl: string | null;
  createdAt: string;
}

export default function TeacherReportsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [reports, setReports] = useState<Report[]>([]);
  const [search, setSearch] = useState('');
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [viewingReport, setViewingReport] = useState<Report | null>(null);

  useEffect(() => {
    const teacherId = document.cookie
      .split('; ')
      .find((row) => row.startsWith('kss_teacher='))
      ?.split('=')[1];

    if (!teacherId) {
      router.push('/teacher/login');
      return;
    }
    loadReports();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadReports = async () => {
    try {
      const res = await fetch('/api/admin/reports');
      const data = await res.json();
      if (data.ok) {
        setReports(data.reports);
      } else {
        Swal.fire('ผิดพลาด', data.message || 'โหลดข้อมูลไม่สำเร็จ', 'error');
      }
    } catch (err) {
      Swal.fire('ผิดพลาด', 'โหลดข้อมูลไม่สำเร็จ', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
    const confirm = await Swal.fire({
      title: 'ลบรายงานนี้?',
      text: 'การกระทำนี้ไม่สามารถย้อนกลับได้',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'ลบ',
      cancelButtonText: 'ยกเลิก',
      confirmButtonColor: '#059669',
    });
    if (!confirm.isConfirmed) return;

    setDeletingId(id);
    try {
      const res = await fetch(`/api/admin/reports?id=${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.ok) {
        setReports((prev) => prev.filter((r) => r.id !== id));
        Swal.fire('ลบแล้ว', 'รายงานถูกลบเรียบร้อย', 'success');
      } else {
        Swal.fire('ผิดพลาด', data.message || 'ลบไม่สำเร็จ', 'error');
      }
    } catch (err) {
      Swal.fire('ผิดพลาด', 'ลบไม่สำเร็จ', 'error');
    } finally {
      setDeletingId(null);
    }
  };

  const filtered = reports.filter((r) => {
    if (!search.trim()) return true;
    const term = search.toLowerCase();
    return r.title.toLowerCase().includes(term) || r.detail.toLowerCase().includes(term);
  });

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 to-white">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-green-600 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-white p-4 sm:p-6 md:p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <button
            onClick={() => router.push('/teacher')}
            className="p-2 hover:bg-school-100 rounded-lg transition-colors"
          >
            <svg className="w-6 h-6 text-school-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
          </button>
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-school-700">📋 จัดการรายงานปัญหา</h1>
            <p className="text-sm text-gray-900 font-bold">ดูและจัดการรายงานปัญหา</p>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-lg p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-6">
            <div>
              <h2 className="text-2xl font-semibold text-green-700">รายการรายงานทั้งหมด</h2>
              <p className="text-sm text-gray-600">จำนวน {reports.length} รายการ</p>
            </div>
            <div className="flex gap-2">
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="ค้นหาหัวข้อหรือรายละเอียด"
                className="rounded-lg border-2 border-green-300 px-3 py-2 text-sm focus:outline-none focus:border-green-500 bg-white text-gray-800 placeholder:text-gray-500"
              />
              <button
                onClick={loadReports}
                className="p-2 rounded-lg bg-green-600 text-white hover:bg-green-700"
                aria-label="รีเฟรช"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9H9m11 11v-5h-.581m-15.357-2A8.003 8.003 0 0019.418 15H15" />
                </svg>
              </button>
            </div>
          </div>

          {filtered.length === 0 ? (
            <div className="text-center py-12">
              <svg className="w-16 h-16 mx-auto text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <p className="text-gray-500">{search ? 'ไม่พบรายงานที่ค้นหา' : 'ยังไม่มีรายงานปัญหา'}</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filtered.map((report) => (
                <div
                  key={report.id}
                  className="border-2 border-gray-200 rounded-xl p-4 hover:border-green-300 hover:shadow-md transition-all bg-gradient-to-br from-white to-gray-50"
                >
                  <div className="flex items-start gap-3 mb-3">
                    <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-gradient-to-br from-orange-500 to-red-600 flex items-center justify-center text-white">
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                      </svg>
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-bold text-gray-800 mb-1 line-clamp-2">{report.title}</h3>
                      <p className="text-xs text-gray-500">
                        {new Date(report.createdAt).toLocaleString('th-TH', { 
                          dateStyle: 'medium', 
                          timeStyle: 'short' 
                        })}
                      </p>
                    </div>
                  </div>

                  {report.detail && (
                    <p className="text-sm text-gray-600 mb-3 line-clamp-3">{report.detail}</p>
                  )}

                  {report.imageUrl && (
                    <div className="mb-3 rounded-lg overflow-hidden border border-gray-200">
                      <img 
                        src={report.imageUrl} 
                        alt="รูปภาพประกอบ" 
                        className="w-full h-32 object-cover cursor-pointer hover:opacity-90 transition-opacity"
                        onClick={() => setViewingReport(report)}
                      />
                    </div>
                  )}

                  <div className="flex gap-2 items-center">
                    <button
                      onClick={() => setViewingReport(report)}
                      className="flex-1 bg-blue-500 hover:bg-blue-600 text-white text-sm font-semibold py-2 px-3 rounded-lg transition"
                    >
                      ดูรายละเอียด
                    </button>
                    <button
                      onClick={() => handleDelete(report.id)}
                      disabled={deletingId === report.id}
                      className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-60"
                      title="ลบ"
                    >
                      {deletingId === report.id ? (
                        <div className="w-5 h-5">...</div>
                      ) : (
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      )}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Modal for viewing report details */}
      {viewingReport && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
          onClick={() => setViewingReport(null)}
        >
          <div 
            className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="sticky top-0 bg-white border-b border-gray-200 p-6 flex justify-between items-start">
              <div className="flex-1">
                <h2 className="text-2xl font-bold text-gray-800 mb-2">{viewingReport.title}</h2>
                <p className="text-sm text-gray-500">
                  {new Date(viewingReport.createdAt).toLocaleString('th-TH', { 
                    dateStyle: 'full', 
                    timeStyle: 'short' 
                  })}
                </p>
              </div>
              <button
                onClick={() => setViewingReport(null)}
                className="ml-4 text-gray-400 hover:text-gray-600 transition"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="p-6">
              {viewingReport.imageUrl && (
                <div className="mb-6 rounded-lg overflow-hidden border border-gray-200">
                  <img 
                    src={viewingReport.imageUrl} 
                    alt="รูปภาพประกอบ" 
                    className="w-full h-auto max-h-96 object-contain bg-gray-50"
                  />
                </div>
              )}

              <div className="mb-6">
                <h3 className="text-lg font-semibold text-gray-800 mb-2">รายละเอียด</h3>
                <p className="text-gray-700 whitespace-pre-wrap">{viewingReport.detail || 'ไม่มีรายละเอียด'}</p>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setViewingReport(null)}
                  className="flex-1 bg-gray-500 hover:bg-gray-600 text-white font-semibold py-2 px-4 rounded-lg transition"
                >
                  ปิด
                </button>
                <button
                  onClick={() => {
                    handleDelete(viewingReport.id);
                    setViewingReport(null);
                  }}
                  className="bg-red-500 hover:bg-red-600 text-white font-semibold py-2 px-4 rounded-lg transition"
                >
                  ลบรายงานนี้
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
