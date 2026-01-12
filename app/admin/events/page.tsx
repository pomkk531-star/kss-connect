'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Swal from 'sweetalert2';

interface Event {
  id: number;
  title: string;
  description: string;
  event_date: string;
  created_at: string;
}

export default function AdminEventsPage() {
  const router = useRouter();
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [editId, setEditId] = useState<number | null>(null);
  const [formData, setFormData] = useState({ title: '', description: '', event_date: '' });

  useEffect(() => {
    const adminId = document.cookie
      .split('; ')
      .find(row => row.startsWith('kss_admin='))
      ?.split('=')[1];

    if (!adminId) {
      router.push('/');
      return;
    }
    loadEvents();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadEvents = async () => {
    try {
      const res = await fetch('/api/events');
      const data = await res.json();
      if (data.ok) {
        setEvents(data.events);
      }
    } catch (err) {
      Swal.fire('ผิดพลาด', 'ไม่สามารถโหลดข้อมูล', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.title || !formData.event_date) {
      Swal.fire('ผิดพลาด', 'กรุณากรอกชื่อและวันที่', 'error');
      return;
    }

    try {
      const method = editId ? 'PUT' : 'POST';
      const body = editId
        ? JSON.stringify({ id: editId, ...formData })
        : JSON.stringify(formData);

      const res = await fetch('/api/events', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body,
      });

      const data = await res.json();
      if (data.ok) {
        Swal.fire('สำเร็จ', editId ? 'แก้ไขกิจกรรมแล้ว' : 'เพิ่มกิจกรรมแล้ว', 'success');
        setFormData({ title: '', description: '', event_date: '' });
        setEditId(null);
        loadEvents();
      } else {
        Swal.fire('ผิดพลาด', data.message || 'เกิดข้อผิดพลาด', 'error');
      }
    } catch (err) {
      Swal.fire('ผิดพลาด', 'เกิดข้อผิดพลาด', 'error');
    }
  };

  const handleEdit = (item: Event) => {
    setEditId(item.id);
    setFormData({
      title: item.title,
      description: item.description,
      event_date: item.event_date,
    });
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
        const res = await fetch('/api/events', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id }),
        });

        const data = await res.json();
        if (data.ok) {
          Swal.fire('สำเร็จ', 'ลบกิจกรรมแล้ว', 'success');
          loadEvents();
        } else {
          Swal.fire('ผิดพลาด', data.message, 'error');
        }
      } catch (err) {
        Swal.fire('ผิดพลาด', 'เกิดข้อผิดพลาด', 'error');
      }
    }
  };

  const getEventStatus = (date: string) => {
    const eventDate = new Date(date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    eventDate.setHours(0, 0, 0, 0);

    if (eventDate.getTime() === today.getTime()) {
      return { text: 'วันนี้', color: 'bg-green-100 text-green-700' };
    } else if (eventDate < today) {
      return { text: 'ผ่านไปแล้ว', color: 'bg-gray-100 text-gray-700' };
    } else {
      return { text: 'กำลังมา', color: 'bg-yellow-100 text-yellow-700' };
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-500">กำลังโหลด...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-school-50 to-white p-4 sm:p-6 md:p-8 pt-20">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center gap-2 sm:gap-3 mb-4 sm:mb-6 flex-wrap">
          <button
            onClick={() => router.push('/admin')}
            className="p-2 hover:bg-school-100 rounded-lg transition-colors flex-shrink-0 touch-manipulation"
          >
            <svg className="w-5 sm:w-6 h-5 sm:h-6 text-school-700 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
          </button>
          <div className="min-w-0">
            <h1 className="text-lg sm:text-2xl md:text-3xl font-bold text-school-700 truncate">📅 จัดการปฏิทิน</h1>
            <p className="text-xs sm:text-sm text-gray-900 font-bold">เพิ่ม แก้ไข ลบ กิจกรรม</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
          {/* ฟอร์มเพิ่ม/แก้ไข */}
          <div className="bg-white p-6 rounded-lg shadow-lg">
            <h2 className="text-2xl font-semibold text-green-700 mb-4">
              {editId ? 'แก้ไขกิจกรรม' : 'เพิ่มกิจกรรมใหม่'}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-gray-700 font-semibold mb-2">ชื่อกิจกรรม*</label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full rounded-lg border border-school-200 bg-white px-4 py-2 text-gray-900 placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-school-200 focus:border-school-500 transition"
                  required
                />
              </div>
              <div>
                <label className="block text-gray-700 font-semibold mb-2">รายละเอียด</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full rounded-lg border border-school-200 bg-white px-4 py-2 text-gray-900 placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-school-200 focus:border-school-500 transition"
                  rows={4}
                  placeholder="ใส่รายละเอียดกิจกรรม (ไม่บังคับ)"
                />
              </div>
              <div>
                <label className="block text-gray-700 font-semibold mb-2">วันที่ของกิจกรรม*</label>
                <input
                  type="date"
                  value={formData.event_date}
                  onChange={(e) => setFormData({ ...formData, event_date: e.target.value })}
                  className="w-full rounded-lg border border-school-200 bg-white px-4 py-2 text-gray-900 placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-school-200 focus:border-school-500 transition"
                  required
                />
              </div>
              <div className="flex gap-2">
                <button
                  type="submit"
                  className="flex-1 bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded transition"
                >
                  {editId ? 'บันทึกการแก้ไข' : 'เพิ่มกิจกรรม'}
                </button>
                {editId && (
                  <button
                    type="button"
                    onClick={() => {
                      setEditId(null);
                      setFormData({ title: '', description: '', event_date: '' });
                    }}
                    className="px-4 bg-gray-400 hover:bg-gray-500 text-white font-bold rounded transition"
                  >
                    ยกเลิก
                  </button>
                )}
              </div>
            </form>
          </div>

          {/* รายการกิจกรรม */}
          <div className="bg-white p-6 rounded-lg shadow-lg">
            <h2 className="text-2xl font-semibold text-green-700 mb-4">รายการกิจกรรมทั้งหมด</h2>
            <div className="space-y-3 max-h-[600px] overflow-y-auto">
              {events.map((item) => {
                const status = getEventStatus(item.event_date);
                return (
                  <div key={item.id} className="border border-school-100 rounded-lg p-4 hover:bg-school-50 transition">
                    <div className="flex justify-between items-start mb-2">
                      <h3 className="font-bold text-lg text-gray-800">{item.title}</h3>
                      <span className={`px-2 py-1 rounded text-xs font-semibold ${status.color}`}>
                        {status.text}
                      </span>
                    </div>
                    {item.description && (
                      <p className="text-gray-600 mb-2 text-sm">{item.description}</p>
                    )}
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-500">
                        📅 {new Date(item.event_date).toLocaleDateString('th-TH')}
                      </span>
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleEdit(item)}
                          className="px-3 py-1 bg-blue-500 hover:bg-blue-600 text-white text-sm rounded transition"
                        >
                          แก้ไข
                        </button>
                        <button
                          onClick={() => handleDelete(item.id, item.title)}
                          className="px-3 py-1 bg-red-500 hover:bg-red-600 text-white text-sm rounded transition"
                        >
                          ลบ
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
              {events.length === 0 && (
                <p className="text-center text-gray-500 py-8">ยังไม่มีกิจกรรม</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
