// frontend/app/components/Header.jsx

'use client';

import { Activity, Users, LayoutDashboard, Settings, LogOut, Play, Square } from 'lucide-react';

export default function Header({
  onLogout,
  onSettings,
  onStartBot,
  onStopBot,
  botStatus,
  currentView,
  setView
}) {
  return (
    <header className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <div className="flex items-center justify-between">

          {/* Logo & Title */}
          <div className="flex items-center space-x-3 space-x-reverse">
            <div className="bg-gradient-to-br from-blue-600 to-indigo-700 p-2.5 rounded-xl shadow-lg shadow-blue-100">
              <Activity className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-black text-gray-900 tracking-tight">Facebook Auto Poster</h1>
              <div className="flex items-center gap-2">
                <span className={`w-2 h-2 rounded-full ${botStatus?.is_running ? 'bg-green-500 animate-pulse' : 'bg-gray-300'}`}></span>
                <p className="text-xs font-medium text-gray-500">
                  {botStatus?.is_running ? 'البوت قيد التشغيل' : 'البوت متوقف حالياً'}
                </p>
              </div>
            </div>
          </div>

          {/* Navigation & Controls */}
          <div className="flex items-center space-x-2 space-x-reverse">

            {/* View Switcher Button */}
            {setView && (
              currentView === 'dashboard' ? (
                <button
                  onClick={() => setView('groups')}
                  className="px-4 py-2 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded-xl flex items-center gap-2 transition-all font-bold text-sm border border-blue-100"
                >
                  <Users className="w-4 h-4" />
                  <span>إدارة المجموعات</span>
                </button>
              ) : (
                <button
                  onClick={() => setView('dashboard')}
                  className="px-4 py-2 bg-indigo-50 text-indigo-600 hover:bg-indigo-100 rounded-xl flex items-center gap-2 transition-all font-bold text-sm border border-indigo-100"
                >
                  <LayoutDashboard className="w-4 h-4" />
                  <span>لوحة التحكم</span>
                </button>
              )
            )}

            <div className="w-px h-6 bg-gray-200 mx-2"></div>

            {/* Bot Controls */}
            {botStatus?.is_running ? (
              <button
                onClick={onStopBot}
                className="group px-4 py-2 bg-red-50 text-red-600 hover:bg-red-600 hover:text-white rounded-xl transition-all flex items-center gap-2 font-bold text-sm border border-red-100"
              >
                <Square className="w-4 h-4 fill-current" />
                <span>إيقاف البوت</span>
              </button>
            ) : (
              <button
                onClick={onStartBot}
                className="group px-4 py-2 bg-green-50 text-green-600 hover:bg-green-600 hover:text-white rounded-xl transition-all flex items-center gap-2 font-bold text-sm border border-green-100"
              >
                <Play className="w-4 h-4 fill-current" />
                <span>تشغيل البوت</span>
              </button>
            )}

            <button
              onClick={onSettings}
              className="p-2 text-gray-500 hover:bg-gray-100 rounded-xl transition-colors border border-transparent hover:border-gray-200"
              title="الإعدادات"
            >
              <Settings className="w-5 h-5" />
            </button>

            <button
              onClick={onLogout}
              className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-colors"
              title="تسجيل الخروج"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}