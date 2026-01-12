'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Swal from 'sweetalert2';

interface Teacher {
  id: number;
  first_name: string;
  last_name: string;
  created_at: string;
}

export default function AdminTeachersPage() {
  const router = useRouter();
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [form, setForm] = useState({ firstName: '', lastName: '', password: '' });

  useEffect(() => {
    const adminId = document.cookie
      .split('; ')
      .find(row => row.startsWith('kss_admin='))
      ?.split('=')[1];

    if (!adminId) {
      router.push('/');
      return;
    }
    loadTeachers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadTeachers = async () => {
    try {
      const res = await fetch('/api/admin/teachers');
      const data = await res.json();
      if (data.ok) {
        setTeachers(data.teachers);
      } else {
        Swal.fire('ผิดพลาด', data.message, 'error');
      }
    } catch (err) {
      Swal.fire('ผิดพลาด', 'ไม่สามารถโหลดข้อมูลครู', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleAddTeacher = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!form.firstName || !form.lastName || !form.password) {
      await Swal.fire('ผิดพลาด', 'กรุณากรอกข้อมูลให้ครบถ้วน', 'error');
      return;
    }

    if (form.password.length < 6) {
      await Swal.fire('ผิดพลาด', 'รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร', 'error');
      return;
    }

    try {
      const res = await fetch('/api/admin/teachers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });

      const data = await res.json();
      if (data.ok) {
        await Swal.fire({
          icon: 'success',
          title: 'เพิ่มครูสำเร็จ',
          html: `<strong>ชื่อ:</strong> ${form.firstName} ${form.lastName}<br><strong>รหัสผ่าน:</strong> ${form.password}`,
          confirmButtonColor: '#138F2D'
        });
        setForm({ firstName: '', lastName: '', password: '' });
        setShowAddForm(false);
        loadTeachers();
      } else {
        Swal.fire('ผิดพลาด', data.message || 'ไม่สามารถเพิ่มครูได้', 'error');
      }
    } catch (err) {
      Swal.fire('ผิดพลาด', 'เกิดข้อผิดพลาด', 'error');
    }
  };

  const handleEditPassword = async (teacherId: number, teacherName: string) => {
    const { value: newPassword } = await Swal.fire({
      title: `แก้ไขรหัสผ่าน: ${teacherName}`,
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
        const res = await fetch('/api/admin/teachers', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ teacherId, password: newPassword }),
        });

        const data = await res.json();
        if (data.ok) {
          await Swal.fire({
            icon: 'success',
            title: 'สำเร็จ',
            text: `เปลี่ยนรหัสผ่านสำหรับ ${teacherName} เรียบร้อยแล้ว`,
            confirmButtonColor: '#138F2D'
          });
          loadTeachers();
        } else {
          Swal.fire('ผิดพลาด', data.message, 'error');
        }
      } catch (err) {
        Swal.fire('ผิดพลาด', 'เกิดข้อผิดพลาด', 'error');
      }
    }
  };

  const handleDeleteTeacher = async (teacherId: number, teacherName: string) => {
    const result = await Swal.fire({
      title: 'ยืนยันการลบ',
      text: `ต้องการลบครู ${teacherName} หรือไม่?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
      confirmButtonText: 'ลบ',
      cancelButtonText: 'ยกเลิก',
    });

    if (result.isConfirmed) {
      try {
        const res = await fetch('/api/admin/teachers', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ teacherId }),
        });

        const data = await res.json();
        if (data.ok) {
          Swal.fire('สำเร็จ', 'ลบครูสำเร็จ', 'success');
          loadTeachers();
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
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-school-50 to-white">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-school-600 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-school-50 to-white">
      <div className="w-full max-w-7xl mx-auto px-3 sm:px-4 md:px-6 py-6 sm:py-8">
        {/* Header */}
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
            <h1 className="text-2xl sm:text-3xl font-bold text-school-700">จัดการผู้ใช้ (ครู)</h1>
            <p className="text-sm text-gray-900 font-bold">เพิ่ม ลบ บัญชีครู</p>
          </div>
          <button
            onClick={() => setShowAddForm(!showAddForm)}
            className="px-4 py-2 bg-gradient-to-r from-school-500 to-school-600 text-white rounded-xl font-semibold hover:from-school-600 hover:to-school-700 transition-all shadow-lg"
          >
            {showAddForm ? 'ซ่อนฟอร์ม' : '+ เพิ่มครู'}
          </button>
        </div>

        {/* Add Teacher Form */}
        {showAddForm && (
          <div className="bg-white rounded-lg shadow-lg p-6 mb-6 border-2 border-blue-100">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">เพิ่มครูใหม่</h2>
            <form onSubmit={handleAddTeacher} className="space-y-4">
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
                  เพิ่มครู
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowAddForm(false);
                    setForm({ firstName: '', lastName: '', password: '' });
                  }}
                  className="px-6 py-2.5 bg-gray-200 text-gray-700 rounded-lg font-semibold hover:bg-gray-300 transition-all"
                >
                  ยกเลิก
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Teachers List */}
        <div className="bg-white rounded-2xl shadow-lg border-2 border-school-100 overflow-hidden">
          <div className="p-4 bg-gradient-to-r from-school-500 to-school-600 text-white">
            <h2 className="text-lg font-bold">รายชื่อครูทั้งหมด ({teachers.length} คน)</h2>
          </div>

          {teachers.length === 0 ? (
            <div className="p-8 text-center text-gray-900 font-bold">
              ยังไม่มีข้อมูลครู
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-school-100 border-b-2 border-school-200">
                  <tr>
                    <th className="px-4 sm:px-6 py-3 text-left text-sm font-bold text-gray-900">ID</th>
                    <th className="px-4 sm:px-6 py-3 text-left text-sm font-bold text-gray-900">ชื่อ-นามสกุล</th>
                    <th className="px-4 sm:px-6 py-3 text-left text-sm font-bold text-gray-900">รหัสผ่าน</th>
                    <th className="px-4 sm:px-6 py-3 text-left text-sm font-bold text-gray-900">สิทธิ์</th>
                    <th className="px-4 sm:px-6 py-3 text-left text-sm font-bold text-gray-900">การกระทำ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-school-100">
                  {teachers.map((teacher) => (
                    <tr key={teacher.id} className="hover:bg-school-50/30 transition-colors">
                      <td className="px-4 sm:px-6 py-4 text-sm text-gray-900 font-bold">{teacher.id}</td>
                      <td className="px-4 sm:px-6 py-4 text-sm text-gray-900 font-bold">{teacher.first_name} {teacher.last_name}</td>
                      <td className="px-4 sm:px-6 py-4 text-sm text-gray-900 font-semibold">
                        <span className="text-blue-600">เข้ารหัสแล้ว</span>
                      </td>
                      <td className="px-4 sm:px-6 py-4 text-sm text-gray-900 font-bold">ครู</td>
                      <td className="px-4 sm:px-6 py-4">
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleEditPassword(teacher.id, `${teacher.first_name} ${teacher.last_name}`)}
                            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            title="แก้ไขรหัสผ่าน"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                            </svg>
                          </button>
                          <button
                            onClick={() => handleDeleteTeacher(teacher.id, `${teacher.first_name} ${teacher.last_name}`)}
                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
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
          )}
        </div>
      </div>
    </div>
  );
}
