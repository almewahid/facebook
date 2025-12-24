// frontend/app/components/AddGroupDialog.jsx

'use client';

import Modal from './Modal';

export default function AddGroupDialog({ 
  show, 
  onClose, 
  newGroup, 
  setNewGroup, 
  onSubmit 
}) {
  if (!show) return null;

  return (
    <Modal title="إضافة مجموعة جديدة" onClose={onClose}>
      <div className="space-y-4">
        {/* اسم المجموعة */}
        <div>
          <label className="block text-sm font-medium mb-2">
            اسم المجموعة <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={newGroup.name}
            onChange={(e) => setNewGroup({...newGroup, name: e.target.value})}
            className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
            placeholder="مثال: مصريون بالكويت"
            required
          />
        </div>
        
        {/* رابط المجموعة */}
        <div>
          <label className="block text-sm font-medium mb-2">
            رابط المجموعة <span className="text-gray-400">(اختياري)</span>
          </label>
          <input
            type="url"
            value={newGroup.url || ''}
            onChange={(e) => setNewGroup({...newGroup, url: e.target.value})}
            className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
            placeholder="https://facebook.com/groups/..."
          />
          <p className="text-xs text-gray-500 mt-1">
            💡 إذا تركته فارغاً، سيبحث البوت عن المجموعة بالاسم تلقائياً
          </p>
        </div>
        
        {/* نشط */}
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={newGroup.is_active}
            onChange={(e) => setNewGroup({...newGroup, is_active: e.target.checked})}
            className="w-4 h-4 text-blue-600"
          />
          <label className="text-sm">مجموعة نشطة</label>
        </div>
      </div>
      
      {/* الأزرار */}
      <div className="flex gap-4 mt-6">
        <button
          onClick={onSubmit}
          className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
        >
          إضافة
        </button>
        <button
          onClick={onClose}
          className="flex-1 px-6 py-3 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition"
        >
          إلغاء
        </button>
      </div>
    </Modal>
  );
}