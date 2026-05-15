'use client';

import { Bell, Settings, Square } from 'lucide-react';

export default function Header({ onSettings, onStopBot, botStatus, groupActionsMenu }) {
  const isRunning = botStatus?.is_running;
  return (
    <header className="sticky top-0 z-30 bg-white border-b border-gray-100 px-6 py-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className={`w-2 h-2 rounded-full flex-shrink-0 ${isRunning ? 'bg-green-500 animate-pulse' : 'bg-gray-300'}`} />
          <span className="text-xs text-gray-500 font-medium">
            {isRunning ? 'النشر التلقائي يعمل الآن' : 'البوت متوقف'}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {groupActionsMenu}
          {isRunning && (
            <button onClick={onStopBot} className="flex items-center gap-1.5 px-3 py-1.5 bg-red-50 text-red-600 hover:bg-red-100 rounded-lg text-xs font-medium border border-red-100 transition-all">
              <Square className="w-3 h-3 fill-current" /> إيقاف
            </button>
          )}
          <button className="relative p-1.5 text-gray-400 hover:bg-gray-50 rounded-lg border border-gray-100 transition-colors">
            <Bell className="w-4 h-4" />
            <span className="absolute top-0.5 right-0.5 w-1.5 h-1.5 bg-blue-500 rounded-full" />
          </button>
          <button onClick={onSettings} className="p-1.5 text-gray-400 hover:bg-gray-50 rounded-lg border border-gray-100 transition-colors">
            <Settings className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
}
