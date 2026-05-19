'use client';

import { useState } from 'react';

const TEMPLATE_BASE64 = "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";

function downloadTemplate() {
  void TEMPLATE_BASE64;
  const a = document.createElement('a');
  a.href = '/templates/نموذج_المجموعات.xlsx';
  a.download = 'نموذج_المجموعات.xlsx';
  a.click();
}

export default function AddGroupDialog({
  show,
  onClose,
  newGroup,
  setNewGroup,
  onSubmit,
  onImportClick,
  categories = []
}) {
  const [customCategory, setCustomCategory] = useState('');

  if (!show) return null;

  const allCategories = ['عام', ...categories.filter(c => c !== 'عام')];

  const handleSave = () => {
    if (!newGroup.name?.trim()) {
      alert('الرجاء إدخال اسم المجموعة');
      return;
    }
    const finalCategory = newGroup.category === 'custom'
      ? (customCategory.trim() || 'قائمة جديدة')
      : (newGroup.category || 'عام');
    onSubmit({ ...newGroup, category: finalCategory });
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
        <div className="p-6">
          <h3 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2 border-b pb-4">
            ✨ إضافة مجموعة جديدة
          </h3>

          <div className="space-y-5">
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1">
                اسم المجموعة <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                value={newGroup.name || ''}
                onChange={(e) => setNewGroup({ ...newGroup, name: e.target.value })}
                placeholder="مثال: محبي القرآن الكريم"
              />
            </div>

            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1">
                القائمة / التصنيف
              </label>
              <select
                className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none bg-white cursor-pointer"
                value={newGroup.category || 'عام'}
                onChange={(e) => {
                  setNewGroup({ ...newGroup, category: e.target.value });
                  if (e.target.value !== 'custom') setCustomCategory('');
                }}
              >
                {allCategories.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
                <option value="custom" className="text-blue-600 font-bold">+ قائمة جديدة...</option>
              </select>
            </div>

            {newGroup.category === 'custom' && (
              <div className="animate-in slide-in-from-top-2 duration-200">
                <label className="block text-xs font-bold text-blue-600 mb-1 mr-1">
                  اكتب اسم القائمة الجديدة:
                </label>
                <input
                  type="text"
                  className="w-full px-4 py-2 border border-blue-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none bg-blue-50"
                  placeholder="مثال: تجربة، عملاء، إلخ..."
                  value={customCategory}
                  onChange={(e) => setCustomCategory(e.target.value)}
                  autoFocus
                />
              </div>
            )}

            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1">
                رابط المجموعة <span className="text-gray-400 font-normal">(اختياري)</span>
              </label>
              <input
                type="text"
                className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                value={newGroup.url || ''}
                onChange={(e) => setNewGroup({ ...newGroup, url: e.target.value })}
                placeholder="https://facebook.com/groups/..."
              />
              <p className="text-[10px] text-gray-400 mt-1 pr-1">
                💡 إذا تركته فارغاً، سيبحث البوت عن المجموعة بالاسم تلقائياً.
              </p>
            </div>

            <div className="flex items-center gap-2 bg-gray-50 p-3 rounded-xl border border-gray-100">
              <input
                type="checkbox"
                id="active-check"
                checked={newGroup.is_active ?? true}
                onChange={(e) => setNewGroup({ ...newGroup, is_active: e.target.checked })}
                className="w-5 h-5 text-blue-600 rounded cursor-pointer"
              />
              <label htmlFor="active-check" className="text-sm font-medium text-gray-700 cursor-pointer select-none">
                مجموعة نشطة (سيتم النشر فيها تلقائياً)
              </label>
            </div>

            <div className="grid grid-cols-1 gap-2 rounded-xl border border-green-100 bg-green-50 p-3">
              <button
                type="button"
                onClick={downloadTemplate}
                className="w-full flex items-center justify-center gap-2 py-2 px-4 border border-green-300 text-green-700 bg-white rounded-xl hover:bg-green-100 transition-all text-sm font-medium"
              >
                📥 تنزيل نموذج_المجموعات.xlsx
              </button>
              {onImportClick && (
                <button
                  type="button"
                  onClick={onImportClick}
                  className="w-full flex items-center justify-center gap-2 py-2 px-4 border border-blue-200 text-blue-700 bg-white rounded-xl hover:bg-blue-50 transition-all text-sm font-medium"
                >
                  استيراد ملف Excel / CSV
                </button>
              )}
            </div>
          </div>

          <div className="mt-8 flex gap-3">
            <button
              onClick={handleSave}
              className="flex-1 bg-blue-600 text-white font-bold py-3 rounded-xl hover:bg-blue-700 transition-all shadow-lg shadow-blue-200 active:scale-95"
            >
              حفظ المجموعة
            </button>
            <button
              onClick={onClose}
              className="px-6 py-3 bg-gray-100 text-gray-600 font-medium rounded-xl hover:bg-gray-200 transition-all active:scale-95"
            >
              إلغاء
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
