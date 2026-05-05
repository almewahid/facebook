// frontend/app/components/QuickActions.jsx

'use client';

import {
  Plus,
  Calendar,
  BarChart3,
  Brain,
  FileUp,
  Layers,
  Send
} from 'lucide-react';
import ActionCard from './ActionCard';

export default function QuickActions({
  onAddGroup,
  onBulkAdd,
  onImport,
  onSchedule,
  onReport,
  onPublish,
  onSmartMode
}) {
  return (
    <div className="mb-8">
      <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
        <span>🚀</span> إجراءات سريعة
      </h2>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* إضافة مجموعة مفردة */}
        <ActionCard
          icon={<Plus className="w-5 h-5" />}
          title="إضافة مجموعة"
          description="إضافة مجموعة واحدة يدوياً"
          color="blue"
          onClick={onAddGroup}
        />

        {/* استيراد ملفات */}
        <ActionCard
          icon={<FileUp className="w-5 h-5" />}
          title="استيراد مجموعات"
          description="من ملفات CSV أو Excel"
          color="green"
          onClick={onImport}
        />

        {/* إضافة جماعية نصية */}
        <ActionCard
          icon={<Layers className="w-5 h-5" />}
          title="إضافة جماعية"
          description="لصق عدة أسماء دفعة واحدة"
          color="purple"
          onClick={onBulkAdd}
        />

        {/* الجدولة الذكية */}
        <ActionCard
          icon={<Calendar className="w-5 h-5" />}
          title="الجدولة الذكية"
          description="توقيت تلقائي وأيام الراحة"
          color="indigo"
          onClick={onSchedule}
        />

        {/* النشر الفوري المطور */}
        <ActionCard
          icon={<Send className="w-5 h-5" />}
          title="نشر فوري"
          description="إرسال منشور للمجموعات الآن"
          color="pink"
          onClick={onPublish}
        />

        {/* الوضع الذكي (Gemini AI) */}
        <ActionCard
          icon={<Brain className="w-5 h-5" />}
          title="الوضع الذكي"
          description="تحليل 76 منشوراً وتوليد محتوى"
          color="red"
          onClick={onSmartMode}
        />

        {/* التقارير التحليلية */}
        <ActionCard
          icon={<BarChart3 className="w-5 h-5" />}
          title="تقارير الأداء"
          description="تحليل النتائج ومعدلات النجاح"
          color="orange"
          onClick={onReport}
        />
      </div>
    </div>
  );
}