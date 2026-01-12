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
  image_url?: string;
  created_at: string;
}

export default function AdminAnnouncementsPage() {
  const router = useRouter();
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [editId, setEditId] = useState<number | null>(null);
  const [formData, setFormData] = useState({ title: '', content: '', priority: 'normal', imageUrl: '' });
  const [uploading, setUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [imageModalOpen, setImageModalOpen] = useState(false);
  const [selectedImage, setSelectedImage] = useState('');

  useEffect(() => {
    const adminId = document.cookie
      .split('; ')
      .find(row => row.startsWith('kss_admin='))
      ?.split('=')[1];

    if (!adminId) {
      router.push('/');
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
      // Upload image first if file selected
      let finalImageUrl = formData.imageUrl;
      if (selectedFile) {
        setUploading(true);
        const uploadFormData = new FormData();
        uploadFormData.append('file', selectedFile);
        
        const uploadRes = await fetch('/api/upload', {
          method: 'POST',
          body: uploadFormData,
        });
        
        const uploadData = await uploadRes.json();
        setUploading(false);
        
        if (uploadData.ok) {
          finalImageUrl = uploadData.imageUrl;
        } else {
          Swal.fire('ผิดพลาด', uploadData.message || 'ไม่สามารถอัปโหลดรูปได้', 'error');
          return;
        }
      }

      const url = '/api/admin/announcements';
      const method = editId ? 'PUT' : 'POST';
      const body = editId
        ? JSON.stringify({ id: editId, ...formData, imageUrl: finalImageUrl })
        : JSON.stringify({ ...formData, imageUrl: finalImageUrl });

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body,
      });

      const data = await res.json();
      if (data.ok) {
        await Swal.fire('สำเร็จ', editId ? 'แก้ไขข่าวประกาศแล้ว' : 'เพิ่มข่าวประกาศแล้ว', 'success');
        setFormData({ title: '', content: '', priority: 'normal', imageUrl: '' });
        setSelectedFile(null);
        setEditId(null);
        await loadAnnouncements(); // รีโหลดข้อมูลทันที
      } else {
        Swal.fire('ผิดพลาด', data.message || 'เกิดข้อผิดพลาด', 'error');
      }
    } catch (err) {
      Swal.fire('ผิดพลาด', 'เกิดข้อผิดพลาด', 'error');
    } finally {
      setUploading(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file type
      const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
      if (!allowedTypes.includes(file.type)) {
        Swal.fire('ผิดพลาด', 'รองรับเฉพาะไฟล์ JPG, PNG, GIF', 'error');
        return;
      }
      
      // Validate file size (5MB)
      if (file.size > 5 * 1024 * 1024) {
        Swal.fire('ผิดพลาด', 'ไฟล์ใหญ่เกิน 5MB', 'error');
        return;
      }
      
      setSelectedFile(file);
      // Clear URL field if file is selected
      setFormData({ ...formData, imageUrl: '' });
    }
  };

  const handleRemoveImage = () => {
    setSelectedFile(null);
    setFormData({ ...formData, imageUrl: '' });
  };

  const handleEdit = (item: Announcement) => {
    setEditId(item.id);
    setFormData({ title: item.title, content: item.content, priority: item.priority, imageUrl: item.image_url || '' });
    setSelectedFile(null);
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
    };
    const labels = { low: 'ปกติ', normal: 'สำคัญ', high: 'ด่วน' };
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
            onClick={() => router.push('/admin')}
            className="p-2 hover:bg-school-100 rounded-lg transition-colors flex-shrink-0"
          >
            <svg className="w-5 sm:w-6 h-5 sm:h-6 text-school-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
          </button>
          <div className="min-w-0">
            <h1 className="text-xl sm:text-3xl font-bold text-school-700 truncate">📢 จัดการข่าวประกาศ</h1>
            <p className="text-xs sm:text-sm text-gray-900 font-bold">เพิ่ม แก้ไข ลบ ประกาศ</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
          {/* ฟอร์มเพิ่ม/แก้ไข */}
          <div className="bg-white p-4 sm:p-6 rounded-lg shadow-lg">
            <h2 className="text-lg sm:text-2xl font-semibold text-green-700 mb-4">
              {editId ? 'แก้ไขข่าวประกาศ' : 'เพิ่มข่าวประกาศใหม่'}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-3 sm:space-y-4">
              <div>
                <label className="block text-gray-700 font-semibold mb-1 sm:mb-2 text-sm sm:text-base">หัวข้อ</label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full rounded-lg border border-school-200 bg-white px-4 py-2 text-gray-800 placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-school-200 focus:border-school-500 transition"
                  placeholder="พิมพ์หัวข้อข่าวประกาศ..."
                  required
                />
              </div>
              <div>
                <label className="block text-gray-700 font-semibold mb-1 sm:mb-2 text-sm sm:text-base">เนื้อหา</label>
                <textarea
                  value={formData.content}
                  onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                  className="w-full rounded-lg border border-school-200 bg-white px-4 py-2 text-gray-800 placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-school-200 focus:border-school-500 transition"
                  placeholder="พิมพ์เนื้อหาข่าวประกาศ..."
                  rows={5}
                  required
                />
              </div>
              <div>
                <label className="block text-gray-700 font-semibold mb-1 sm:mb-2 text-sm sm:text-base">ระดับความสำคัญ</label>
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
              <div>
                <label className="block text-gray-700 font-semibold mb-1 sm:mb-2 text-sm sm:text-base">📸 แนบรูปภาพประกอบ (ไม่บังคับ)</label>
                
                {!selectedFile && !formData.imageUrl ? (
                  <div className="grid grid-cols-2 gap-4">
                    <label className="border-2 border-dashed border-green-300 rounded-lg p-6 hover:bg-green-50 cursor-pointer transition text-center">
                      <input
                        type="file"
                        accept="image/jpeg,image/png,image/gif,image/webp"
                        onChange={handleFileSelect}
                        className="hidden"
                      />
                      <div className="flex flex-col items-center gap-2">
                        <svg className="w-12 h-12 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                        <div className="text-blue-600 font-semibold">ถ่ายรูป</div>
                        <div className="text-xs text-gray-600">เปิดกล้อง</div>
                      </div>
                    </label>
                    
                    <label className="border-2 border-dashed border-green-300 rounded-lg p-6 hover:bg-green-50 cursor-pointer transition text-center">
                      <input
                        type="file"
                        accept="image/jpeg,image/png,image/gif,image/webp"
                        onChange={handleFileSelect}
                        className="hidden"
                      />
                      <div className="flex flex-col items-center gap-2">
                        <svg className="w-12 h-12 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        <div className="text-green-600 font-semibold">เลือกรูปภาพ</div>
                        <div className="text-xs text-gray-600">จากแกลเลอรี่</div>
                      </div>
                    </label>
                  </div>
                ) : (
                  <div className="border-2 border-green-300 rounded-lg p-4">
                    <div className="flex items-start gap-3">
                      <img 
                        src={selectedFile ? URL.createObjectURL(selectedFile) : formData.imageUrl} 
                        alt="Preview" 
                        className="w-32 h-32 object-cover rounded"
                        onError={(e) => { (e.target as HTMLImageElement).src = '/placeholder.png'; }}
                      />
                      <div className="flex-1">
                        <p className="text-sm text-gray-700 font-semibold mb-1">
                          {selectedFile ? selectedFile.name : 'รูปภาพจาก URL'}
                        </p>
                        {selectedFile && (
                          <p className="text-xs text-gray-600">
                            {(selectedFile.size / 1024).toFixed(2)} KB
                          </p>
                        )}
                        <button
                          type="button"
                          onClick={handleRemoveImage}
                          className="mt-2 text-sm text-red-600 hover:text-red-700 font-semibold"
                        >
                          ลบรูปภาพ
                        </button>
                      </div>
                    </div>
                  </div>
                )}
                
                <p className="text-xs text-gray-600 mt-2">รองรับ JPG, PNG, GIF • สูงสุด 5MB</p>
              </div>
              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={uploading}
                  className="flex-1 bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded transition disabled:bg-gray-400 disabled:cursor-not-allowed"
                >
                  {uploading ? 'กำลังอัปโหลด...' : (editId ? 'บันทึกการแก้ไข' : 'เพิ่มข่าวประกาศ')}
                </button>
                {editId && (
                  <button
                    type="button"
                    onClick={() => {
                      setEditId(null);
                      setFormData({ title: '', content: '', priority: 'normal', imageUrl: '' });
                      setSelectedFile(null);
                    }}
                    className="px-4 bg-gray-400 hover:bg-gray-500 text-white font-bold rounded transition"
                  >
                    ยกเลิก
                  </button>
                )}
              </div>
            </form>
          </div>

          {/* รายการข่าวประกาศ */}
          <div className="bg-white p-4 sm:p-6 rounded-lg shadow-lg">
            <h2 className="text-lg sm:text-2xl font-semibold text-green-700 mb-4">รายการข่าวประกาศ ({announcements.length} รายการ)</h2>
            <div className="space-y-3 max-h-[600px] overflow-y-auto">
              {announcements.map((item) => (
                <div key={item.id} className="border-2 border-green-100 rounded-lg p-4 hover:bg-green-50 transition">
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="font-bold text-lg text-gray-800">{item.title}</h3>
                    {getPriorityBadge(item.priority)}
                  </div>
                  {item.image_url && (
                    <img 
                      src={item.image_url} 
                      alt={item.title} 
                      className="w-full max-h-48 object-cover rounded-lg mb-3 cursor-pointer hover:opacity-90 transition"
                      onClick={() => {
                        setSelectedImage(item.image_url!);
                        setImageModalOpen(true);
                      }}
                      onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                    />
                  )}
                  <p className="text-gray-800 font-medium mb-3">{item.content}</p>
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-gray-700 font-medium">
                      {new Date(item.created_at).toLocaleDateString('th-TH')}
                    </span>
                      <div className="flex gap-1 sm:gap-2">
                        <button
                          onClick={() => handleEdit(item)}
                          className="p-2 min-h-10 min-w-10 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors flex items-center justify-center"
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

      {/* Image Modal */}
      {imageModalOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-90 z-[100] flex items-center justify-center p-4"
          onClick={() => setImageModalOpen(false)}
        >
          <div className="relative max-w-7xl max-h-full">
            <button
              onClick={() => setImageModalOpen(false)}
              className="absolute -top-12 right-0 text-white hover:text-gray-300 transition"
            >
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            <img 
              src={selectedImage} 
              alt="รูปภาพขนาดเต็ม" 
              className="max-w-full max-h-[90vh] object-contain rounded-lg"
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        </div>
      )}
    </div>
  );
}
