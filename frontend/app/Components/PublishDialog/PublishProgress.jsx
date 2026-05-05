'use client';

import { Loader2 } from 'lucide-react';

export default function PublishProgress({ progress, results, onForceFinish }) {
  const actualSuccess = results.length
    ? results.filter(r => r.status === 'success').length
    : (progress?.success_count || 0);
  const actualFailed = results.length
    ? results.filter(r => r.status === 'failed').length
    : (progress?.failed_count || 0);
  const totalProcessed = actualSuccess + actualFailed;
  const progressPct = progress?.progress_percent ||
    (progress?.total_groups
      ? Math.min(100, Math.round((totalProcessed / progress.total_groups) * 100))
      : 0);

  return (
    <>
      {/* Body */}
      <div className="flex-1 overflow-y-auto">
        <div className="p-8 flex flex-col items-center text-center space-y-6">
          <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center">
            <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-gray-900 mb-1">جاري النشر...</h3>
            <p className="text-sm text-gray-500">يتم النشر في المجموعات تلقائياً</p>
          </div>

          {/* شريط التقدم */}
          <div className="w-full space-y-2">
            <div className="flex justify-between text-xs text-gray-500">
              <span>{Math.round(progressPct)}%</span>
              <span>{actualSuccess + actualFailed} / {progress?.total_groups || 0} مجموعة</span>
            </div>
            <div className="w-full bg-gray-100 rounded-full h-2.5 overflow-hidden">
              <div
                className="h-full bg-blue-500 rounded-full transition-all duration-500"
                style={{ width: `${progressPct}%` }}
              />
            </div>
          </div>

          {/* إحصائيات */}
          <div className="flex gap-4 w-full">
            <div className="flex-1 p-3 bg-green-50 rounded-xl text-center">
              <div className="text-xl font-bold text-green-600">{actualSuccess}</div>
              <div className="text-xs text-gray-500 mt-0.5">نجح</div>
            </div>
            <div className="flex-1 p-3 bg-red-50 rounded-xl text-center">
              <div className="text-xl font-bold text-red-500">{actualFailed}</div>
              <div className="text-xs text-gray-500 mt-0.5">فشل</div>
            </div>
            <div className="flex-1 p-3 bg-gray-50 rounded-xl text-center">
              <div className="text-xl font-bold text-gray-700">{progress?.total_groups || 0}</div>
              <div className="text-xs text-gray-500 mt-0.5">إجمالي</div>
            </div>
          </div>

          <button
            onClick={onForceFinish}
            className="text-xs text-gray-400 underline hover:text-gray-600"
          >
            انتهى النشر؟ اضغط هنا لإغلاق شاشة التحميل
          </button>
        </div>
      </div>

      {/* Footer */}
      <div className="px-6 py-4 border-t border-gray-100">
        <div className="py-2.5 text-sm text-center text-gray-400">
          يُرجى الانتظار حتى اكتمال النشر...
        </div>
      </div>
    </>
  );
}
