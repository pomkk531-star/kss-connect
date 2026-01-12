'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Swal from 'sweetalert2';

interface User {
  id: number;
  first_name: string;
  last_name: string;
  class_code: string;
  role: string;
  password_hash: string;
  created_at: string;
}

export default function AdminUsersPage() {
  const router = useRouter();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [form, setForm] = useState({ 
    firstName: '', 
    lastName: '', 
    classCode: '', 
    password: '' 
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
    loadUsers();
  }, [router]);

  const loadUsers = async () => {
    try {
      const res = await fetch('/api/admin/users');
      const data = await res.json();
      if (data.ok) {
        setUsers(data.users);
      } else {
        Swal.fire('ผิดพลาด', data.message, 'error');
      }
    } catch (err) {
      Swal.fire('ผิดพลาด', 'ไม่สามารถโหลดข้อมูลผู้ใช้', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleAddStudent = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!form.firstName || !form.lastName || !form.classCode || !form.password) {
      await Swal.fire('ผิดพลาด', 'กรุณากรอกข้อมูลให้ครบถ้วน', 'error');
      return;
    }

    if (form.password.length < 6) {
      await Swal.fire('ผิดพลาด', 'รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร', 'error');
      return;
    }

    try {
      const res = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });

      const data = await res.json();
      if (data.ok) {
        await Swal.fire({
          icon: 'success',
          title: 'เพิ่มนักเรียนสำเร็จ',
          html: `<strong>ชื่อ:</strong> ${form.firstName} ${form.lastName}<br><strong>รหัสผ่าน:</strong> ${form.password}`,
          confirmButtonColor: '#138F2D'
        });
        setForm({ firstName: '', lastName: '', classCode: '', password: '' });
        setShowAddForm(false);
        loadUsers();
      } else {
        Swal.fire('ผิดพลาด', data.message || 'ไม่สามารถเพิ่มนักเรียนได้', 'error');
      }
    } catch (err) {
      Swal.fire('ผิดพลาด', 'เกิดข้อผิดพลาด', 'error');
    }
  };

  const handleEditPassword = async (userId: number, userName: string) => {
    const { value: newPassword } = await Swal.fire({
      title: `แก้ไขรหัสผ่าน: ${userName}`,
      input: 'text',
      inputLabel: 'รหัสผ่านใหม่',
      inputPlaceholder: 'กรอกรหัสผ่านใหม่',
      showCancelButton: true,
      confirmButtonColor: '#138F2D',
      cancelButtonColor: '#d33',
      confirmButtonText: 'บันทึก',
      cancelButtonText: 'ยกเลิก',
      inputValidator: (value) => {
        if (!value) {
          return 'กรุณากรอกรหัสผ่าน';
        }
        if (value.length < 6) {
          return 'รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร';
        }
        return null;
      }
    });

    if (newPassword) {
      try {
        const res = await fetch('/api/admin/users', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId, password: newPassword }),
        });

        const data = await res.json();
        if (data.ok) {
          await Swal.fire({
            icon: 'success',
            title: 'สำเร็จ',
            text: `เปลี่ยนรหัสผ่านสำหรับ ${userName} เรียบร้อยแล้ว`,
            confirmButtonColor: '#138F2D'
          });
          loadUsers();
        } else {
          Swal.fire('ผิดพลาด', data.message, 'error');
        }
      } catch (err) {
        Swal.fire('ผิดพลาด', 'เกิดข้อผิดพลาด', 'error');
      }
    }
  };

  const handleDeleteUser = async (userId: number, userName: string) => {
    const result = await Swal.fire({
      title: 'ยืนยันการลบ',
      text: `ต้องการลบ ${userName} หรือไม่?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
      confirmButtonText: 'ลบ',
      cancelButtonText: 'ยกเลิก',
    });

    if (result.isConfirmed) {
      try {
        const res = await fetch('/api/admin/users', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId }),
        });

        const data = await res.json();
        if (data.ok) {
          Swal.fire('สำเร็จ', 'ลบผู้ใช้สำเร็จ', 'success');
          loadUsers();
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
        <p className="text-gray-800 font-medium">กำลังโหลด...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-school-50 to-white p-4 sm:p-6 md:p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <button
            onClick={() => router.push('/admin')}
            className="p-2 hover:bg-school-100 rounded-lg transition-colors"
          >
            <svg className="w-6 h-6 text-school-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
          </button>
          <div className="flex-1">
            <h1 className="text-lg sm:text-2xl md:text-3xl font-bold text-school-700">จัดการผู้ใช้ (นักเรียน)</h1>
            <p className="text-sm text-gray-900 font-bold">เพิ่ม ลบ บัญชีนักเรียน</p>
          </div>
          <button
            onClick={() => setShowAddForm(!showAddForm)}
            className="px-3 sm:px-4 py-2 text-sm sm:text-base bg-gradient-to-r from-school-500 to-school-600 text-white rounded-xl font-semibold hover:from-school-600 hover:to-school-700 transition-all shadow-lg flex-shrink-0"
          >
            <span className="hidden sm:inline">{showAddForm ? 'ซ่อนฟอร์ม' : '+ เพิ่มนักเรียน'}</span>
            <span className="sm:hidden">{showAddForm ? 'ซ่อน' : '+'}</span>
          </button>
        </div>

        {/* Add Student Form */}
        {showAddForm && (
          <div className="bg-white rounded-lg shadow-lg p-6 mb-6 border-2 border-blue-100">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">เพิ่มนักเรียนใหม่</h2>
            <form onSubmit={handleAddStudent} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-gray-900 mb-2">ชื่อ *</label>
                  <input
                    type="text"
                    value={form.firstName}
                    onChange={(e) => setForm({ ...form, firstName: e.target.value })}
                    placeholder="เช่น สมชาย"
                    className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-400 text-gray-900"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-900 mb-2">นามสกุล *</label>
                  <input
                    type="text"
                    value={form.lastName}
                    onChange={(e) => setForm({ ...form, lastName: e.target.value })}
                    placeholder="เช่น ใจดี"
                    className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-400 text-gray-900"
                    required
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-900 mb-2">ห้องเรียน *</label>
                  <select
                    value={form.classCode}
                    onChange={(e) => setForm({ ...form, classCode: e.target.value })}
                    className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-400 text-gray-900"
                    required
                  >
                    <option value="">เลือกห้องเรียน</option>
                    {[1, 2, 3, 4, 5, 6].map(grade => {
                      const maxRoom = grade <= 3 ? 5 : 4;
                      return Array.from({ length: maxRoom }, (_, i) => i + 1).map(room => {
                        const val = `ม.${grade}/${room}`;
                        return <option key={val} value={val}>{val}</option>;
                      });
                    })}
                  </select>
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-900 mb-2">รหัสผ่าน *</label>
                <input
                  type="text"
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  placeholder="อย่างน้อย 6 ตัวอักษร"
                  className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-400 text-gray-900"
                  minLength={6}
                  required
                />
              </div>
              <div className="flex gap-2">
                <button
                  type="submit"
                  className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold transition-all shadow-lg"
                >
                  เพิ่มนักเรียน
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowAddForm(false);
                    setForm({ firstName: '', lastName: '', classCode: '', password: '' });
                  }}
                  className="px-6 py-2.5 bg-gray-200 text-gray-700 rounded-lg font-semibold hover:bg-gray-300 transition-all"
                >
                  ยกเลิก
                </button>
              </div>
            </form>
          </div>
        )}

        <div className="bg-white rounded-lg shadow-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-green-600 text-white">
                <tr>
                  <th className="px-2 sm:px-4 md:px-6 py-2 sm:py-3 text-left text-xs sm:text-sm font-semibold">ID</th>
                  <th className="px-2 sm:px-4 md:px-6 py-2 sm:py-3 text-left text-xs sm:text-sm font-semibold">ชื่อ-นามสกุล</th>
                  <th className="px-2 sm:px-4 md:px-6 py-2 sm:py-3 text-left text-xs sm:text-sm font-semibold">ห้องเรียน</th>
                  <th className="px-2 sm:px-4 md:px-6 py-2 sm:py-3 text-left text-xs sm:text-sm font-semibold hidden sm:table-cell">รหัสผ่าน</th>
                  <th className="px-2 sm:px-4 md:px-6 py-2 sm:py-3 text-left text-xs sm:text-sm font-semibold hidden md:table-cell">สิทธิ์</th>
                  <th className="px-2 sm:px-4 md:px-6 py-2 sm:py-3 text-center text-xs sm:text-sm font-semibold">การกระทำ</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr key={user.id} className="border-b hover:bg-green-50 transition">
                    <td className="px-2 sm:px-4 md:px-6 py-2 sm:py-3 md:py-4 text-gray-700 text-xs sm:text-sm">{user.id}</td>
                    <td className="px-2 sm:px-4 md:px-6 py-2 sm:py-3 md:py-4 text-gray-700 font-semibold text-xs sm:text-sm">{user.first_name} {user.last_name}</td>
                    <td className="px-2 sm:px-4 md:px-6 py-2 sm:py-3 md:py-4 text-gray-700 text-xs sm:text-sm">{user.class_code}</td>
                    <td className="px-2 sm:px-4 md:px-6 py-2 sm:py-3 md:py-4 hidden sm:table-cell">
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-gray-500 italic">เข้ารหัสแล้ว</span>
                      </div>
                    </td>
                    <td className="px-2 sm:px-4 md:px-6 py-2 sm:py-3 md:py-4 text-gray-700 font-semibold text-xs hidden md:table-cell">นักเรียน</td>
                    <td className="px-2 sm:px-4 md:px-6 py-2 sm:py-3 md:py-4 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => handleEditPassword(user.id, `${user.first_name} ${user.last_name}`)}
                          className="inline-flex items-center justify-center p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="แก้ไขรหัสผ่าน"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                          </svg>
                        </button>
                        <button
                          onClick={() =>
                            handleDeleteUser(user.id, `${user.first_name} ${user.last_name}`)
                          }
                          className="inline-flex items-center justify-center p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="ลบ"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {users.length === 0 && (
          <p className="text-center text-gray-500 mt-8">ไม่มีผู้ใช้ในระบบ</p>
        )}

        <div className="mt-6 text-sm text-gray-600 bg-blue-50 border-l-4 border-blue-500 p-4 rounded">
          <p className="font-semibold mb-2">📋 คำแนะนำ:</p>
          <ul className="list-disc list-inside space-y-1">
            <li>หน้านี้แสดงเฉพาะผู้ใช้นักเรียน</li>
            <li>ทั้งหมด {users.length} ผู้ใช้ในระบบ</li>
          </ul>
        </div>
      </div>
    </div>
  );
}

