// frontend/app/components/QuickActions.jsx

'use client';

import { Plus, Calendar, BarChart3, Brain } from 'lucide-react';
import ActionCard from './ActionCard';

export default function QuickActions({ 
  onAddGroup, 
  onBulkAdd, 
  onImport,
  onSchedule, 
  onReport 
}) {
  return (
    <div className="mb-8">
      <h2 className="text-xl font-bold text-gray-900 mb-4">🚀 إجراءات سريعة</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <ActionCard
          icon={<Plus className="w-5 h-5" />}
          title="إضافة مجموعة"
          description="مجموعة واحدة"
          color="blue"
          onClick={onAddGroup}
        />
        
        <ActionCard
          icon={<span className="text-2xl">📥</span>}
          title="استيراد مجموعات"
          description="من CSV أو Excel"
          color="green"
          onClick={onImport}
        />
        
        <ActionCard
          icon={<span className="text-2xl">📝</span>}
          title="إضافة جماعية"
          description="عدة مجموعات دفعة واحدة"
          color="purple"
          onClick={onBulkAdd}
        />
        
        <ActionCard
          icon={<Calendar className="w-5 h-5" />}
          title="الجدولة الذكية"
          description="توقيت تلقائي + أيام راحة"
          color="indigo"
          onClick={onSchedule}
        />
        
        <ActionCard
          icon={<BarChart3 className="w-5 h-5" />}
          title="تقرير مفصل"
          description="المنشورات المفصلة + تحليل"
          color="orange"
          onClick={onReport}
        />
        
        <ActionCard
          icon={<Brain className="w-5 h-5" />}
          title="وضع ذكي"
          description="نشر مخصص + تحليل"
          color="red"
          onClick={() => alert('قريباً!')}
        />
      </div>
    </div>
  );
}
