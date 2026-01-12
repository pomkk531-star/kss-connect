'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function TeacherPage() {
  const router = useRouter();

  useEffect(() => {
    const teacherId = document.cookie
      .split('; ')
      .find(row => row.startsWith('kss_teacher='))
      ?.split('=')[1];

    if (!teacherId) {
      router.push('/teacher/login');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleLogout = async () => {
    await fetch('/api/teacher/logout', { method: 'POST' });
    localStorage.removeItem('kss_teacher');
    router.push('/teacher/login');
  };

  const menuItems = [
    { title: 'จัดการประกาศ', href: '/teacher/announcements', icon: '📢', desc: 'เพิ่ม/แก้ไข/ลบ ข่าวประกาศถึงนักเรียน' },
    { title: 'จัดการปฏิทิน', href: '/teacher/events', icon: '📅', desc: 'เพิ่ม/แก้ไข/ลบ กิจกรรมและเหตุการณ์' },
    { title: 'รายงานปัญหา', href: '/teacher/reports', icon: '📋', desc: 'ดูและจัดการรายงานปัญหาจากนักเรียน' },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-school-50 to-white p-4 sm:p-6 md:p-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-school-700">แดชบอร์ดครู</h1>
            <p className="text-gray-600 mt-2">จัดการรายงานปัญหาและปฏิทินกิจกรรม</p>
          </div>
          <button
            onClick={handleLogout}
            className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition"
          >
            ออกจากระบบ
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {menuItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="bg-white p-4 sm:p-6 md:p-8 rounded-xl shadow-lg hover:shadow-xl transition-all border-2 border-school-100 hover:border-school-300"
            >
              <div className="flex items-start gap-4">
                <div className="text-5xl">{item.icon}</div>
                <div>
                  <h2 className="text-2xl font-semibold text-school-700 mb-2">{item.title}</h2>
                  <p className="text-gray-600">{item.desc}</p>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
