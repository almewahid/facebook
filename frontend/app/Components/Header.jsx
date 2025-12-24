// frontend/app/components/Header.jsx

'use client';

import { Activity } from 'lucide-react';

export default function Header({ 
  onLogout, 
  onSettings, 
  onStartBot, 
  onStopBot, 
  botStatus 
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
            <button onClick={onLogout} className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg flex items-center space-x-2 space-x-reverse transition">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
              <span>تسجيل الخروج</span>
            </button>
            
            <button onClick={onSettings} className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition">
              ⚙️ الإعدادات
            </button>
            
            {botStatus?.is_running ? (
              <button onClick={onStopBot} className="px-6 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg flex items-center space-x-2 space-x-reverse transition">
                <span>⏸️</span>
                <span>إيقاف البوت</span>
              </button>
            ) : (
              <button onClick={onStartBot} className="px-6 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg flex items-center space-x-2 space-x-reverse transition animate-pulse">
                <span>▶️</span>
                <span>تشغيل البوت</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}