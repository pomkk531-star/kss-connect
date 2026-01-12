'use client';

import { useEffect, useState } from 'react';

interface Announcement {
  id: number;
  title: string;
  content: string;
  priority: 'low' | 'normal' | 'high';
  image_url?: string;
  created_at: string;
}

export default function AnnouncementPopup() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [hasNew, setHasNew] = useState(false);
  const [imageModalOpen, setImageModalOpen] = useState(false);
  const [selectedImage, setSelectedImage] = useState('');

  useEffect(() => {
    loadAnnouncements();
    const interval = setInterval(loadAnnouncements, 60000);
    return () => clearInterval(interval);
  }, []);

  const loadAnnouncements = async () => {
    try {
      const res = await fetch('/api/admin/announcements');
      const data = await res.json();
      if (data.ok && data.announcements) {
        const sorted = data.announcements.sort((a: Announcement, b: Announcement) => {
          const priorityOrder = { high: 3, normal: 2, low: 1 };
          if (priorityOrder[a.priority] !== priorityOrder[b.priority]) {
            return priorityOrder[b.priority] - priorityOrder[a.priority];
          }
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        });
        
        if (sorted.length > announcements.length) {
          setHasNew(true);
        }
        
        setAnnouncements(sorted);
      }
    } catch (err) {
      console.error('Failed to load announcements', err);
    }
  };

  const handleToggle = () => {
    setIsOpen(!isOpen);
    if (!isOpen) {
      setHasNew(false);
      setCurrentIndex(0);
    }
  };

  const handleNext = () => {
    if (currentIndex < announcements.length - 1) {
      setCurrentIndex(currentIndex + 1);
    }
  };

  const handlePrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    }
  };

  if (announcements.length === 0) {
    return null;
  }

  const current = announcements[currentIndex];
  const priorityColors = {
    high: 'from-red-500 to-red-600',
    normal: 'from-green-500 to-green-600',
    low: 'from-blue-500 to-blue-600',
  };

  const priorityLabels = {
    high: '🔴 สำคัญมาก',
    normal: '📢 ประกาศทั่วไป',
    low: '💬 ข่าวสาร',
  };

  return (
    <>
      {/* Floating Button */}
      <button
        onClick={handleToggle}
        className="fixed bottom-6 right-6 z-50 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white rounded-full w-16 h-16 shadow-2xl transition-all duration-300 hover:scale-110 flex items-center justify-center"
      >
        {hasNew && !isOpen && (
          <span className="absolute -top-1 -right-1 flex h-4 w-4">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-4 w-4 bg-red-500"></span>
          </span>
        )}
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          {isOpen ? (
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          ) : (
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" />
          )}
        </svg>
        <span className="absolute -top-2 -left-2 bg-white text-green-600 text-xs font-bold rounded-full w-6 h-6 flex items-center justify-center border-2 border-green-600">
          {announcements.length}
        </span>
      </button>

      {/* Popup */}
      {isOpen && (
        <div className="fixed bottom-24 right-6 z-40 w-96 max-w-[calc(100vw-3rem)]">
          <div className="bg-white rounded-2xl shadow-2xl overflow-hidden animate-in slide-in-from-bottom-4 duration-300">
            {/* Header */}
            <div className={`bg-gradient-to-r ${priorityColors[current.priority]} text-white px-5 py-4`}>
              <div className="flex items-center justify-between">
                <span className="text-sm font-bold">{priorityLabels[current.priority]}</span>
                <button
                  onClick={handleToggle}
                  className="text-white hover:bg-white hover:bg-opacity-20 rounded-full p-1 transition"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="px-5 py-4 max-h-80 overflow-y-auto">
              <h3 className="text-lg font-bold text-gray-800 mb-3">{current.title}</h3>
              {current.image_url && (
                <img 
                  src={current.image_url} 
                  alt={current.title} 
                  className="w-full max-h-48 object-cover rounded-lg mb-3 cursor-pointer hover:opacity-90 transition"
                  onClick={() => {
                    setSelectedImage(current.image_url!);
                    setImageModalOpen(true);
                  }}
                  onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                />
              )}
              <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed mb-3">
                {current.content}
              </p>
              <p className="text-xs text-gray-400">
                {new Date(current.created_at).toLocaleString('th-TH', {
                  dateStyle: 'medium',
                  timeStyle: 'short',
                })}
              </p>
            </div>

            {/* Navigation */}
            {announcements.length > 1 && (
              <div className="border-t border-gray-200 px-5 py-3 bg-gray-50 flex items-center justify-between">
                <button
                  onClick={handlePrev}
                  disabled={currentIndex === 0}
                  className="text-green-600 hover:text-green-700 disabled:text-gray-400 disabled:cursor-not-allowed transition p-1"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
                
                <span className="text-xs text-gray-600 font-medium">
                  {currentIndex + 1} / {announcements.length}
                </span>
                
                <button
                  onClick={handleNext}
                  disabled={currentIndex === announcements.length - 1}
                  className="text-green-600 hover:text-green-700 disabled:text-gray-400 disabled:cursor-not-allowed transition p-1"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </div>
            )}
          </div>
        </div>
      )}

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
    </>
  );
}
