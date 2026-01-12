'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function AdminPage() {
  const router = useRouter();

  useEffect(() => {
    const adminId = document.cookie
      .split('; ')
      .find(row => row.startsWith('kss_admin='))
      ?.split('=')[1];

    if (!adminId) {
      router.push('/');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleLogout = async () => {
    await fetch('/api/admin/logout', { method: 'POST' });
    router.push('/');
  };

  const menuItems = [
    { title: 'จัดการผู้ใช้ (นักเรียน)', href: '/admin/users', icon: '👥', desc: 'เพิ่ม/ลบ/แก้ไข ผู้ใช้นักเรียนและสิทธิ์' },
    { title: 'จัดการผู้ใช้ (ครู)', href: '/admin/teachers', icon: '👨‍🏫', desc: 'เพิ่ม/ลบ บัญชีครู (ใช้ชื่อ-นามสกุล)' },
    { title: 'จัดการประกาศ', href: '/admin/announcements', icon: '📢', desc: 'จัดการประกาศที่แสดงในหน้า Dashboard' },
    { title: 'จัดการปฏิทิน', href: '/admin/events', icon: '📅', desc: 'เพิ่ม/ลบ/แก้ไข กิจกรรมและเหตุการณ์' },
    { title: 'จัดการข้อมูล AI', href: '/admin/ai-knowledge', icon: '🤖', desc: 'เพิ่ม/แก้ไข คำถามและคำตอบของ AI' },
    { title: 'ข้อความทั้งหมด', href: '/admin/messages', icon: '✉️', desc: 'ดูว่าใครส่งหาใครทั้งหมด' },
    { title: 'รายงานปัญหา', href: '/admin/reports', icon: '📋', desc: 'ดูและจัดการปัญหาที่ผู้ใช้รายงาน' },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-school-50 to-white p-4 sm:p-6 md:p-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-school-700">แดชบอร์ดแอดมิน</h1>
          <button
            onClick={handleLogout}
            className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition"
          >
            ออกจากระบบ
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-6">
          {menuItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="bg-white p-6 rounded-xl shadow-lg hover:shadow-xl transition-all border-2 border-school-100 hover:border-school-300"
            >
              <div className="flex items-start gap-4">
                <div className="text-4xl">{item.icon}</div>
                <div>
                  <h2 className="text-xl font-semibold text-school-700 mb-2">{item.title}</h2>
                  <p className="text-gray-800 font-medium">{item.desc}</p>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}

