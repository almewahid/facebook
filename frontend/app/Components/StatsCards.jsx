// frontend/app/components/StatsCards.jsx

'use client';

import { TrendingUp, Users, CheckCircle, Clock } from 'lucide-react';

export default function StatsCards({ stats }) {
  if (!stats) {
    return <div className="text-center py-4">جاري التحميل...</div>;
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
      {/* إجمالي المنشورات */}
      <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-600 mb-1">إجمالي المنشورات</p>
            <p className="text-3xl font-bold text-gray-900">{stats.total_posts || 0}</p>
          </div>
          <div className="bg-orange-100 p-3 rounded-lg">
            <Clock className="w-6 h-6 text-orange-600" />
          </div>
        </div>
      </div>

      {/* المجموعات النشطة */}
      <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-600 mb-1">المجموعات النشطة</p>
            <p className="text-3xl font-bold text-gray-900">{stats.active_groups || 0}</p>
          </div>
          <div className="bg-purple-100 p-3 rounded-lg">
            <Users className="w-6 h-6 text-purple-600" />
          </div>
        </div>
      </div>

      {/* المنشورات الناجحة */}
      <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-600 mb-1">المنشورات الناجحة</p>
            <p className="text-3xl font-bold text-gray-900">{stats.successful_posts || 0}</p>
          </div>
          <div className="bg-green-100 p-3 rounded-lg">
            <CheckCircle className="w-6 h-6 text-green-600" />
          </div>
        </div>
      </div>

      {/* معدل النجاح */}
      <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-600 mb-1">معدل النجاح</p>
            <p className="text-3xl font-bold text-gray-900">{stats.success_rate || 0}%</p>
          </div>
          <div className="bg-blue-100 p-3 rounded-lg">
            <TrendingUp className="w-6 h-6 text-blue-600" />
          </div>
        </div>
      </div>
    </div>
  );
}