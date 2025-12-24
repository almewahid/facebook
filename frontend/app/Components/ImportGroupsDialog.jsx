// frontend/app/components/ImportGroupsDialog.jsx

'use client';

import Modal from './Modal';

export default function ImportGroupsDialog({
  show,
  onClose,
  importFile,
  setImportFile,
  onImport,
  importResult,
  setImportResult,
  onDownloadTemplate
}) {
  if (!show) return null;

  return (
    <Modal
      title="استيراد مجموعات"
      onClose={() => {
        onClose();
        setImportResult(null);
      }}
      size="large"
    >
      {!importResult ? (
        <div className="space-y-6">
          {/* رفع الملف */}
          <div>
            <p className="text-gray-600 mb-4">
              قم برفع ملف CSV أو Excel يحتوي على المجموعات
            </p>
            
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-blue-400 transition">
              <input
                type="file"
                accept=".csv,.xlsx,.xls"
                onChange={(e) => setImportFile(e.target.files[0])}
                className="hidden"
                id="import-file"
              />
              <label
                htmlFor="import-file"
                className="cursor-pointer text-blue-600 hover:text-blue-800 text-lg"
              >
                📁 اختر ملف CSV أو Excel
              </label>
              
              {importFile && (
                <p className="mt-4 text-green-600 font-medium">
                  ✅ تم اختيار: {importFile.name}
                </p>
              )}
            </div>
          </div>
          
          {/* معلومات الصيغة */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h3 className="font-bold mb-2 text-blue-900">📋 صيغة الملف:</h3>
            <ul className="list-disc list-inside text-sm text-gray-700 space-y-1">
              <li><strong>name</strong>: اسم المجموعة (إجباري)</li>
              <li><strong>url</strong>: رابط المجموعة (اختياري)</li>
              <li><strong>is_active</strong>: نشط؟ (اختياري، افتراضي true)</li>
            </ul>
            
            <div className="mt-4 bg-white rounded p-3 font-mono text-xs overflow-x-auto">
              <div className="text-gray-500">name,url,is_active</div>
              <div>سوق الكويت,https://facebook.com/groups/...,true</div>
              <div>وظائف الكويت,,true</div>
            </div>
          </div>
          
          {/* الأزرار */}
          <div className="flex gap-4">
            <button
              onClick={onImport}
              disabled={!importFile}
              className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
            >
              📥 استيراد
            </button>
            
            <button
              onClick={onDownloadTemplate}
              className="flex-1 px-6 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition"
            >
              📄 تحميل قالب
            </button>
          </div>
        </div>
      ) : (
        <div>
          <h3 className="text-xl font-bold mb-4">📊 نتيجة الاستيراد</h3>
          
          <div className="grid grid-cols-3 gap-4 mb-4">
            <div className="bg-green-100 rounded-lg p-4 text-center">
              <div className="text-3xl font-bold text-green-600">
                {importResult.added}
              </div>
              <div className="text-sm text-gray-600">تمت الإضافة</div>
            </div>
            
            <div className="bg-yellow-100 rounded-lg p-4 text-center">
              <div className="text-3xl font-bold text-yellow-600">
                {importResult.skipped}
              </div>
              <div className="text-sm text-gray-600">تم التخطي</div>
            </div>
            
            <div className="bg-blue-100 rounded-lg p-4 text-center">
              <div className="text-3xl font-bold text-blue-600">
                {importResult.total}
              </div>
              <div className="text-sm text-gray-600">الإجمالي</div>
            </div>
          </div>
          
          {importResult.errors && importResult.errors.length > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <h4 className="font-bold text-red-600 mb-2">⚠️ أخطاء:</h4>
              <ul className="list-disc list-inside text-sm text-red-700 space-y-1 max-h-40 overflow-y-auto">
                {importResult.errors.map((error, idx) => (
                  <li key={idx}>{error}</li>
                ))}
              </ul>
            </div>
          )}
          
          <button
            onClick={() => {
              onClose();
              setImportResult(null);
              setImportFile(null);
            }}
            className="w-full mt-6 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
          >
            تم
          </button>
        </div>
      )}
    </Modal>
  );
}