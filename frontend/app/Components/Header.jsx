// frontend/app/components/Header.jsx

'use client';

import { Activity, Users, LayoutDashboard } from 'lucide-react';

export default function Header({ 
  onLogout, 
  onSettings, 
  onStartBot, 
  onStopBot, 
  botStatus,
  currentView, // حالة العرض الحالية
  setView      // دالة تغيير العرض
}) {
  return (
    <header className="bg-white shadow-sm border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3 space-x-reverse">
            <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-2 rounded-lg">
              <Activity className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Facebook Auto Poster</h1>
              <p className="text-sm text-gray-500">لوحة تحكم البوت الذكي</p>
            </div>
          </div>
          
          <div className="flex items-center space-x-3 space-x-reverse">
            {/* زر التبديل بين اللوحة وإدارة المجموعات */}
            {currentView === 'dashboard' ? (
              <button 
                onClick={() => setView('groups')} 
                className="px-4 py-2 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded-lg flex items-center gap-2 transition font-medium"
              >
                <Users className="w-4 h-4" />
                <span>إدارة المجموعات</span>
              </button>
            ) : (
              <button 
                onClick={() => setView('dashboard')} 
                className="px-4 py-2 bg-indigo-50 text-indigo-600 hover:bg-indigo-100 rounded-lg flex items-center gap-2 transition font-medium"
              >
                <LayoutDashboard className="w-4 h-4" />
                <span>لوحة التحكم</span>
              </button>
            )}

            <button onClick={onSettings} className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition">
              ⚙️
            </button>

            {botStatus?.is_running ? (
              <button onClick={onStopBot} className="px-4 py-2 bg-red-600 text-white rounded-lg transition">
                ⏸️ إيقاف
              </button>
            ) : (
              <button onClick={onStartBot} className="px-4 py-2 bg-green-600 text-white rounded-lg transition">
                ▶️ تشغيل
              </button>
            )}
            
            <button onClick={onLogout} className="p-2 text-gray-400 hover:text-red-500 transition">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}