'use client';

import { CheckCircle, XCircle, ExternalLink } from 'lucide-react';

export default function PublishResults({ progress, results, postId, onClose }) {
  const actualSuccess = results.length
    ? results.filter(r => r.status === 'success').length
    : (progress?.success_count || 0);
  const actualFailed = results.length
    ? results.filter(r => r.status === 'failed').length
    : (progress?.failed_count || 0);
  const totalProcessed = actualSuccess + actualFailed;
  const successRate = progress?.total_groups
    ? Math.round((actualSuccess / progress.total_groups) * 100)
    : 0;

  return (
    <>
      {/* Body */}
      <div className="flex-1 overflow-y-auto">
        <div className="p-6 space-y-5">

          {/* ملخص */}
          <div className="flex flex-col items-center text-center space-y-3">
            <div className={`w-14 h-14 rounded-full flex items-center justify-center ${
              progress?.failed_count === 0 ? 'bg-green-100' : 'bg-yellow-100'
            }`}>
              <CheckCircle className={`w-7 h-7 ${
                progress?.failed_count === 0 ? 'text-green-600' : 'text-yellow-500'
              }`} />
            </div>
            <div>
              <h3 className="text-lg font-bold text-gray-900">
                {progress?.failed_count === 0 ? '✅ تم النشر بنجاح!' : '⚠️ اكتمل النشر مع بعض الأخطاء'}
              </h3>
              <p className="text-sm text-gray-500">رقم المنشور: #{postId}</p>
            </div>
          </div>

          {/* الأرقام */}
          <div className="flex gap-3">
            <div className="flex-1 p-3 bg-green-50 rounded-xl text-center">
              <div className="text-2xl font-bold text-green-600">{actualSuccess}</div>
              <div className="text-xs text-gray-500 mt-0.5">نجح</div>
            </div>
            <div className="flex-1 p-3 bg-red-50 rounded-xl text-center">
              <div className="text-2xl font-bold text-red-500">{actualFailed}</div>
              <div className="text-xs text-gray-500 mt-0.5">فشل</div>
            </div>
            <div className="flex-1 p-3 bg-gray-50 rounded-xl text-center">
              <div className="text-2xl font-bold text-gray-700">
                {progress?.total_groups || totalProcessed}
              </div>
              <div className="text-xs text-gray-500 mt-0.5">إجمالي</div>
            </div>
          </div>

          {/* شريط النجاح */}
          <div>
            <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
              <div className="h-full bg-green-500 rounded-full" style={{ width: `${successRate}%` }} />
            </div>
            <p className="text-xs text-gray-400 text-center mt-1">معدل النجاح: {successRate}%</p>
          </div>

          {/* جدول التفاصيل */}
          {results.length > 0 && (
            <div>
              <h4 className="text-sm font-semibold text-gray-700 mb-2">تفاصيل المجموعات:</h4>
              <div className="border border-gray-100 rounded-xl overflow-hidden">
                <div className="max-h-52 overflow-y-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 sticky top-0">
                      <tr>
                        <th className="text-right px-3 py-2 text-xs text-gray-500 font-medium">المجموعة</th>
                        <th className="text-center px-3 py-2 text-xs text-gray-500 font-medium">الحالة</th>
                        <th className="text-center px-3 py-2 text-xs text-gray-500 font-medium">المنشور</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {results.map((r, i) => (
                        <tr key={i} className="hover:bg-gray-50">
                          <td className="px-3 py-2 text-gray-800 font-medium truncate max-w-[160px]">
                            {r.group_name || r.group_id}
                          </td>
                          <td className="px-3 py-2 text-center">
                            {r.status === 'success' ? (
                              <span className="inline-flex items-center gap-1 text-green-600 text-xs bg-green-50 px-2 py-0.5 rounded-full">
                                <CheckCircle className="w-3 h-3" /> نجح
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-red-500 text-xs bg-red-50 px-2 py-0.5 rounded-full">
                                <XCircle className="w-3 h-3" /> فشل
                              </span>
                            )}
                          </td>
                          <td className="px-3 py-2 text-center">
                            {r.post_url ? (
                              <a
                                href={r.post_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-800 text-xs"
                              >
                                <ExternalLink className="w-3 h-3" /> فتح
                              </a>
                            ) : (
                              <span className="text-gray-300 text-xs">-</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {results.length === 0 && (
            <p className="text-xs text-gray-400 text-center">
              💡 لعرض روابط المنشورات، تأكد أن الـ API يُرجع حقل <code>results</code> في status endpoint
            </p>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="px-6 py-4 border-t border-gray-100">
        <button
          onClick={onClose}
          className="w-full py-2.5 text-sm font-semibold text-white bg-blue-600 rounded-xl hover:bg-blue-700"
        >
          إغلاق
        </button>
      </div>
    </>
  );
}
