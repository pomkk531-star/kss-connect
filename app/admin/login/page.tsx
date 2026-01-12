'use client';

// หน้านี้ถูกปิดการใช้งาน - แอดมินสามารถ login ได้จากหน้าหลัก (/) แล้ว
// ใส่ username ในช่อง "ชื่อ" และรหัสผ่านเพื่อ login เป็นแอดมิน

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function AdminLoginPageRemoved() {
  const router = useRouter();
  
  useEffect(() => {
    // Redirect ไปหน้าหลักทันที
    router.push('/');
  }, [router]);

  return (
    <div style={{ 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'center', 
      minHeight: '100vh',
      fontFamily: 'sans-serif',
      background: 'linear-gradient(135deg, #E7F5EA 0%, #FFFFFF 100%)'
    }}>
      <div style={{ 
        textAlign: 'center',
        padding: '40px',
        background: 'white',
        borderRadius: '12px',
        boxShadow: '0 4px 20px rgba(0,0,0,0.1)'
      }}>
        <div style={{ fontSize: '48px', marginBottom: '20px' }}>🔄</div>
        <h1 style={{ color: '#138F2D', marginBottom: '10px' }}>กำลังเปลี่ยนเส้นทาง...</h1>
        <p style={{ color: '#666' }}>กรุณา login ที่หน้าหลัก</p>
      </div>
    </div>
  );
}
