'use client';

import { useState } from 'react';

export default function AddGroupDialog({
  show,
  onClose,
  newGroup,
  setNewGroup,
  onSubmit,
  categories = []
}) {
  // ✅ state محلي مستقل لاسم القائمة الجديدة
  const [customCategory, setCustomCategory] = useState('');

  if (!show) return null;

  const allCategories = ['عام', ...categories.filter(c => c !== 'عام')];

  const handleSave = () => {
    if (!newGroup.name?.trim()) {
      alert('الرجاء إدخال اسم المجموعة');
      return;
    }

    // ✅ حساب التصنيف النهائي بشكل صريح
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
            {/* اسم المجموعة */}
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

            {/* القائمة / التصنيف */}
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1">
                القائمة / التصنيف
              </label>
              <select
                className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none bg-white cursor-pointer"
                value={newGroup.category || 'عام'}
                onChange={(e) => {
                  setNewGroup({ ...newGroup, category: e.target.value });
                  // ✅ امسح customCategory فقط لو رجع لخيار عادي
                  if (e.target.value !== 'custom') setCustomCategory('');
                }}
              >
                {allCategories.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
                <option value="custom" className="text-blue-600 font-bold">+ قائمة جديدة...</option>
              </select>
            </div>

            {/* حقل القائمة المخصصة — يظهر فقط عند اختيار "قائمة جديدة" */}
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

            {/* رابط المجموعة */}
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

            {/* حالة النشاط */}
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
          </div>

          {/* أزرار التحكم */}
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