'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Swal from 'sweetalert2';

interface Announcement {
  id: number;
  title: string;
  content: string;
  priority: string;
  created_at: string;
}

export default function TeacherAnnouncementsPage() {
  const router = useRouter();
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [editId, setEditId] = useState<number | null>(null);
  const [formData, setFormData] = useState({ title: '', content: '', priority: 'normal' });

  useEffect(() => {
    const teacherId = document.cookie
      .split('; ')
      .find(row => row.startsWith('kss_teacher='))
      ?.split('=')[1];

    if (!teacherId) {
      router.push('/teacher/login');
      return;
    }
    loadAnnouncements();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadAnnouncements = async () => {
    try {
      const res = await fetch('/api/admin/announcements');
      const data = await res.json();
      if (data.ok) {
        setAnnouncements(data.announcements);
      } else {
        Swal.fire('ผิดพลาด', data.message || 'ไม่สามารถโหลดข้อมูล', 'error');
      }
    } catch (err) {
      Swal.fire('ผิดพลาด', 'ไม่สามารถโหลดข้อมูล', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const url = '/api/admin/announcements';
      const method = editId ? 'PUT' : 'POST';
      const body = editId ? JSON.stringify({ id: editId, ...formData }) : JSON.stringify(formData);

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body,
      });

      const data = await res.json();
      if (data.ok) {
        Swal.fire('สำเร็จ', editId ? 'แก้ไขข่าวประกาศแล้ว' : 'เพิ่มข่าวประกาศแล้ว', 'success');
        setFormData({ title: '', content: '', priority: 'normal' });
        setEditId(null);
        loadAnnouncements();
      } else {
        Swal.fire('ผิดพลาด', data.message || 'เกิดข้อผิดพลาด', 'error');
      }
    } catch (err) {
      Swal.fire('ผิดพลาด', 'เกิดข้อผิดพลาด', 'error');
    }
  };

  const handleEdit = (item: Announcement) => {
    setEditId(item.id);
    setFormData({ title: item.title, content: item.content, priority: item.priority });
  };

  const handleDelete = async (id: number, title: string) => {
    const result = await Swal.fire({
      title: 'ยืนยันการลบ',
      text: `ต้องการลบ "${title}" หรือไม่?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
      confirmButtonText: 'ลบ',
      cancelButtonText: 'ยกเลิก',
    });

    if (result.isConfirmed) {
      try {
        const res = await fetch('/api/admin/announcements', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id }),
        });

        const data = await res.json();
        if (data.ok) {
          Swal.fire('สำเร็จ', 'ลบข่าวประกาศแล้ว', 'success');
          loadAnnouncements();
        } else {
          Swal.fire('ผิดพลาด', data.message, 'error');
        }
      } catch (err) {
        Swal.fire('ผิดพลาด', 'เกิดข้อผิดพลาด', 'error');
      }
    }
  };

  const getPriorityBadge = (priority: string) => {
    const styles = {
      low: 'bg-blue-100 text-blue-700',
      normal: 'bg-green-100 text-green-700',
      high: 'bg-red-100 text-red-700',
    } as const;
    const labels = { low: 'ปกติ', normal: 'สำคัญ', high: 'ด่วน' } as const;
    return (
      <span className={`px-2 py-1 rounded text-xs font-semibold ${styles[priority as keyof typeof styles]}`}>
        {labels[priority as keyof typeof labels]}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-800 font-medium">กำลังโหลด...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-school-50 to-white p-4 sm:p-6 md:p-8 pt-20">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center gap-2 sm:gap-3 mb-4 sm:mb-6">
          <button
            onClick={() => router.push('/teacher')}
            className="p-2 hover:bg-school-100 rounded-lg transition-colors flex-shrink-0"
          >
            <svg className="w-5 sm:w-6 h-5 sm:h-6 text-school-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
          </button>
          <div className="min-w-0">
            <h1 className="text-xl sm:text-3xl font-bold text-school-700 truncate">📢 จัดการประกาศ</h1>
            <p className="text-xs sm:text-sm text-gray-900 font-bold">เพิ่ม แก้ไข ลบ ประกาศ</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
          <div className="bg-white p-4 sm:p-6 rounded-lg shadow-lg">
            <h2 className="text-lg sm:text-2xl font-semibold text-green-700 mb-4">
              {editId ? 'แก้ไขข่าวประกาศ' : 'เพิ่มข่าวประกาศใหม่'}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-3 sm:space-y-4">
              <div>
                <label className="block text-gray-700 font-semibold mb-2">หัวข้อ</label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full rounded-lg border border-school-200 bg-white px-4 py-2 text-gray-800 font-medium placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-school-200 focus:border-school-500 transition"
                  placeholder="พิมพ์หัวข้อข่าวประกาศ..."
                  required
                />
              </div>
              <div>
                <label className="block text-gray-700 font-semibold mb-2">เนื้อหา</label>
                <textarea
                  value={formData.content}
                  onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                  className="w-full rounded-lg border border-school-200 bg-white px-4 py-2 text-gray-800 font-medium placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-school-200 focus:border-school-500 transition"
                  placeholder="พิมพ์เนื้อหาข่าวประกาศ..."
                  rows={5}
                  required
                />
              </div>
              <div>
                <label className="block text-gray-700 font-semibold mb-2">ระดับความสำคัญ</label>
                <select
                  value={formData.priority}
                  onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                  className="w-full rounded-lg border border-school-200 bg-white px-4 py-2 text-gray-800 font-semibold focus:outline-none focus:ring-2 focus:ring-school-200 focus:border-school-500 transition"
                >
                  <option value="low">ปกติ</option>
                  <option value="normal">สำคัญ</option>
                  <option value="high">ด่วน</option>
                </select>
              </div>
              <div className="flex gap-2">
                <button
                  type="submit"
                  className="flex-1 bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded transition"
                >
                  {editId ? 'บันทึกการแก้ไข' : 'เพิ่มข่าวประกาศ'}
                </button>
                {editId && (
                  <button
                    type="button"
                    onClick={() => {
                      setEditId(null);
                      setFormData({ title: '', content: '', priority: 'normal' });
                    }}
                    className="px-4 bg-gray-400 hover:bg-gray-500 text-white font-bold rounded transition"
                  >
                    ยกเลิก
                  </button>
                )}
              </div>
            </form>
          </div>

          <div className="bg-white p-4 sm:p-6 rounded-lg shadow-lg">
            <h2 className="text-lg sm:text-2xl font-semibold text-green-700 mb-4">รายการข่าวประกาศ</h2>
            <div className="space-y-3 max-h-[600px] overflow-y-auto">
              {announcements.map((item) => (
                <div key={item.id} className="border border-school-100 rounded-lg p-4 hover:bg-school-50 transition">
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="font-bold text-lg text-gray-800">{item.title}</h3>
                    {getPriorityBadge(item.priority)}
                  </div>
                  <p className="text-gray-800 font-medium mb-3">{item.content}</p>
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-gray-700 font-medium">
                      {new Date(item.created_at).toLocaleDateString('th-TH')}
                    </span>
                    <div className="flex gap-2">
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
                        onClick={() => handleDelete(item.id, item.title)}
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
              {announcements.length === 0 && (
                <p className="text-center text-gray-500 py-8">ยังไม่มีข่าวประกาศ</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
