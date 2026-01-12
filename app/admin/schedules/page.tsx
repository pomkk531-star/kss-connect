'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Swal from 'sweetalert2';

interface Schedule {
  id: number;
  type: string;
  title: string;
  description: string;
  date: string;
  created_at: string;
}

export default function AdminSchedulesPage() {
  const router = useRouter();
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [editId, setEditId] = useState<number | null>(null);
  const [formData, setFormData] = useState({
    type: 'exam',
    title: '',
    description: '',
    date: '',
  });

  useEffect(() => {
    const adminId = document.cookie
      .split('; ')
      .find(row => row.startsWith('kss_admin='))
      ?.split('=')[1];

    if (!adminId) {
      router.push('/');
      return;
    }
    loadSchedules();
  }, [router]);

  const loadSchedules = async () => {
    try {
      const res = await fetch('/api/admin/schedules');
      const data = await res.json();
      if (data.ok) {
        setSchedules(data.schedules);
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
      const url = '/api/admin/schedules';
      const method = editId ? 'PUT' : 'POST';
      const body = editId
        ? JSON.stringify({ id: editId, ...formData })
        : JSON.stringify(formData);

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body,
      });

      const data = await res.json();
      if (data.ok) {
        Swal.fire('สำเร็จ', editId ? 'แก้ไขตารางแล้ว' : 'เพิ่มตารางแล้ว', 'success');
        setFormData({ type: 'exam', title: '', description: '', date: '' });
        setEditId(null);
        loadSchedules();
      } else {
        Swal.fire('ผิดพลาด', data.message || 'เกิดข้อผิดพลาด', 'error');
      }
    } catch (err) {
      Swal.fire('ผิดพลาด', 'เกิดข้อผิดพลาด', 'error');
    }
  };

  const handleEdit = (item: Schedule) => {
    setEditId(item.id);
    setFormData({
      type: item.type,
      title: item.title,
      description: item.description,
      date: item.date,
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
        const res = await fetch('/api/admin/schedules', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id }),
        });

        const data = await res.json();
        if (data.ok) {
          Swal.fire('สำเร็จ', 'ลบตารางแล้ว', 'success');
          loadSchedules();
        } else {
          Swal.fire('ผิดพลาด', data.message, 'error');
        }
      } catch (err) {
        Swal.fire('ผิดพลาด', 'เกิดข้อผิดพลาด', 'error');
      }
    }
  };

  const getTypeBadge = (type: string) => {
    const styles = {
      exam: 'bg-red-100 text-red-700',
      class: 'bg-blue-100 text-blue-700',
    };
    const labels = { exam: 'ตารางสอบ', class: 'ตารางเรียน' };
    return (
      <span className={`px-2 py-1 rounded text-xs font-semibold ${styles[type as keyof typeof styles]}`}>
        {labels[type as keyof typeof labels]}
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
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-white p-4 sm:p-6 md:p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-4xl font-bold text-green-700">📅 จัดการตารางสอบ/เรียน</h1>
          <Link
            href="/admin"
            className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-6 rounded-lg transition"
          >
            ← กลับ
          </Link>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* ฟอร์มเพิ่ม/แก้ไข */}
          <div className="bg-white p-6 rounded-lg shadow-lg">
            <h2 className="text-2xl font-semibold text-green-700 mb-4">
              {editId ? 'แก้ไขตาราง' : 'เพิ่มตารางใหม่'}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-gray-700 font-semibold mb-2">ประเภท</label>
                <select
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                  className="w-full border-2 border-green-300 rounded px-4 py-2 focus:outline-none focus:border-green-500 text-gray-800 font-semibold"
                >
                  <option value="exam">ตารางสอบ</option>
                  <option value="class">ตารางเรียน</option>
                </select>
              </div>
              <div>
                <label className="block text-gray-700 font-semibold mb-2">หัวข้อ</label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full border-2 border-green-300 rounded px-4 py-2 focus:outline-none focus:border-green-500 placeholder:text-gray-700 placeholder:font-semibold"
                  placeholder="พิมพ์หัวข้อ..."
                  required
                />
              </div>
              <div>
                <label className="block text-gray-700 font-semibold mb-2">รายละเอียด</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full border-2 border-green-300 rounded px-4 py-2 focus:outline-none focus:border-green-500 placeholder:text-gray-700 placeholder:font-semibold"
                  placeholder="พิมพ์รายละเอียด..."
                  rows={4}
                  required
                />
              </div>
              <div>
                <label className="block text-gray-700 font-semibold mb-2">วันที่</label>
                <input
                  type="date"
                  value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                  className="w-full border-2 border-green-300 rounded px-4 py-2 focus:outline-none focus:border-green-500"
                  required
                />
              </div>
              <div className="flex gap-2">
                <button
                  type="submit"
                  className="flex-1 bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded transition"
                >
                  {editId ? 'บันทึกการแก้ไข' : 'เพิ่มตาราง'}
                </button>
                {editId && (
                  <button
                    type="button"
                    onClick={() => {
                      setEditId(null);
                      setFormData({ type: 'exam', title: '', description: '', date: '' });
                    }}
                    className="px-4 bg-gray-400 hover:bg-gray-500 text-white font-bold rounded transition"
                  >
                    ยกเลิก
                  </button>
                )}
              </div>
            </form>
          </div>

          {/* รายการตาราง */}
          <div className="bg-white p-6 rounded-lg shadow-lg">
            <h2 className="text-2xl font-semibold text-green-700 mb-4">รายการตาราง</h2>
            <div className="space-y-3 max-h-[600px] overflow-y-auto">
              {schedules.map((item) => (
                <div key={item.id} className="border-2 border-green-100 rounded-lg p-4 hover:bg-green-50 transition">
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="font-bold text-lg text-gray-800">{item.title}</h3>
                    {getTypeBadge(item.type)}
                  </div>
                  <p className="text-gray-800 font-medium mb-2">{item.description}</p>
                  <p className="text-sm text-gray-700 font-medium mb-3">
                    📅 {new Date(item.date).toLocaleDateString('th-TH')}
                  </p>
                  <div className="flex justify-end gap-2">
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
              ))}
              {schedules.length === 0 && (
                <p className="text-center text-gray-500 py-8">ยังไม่มีตาราง</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
