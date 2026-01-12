'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Swal from 'sweetalert2';

interface DressCode {
  id: number;
  title: string;
  description: string;
  image_url?: string;
  created_at: string;
}

export default function AdminDressCodePage() {
  const router = useRouter();
  const [items, setItems] = useState<DressCode[]>([]);
  const [loading, setLoading] = useState(true);
  const [editId, setEditId] = useState<number | null>(null);
  const [formData, setFormData] = useState({ title: '', description: '', image_url: '' });

  useEffect(() => {
    const adminId = document.cookie
      .split('; ')
      .find(row => row.startsWith('kss_admin='))
      ?.split('=')[1];

    if (!adminId) {
      router.push('/');
      return;
    }
    loadDressCode();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadDressCode = async () => {
    try {
      const res = await fetch('/api/admin/dress-code');
      const data = await res.json();
      if (data.ok) {
        setItems(data.items);
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
      const url = '/api/admin/dress-code';
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
        Swal.fire('สำเร็จ', editId ? 'แก้ไขข้อมูลแล้ว' : 'เพิ่มข้อมูลแล้ว', 'success');
        setFormData({ title: '', description: '', image_url: '' });
        setEditId(null);
        loadDressCode();
      } else {
        Swal.fire('ผิดพลาด', data.message || 'เกิดข้อผิดพลาด', 'error');
      }
    } catch (err) {
      Swal.fire('ผิดพลาด', 'เกิดข้อผิดพลาด', 'error');
    }
  };

  const handleEdit = (item: DressCode) => {
    setEditId(item.id);
    setFormData({
      title: item.title,
      description: item.description,
      image_url: item.image_url || '',
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
        const res = await fetch('/api/admin/dress-code', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id }),
        });

        const data = await res.json();
        if (data.ok) {
          Swal.fire('สำเร็จ', 'ลบข้อมูลแล้ว', 'success');
          loadDressCode();
        } else {
          Swal.fire('ผิดพลาด', data.message, 'error');
        }
      } catch (err) {
        Swal.fire('ผิดพลาด', 'เกิดข้อผิดพลาด', 'error');
      }
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
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-white p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-4xl font-bold text-green-700">👔 จัดการระเบียบการแต่งกาย</h1>
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
              {editId ? 'แก้ไขข้อมูล' : 'เพิ่มข้อมูลใหม่'}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-gray-700 font-semibold mb-2">หัวข้อ</label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full border-2 border-green-300 rounded px-4 py-2 focus:outline-none focus:border-green-500"
                  required
                />
              </div>
              <div>
                <label className="block text-gray-700 font-semibold mb-2">รายละเอียด</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full border-2 border-green-300 rounded px-4 py-2 focus:outline-none focus:border-green-500"
                  rows={4}
                  required
                />
              </div>
              <div>
                <label className="block text-gray-700 font-semibold mb-2">URL รูปภาพ (ถ้ามี)</label>
                <input
                  type="text"
                  value={formData.image_url}
                  onChange={(e) => setFormData({ ...formData, image_url: e.target.value })}
                  className="w-full border-2 border-green-300 rounded px-4 py-2 focus:outline-none focus:border-green-500"
                  placeholder="https://example.com/image.jpg"
                />
              </div>
              <div className="flex gap-2">
                <button
                  type="submit"
                  className="flex-1 bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded transition"
                >
                  {editId ? 'บันทึกการแก้ไข' : 'เพิ่มข้อมูล'}
                </button>
                {editId && (
                  <button
                    type="button"
                    onClick={() => {
                      setEditId(null);
                      setFormData({ title: '', description: '', image_url: '' });
                    }}
                    className="px-4 bg-gray-400 hover:bg-gray-500 text-white font-bold rounded transition"
                  >
                    ยกเลิก
                  </button>
                )}
              </div>
            </form>
          </div>

          {/* รายการ */}
          <div className="bg-white p-6 rounded-lg shadow-lg">
            <h2 className="text-2xl font-semibold text-green-700 mb-4">รายการระเบียบการแต่งกาย</h2>
            <div className="space-y-3 max-h-[600px] overflow-y-auto">
              {items.map((item) => (
                <div key={item.id} className="border-2 border-green-100 rounded-lg p-4 hover:bg-green-50 transition">
                  <h3 className="font-bold text-lg text-gray-800 mb-2">{item.title}</h3>
                  <p className="text-gray-600 mb-3">{item.description}</p>
                  {item.image_url && (
                    <div className="mb-3">
                      <img
                        src={item.image_url}
                        alt={item.title}
                        className="w-full h-48 object-cover rounded"
                        onError={(e) => {
                          e.currentTarget.style.display = 'none';
                        }}
                      />
                    </div>
                  )}
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-gray-500">
                      {new Date(item.created_at).toLocaleDateString('th-TH')}
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
              ))}
              {items.length === 0 && (
                <p className="text-center text-gray-500 py-8">ยังไม่มีข้อมูล</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
