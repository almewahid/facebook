'use client';

import { LayoutDashboard, Users, FileText, BarChart2, Calendar, Settings, LogOut, Facebook, LogIn, ShieldCheck, SlidersHorizontal, CreditCard } from 'lucide-react';

const navItems = [
  { icon: LayoutDashboard, label: 'الرئيسية',  view: 'dashboard' },
  { icon: Users,           label: 'المجموعات', view: 'groups'    },
  { icon: FileText,        label: 'المنشورات', view: 'posts'     },
  { icon: BarChart2,       label: 'التقارير',  view: 'reports'   },
  { icon: Calendar,        label: 'الجدولة',   view: 'schedule'  },
  { icon: Settings,        label: 'الإعدادات', view: 'settings'  },
];

export default function Sidebar({ currentView, setView, onLogout, onLogin, user, isLoggedIn = false, isAdmin = false }) {
  const displayName = user?.full_name || user?.email || 'مستخدم';

  return (
    <aside className="fixed top-0 right-0 h-screen w-60 bg-white border-l border-gray-100 flex flex-col z-40">
      {/* لوجو */}
      <div className="flex items-center gap-3 px-4 py-4 border-b border-gray-100">
        <div className="bg-[#1877F2] p-2 rounded-xl flex-shrink-0">
          <Facebook className="w-5 h-5 text-white" />
        </div>
        <div>
          <p className="font-bold text-gray-900 text-xs leading-tight">Facebook Auto Poster</p>
          <p className="text-[10px] text-gray-400 mt-0.5">لوحة التحكم</p>
        </div>
      </div>

      {/* تنقل */}
      <nav className="flex-1 px-3 py-3 space-y-0.5">
        {navItems.map(({ icon: Icon, label, view }) => {
          const active = currentView === view;
          return (
            <button
              key={view}
              onClick={() => setView(view)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-medium transition-all text-right ${
                active
                  ? 'bg-blue-50 text-blue-700'
                  : 'text-gray-500 hover:bg-gray-50 hover:text-gray-800'
              }`}
            >
              <Icon className={`w-4 h-4 flex-shrink-0 ${active ? 'text-blue-600' : 'text-gray-400'}`} />
              {label}
              {active && <span className="mr-auto w-1.5 h-1.5 rounded-full bg-blue-500" />}
            </button>
          );
        })}
        {isAdmin && (
          <div className="mt-3 border-t border-gray-100 pt-3">
            <div className="mb-2 flex items-center gap-2 px-3 text-[10px] font-bold text-gray-400">
              <ShieldCheck className="h-3.5 w-3.5" />
              الإدارة
            </div>
            {[
              { icon: SlidersHorizontal, label: 'صفحة التحكم', view: 'admin-control' },
              { icon: CreditCard, label: 'طلبات الاشتراك', view: 'admin' },
            ].map(({ icon: Icon, label, view }) => {
              const active = currentView === view;
              return (
                <button
                  key={view}
                  onClick={() => setView(view)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-medium transition-all text-right ${
                    active
                      ? 'bg-slate-100 text-slate-900'
                      : 'text-gray-500 hover:bg-gray-50 hover:text-gray-800'
                  }`}
                >
                  <Icon className={`w-4 h-4 flex-shrink-0 ${active ? 'text-slate-800' : 'text-gray-400'}`} />
                  {label}
                  {active && <span className="mr-auto w-1.5 h-1.5 rounded-full bg-slate-700" />}
                </button>
              );
            })}
          </div>
        )}
      </nav>

      {/* دخول / خروج */}
      <div className="px-3 py-3 border-t border-gray-100">
        {isLoggedIn && (
          <div className="mb-2 rounded-xl bg-gray-50 px-3 py-2 text-right">
            <p className="truncate text-xs font-bold text-gray-700">{displayName}</p>
            {user?.full_name && <p className="mt-0.5 truncate text-[10px] text-gray-400">{user.email}</p>}
          </div>
        )}
        <button
          onClick={isLoggedIn ? onLogout : onLogin}
          className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-medium transition-all text-right ${
            isLoggedIn
              ? 'text-gray-400 hover:bg-red-50 hover:text-red-500'
              : 'text-blue-600 hover:bg-blue-50'
          }`}
        >
          {isLoggedIn ? <LogOut className="w-4 h-4 flex-shrink-0" /> : <LogIn className="w-4 h-4 flex-shrink-0" />}
          {isLoggedIn ? 'تسجيل الخروج' : 'تسجيل الدخول'}
        </button>
      </div>
    </aside>
  );
}
