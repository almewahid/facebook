'use client';

import { useState } from 'react';
import { Search, Plus, FolderPlus, Edit2, Check, X, Trash2 } from 'lucide-react';

export default function GroupsManager({
  groups,
  searchQuery,
  setSearchQuery,
  onToggleGroup,
  onDeleteGroup,
  onAddClick,
  onUpdateGroup,
  existingCategories = [], // ✅ القوائم من page.jsx (تشمل اليدوية والفعلية)
  onAddCategory,           // ✅ دالة إضافة قائمة جديدة من page.jsx
}) {
  const [activeTab, setActiveTab] = useState('الكل');

  // ✅ حالة dialog إضافة قائمة (محلية هنا)
  const [showAddCategory, setShowAddCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');

  // حالات التحرير
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({});         // يحتفظ بكامل بيانات المجموعة

  // ✅ القوائم: الكل + القوائم من existingCategories (تشمل الفارغة والمرتبطة بمجموعات)
  const categoriesFromGroups = [...new Set(groups.map(g => g.category || 'عام'))];
  const allCategories = [...new Set([...categoriesFromGroups, ...existingCategories])];
  const tabs = ['الكل', ...allCategories];

  const filteredGroups = groups.filter(g => {
    const matchesSearch = g.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = activeTab === 'الكل' || (g.category || 'عام') === activeTab;
    return matchesSearch && matchesCategory;
  });

  // دوال التحرير
  const startEditing = (group) => {
    setEditingId(group.id);
    // احتفظ بكامل بيانات المجموعة حتى لا يضيع أي حقل عند الحفظ
    const formData = {
      name: group.name,
      category: group.category || 'عام',
      url: group.url || '',
      is_active: group.is_active,
    };
    setEditForm(formData);
  };

  const cancelEditing = () => {
    setEditingId(null);
    setEditForm({});
  };

  const handleSave = async (id) => {
    if (!editForm.name?.trim()) {
      alert('اسم المجموعة لا يمكن أن يكون فارغاً');
      return;
    }
    if (onUpdateGroup) {
      await onUpdateGroup(id, {
        name: editForm.name.trim(),
        category: editForm.category,
        url: editForm.url?.trim() || null,
        is_active: editForm.is_active,
      });
    }
    setEditingId(null);
    setEditForm({});
  };

  // ✅ تأكيد إضافة القائمة
  const handleConfirmAddCategory = () => {
    const name = newCategoryName.trim();
    if (!name) { alert('الرجاء إدخال اسم القائمة'); return; }
    if (allCategories.includes(name)) { alert('⚠️ هذه القائمة موجودة مسبقاً'); return; }

    if (onAddCategory) onAddCategory(name); // ✅ أرسل الاسم مباشرة

    setNewCategoryName('');
    setShowAddCategory(false);
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden" dir="rtl">

      {/* الجزء العلوي */}
      <div className="p-4 border-b border-gray-200 space-y-4 bg-gray-50/50">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute right-3 top-2.5 h-5 w-5 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="بحث في المجموعات..."
              className="w-full pr-10 pl-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white"
            />
          </div>

          <button
            onClick={onAddClick}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all font-bold shadow-sm"
          >
            <Plus className="w-5 h-5" />
            <span>إضافة مجموعة</span>
          </button>
        </div>

        {/* شريط القوائم */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-hide">
          {tabs.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveTab(cat)}
              className={`px-4 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-all ${activeTab === cat
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-100'
                }`}
            >
              {cat}
              <span className="mr-2 opacity-70 text-xs">
                ({cat === 'الكل'
                  ? groups.length
                  : groups.filter(g => (g.category || 'عام') === cat).length})
              </span>
            </button>
          ))}

          {/* ✅ زر إضافة قائمة جديدة - منفصل تماماً */}
          <button
            onClick={() => setShowAddCategory(true)}
            className="flex items-center gap-1 px-3 py-1.5 rounded-full text-sm font-medium text-gray-400 border border-dashed border-gray-300 hover:text-blue-600 hover:border-blue-400 transition-all whitespace-nowrap"
          >
            <FolderPlus className="w-4 h-4" />
            <span>قائمة جديدة</span>
          </button>
        </div>
      </div>

      {/* جدول المجموعات */}
      <div className="overflow-x-auto">
        <table className="w-full text-right">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-6 py-3 text-xs font-bold text-gray-500 uppercase">اسم المجموعة</th>
              <th className="px-6 py-3 text-xs font-bold text-gray-500 uppercase">القائمة</th>
              <th className="px-6 py-3 text-xs font-bold text-gray-500 uppercase">الحالة</th>
              <th className="px-6 py-3 text-xs font-bold text-gray-500 uppercase text-center">الإجراءات</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filteredGroups.length === 0 ? (
              <tr>
                <td colSpan="4" className="px-6 py-12 text-center text-gray-400">
                  <FolderPlus className="w-10 h-10 mx-auto mb-2 opacity-30" />
                  <p>لا توجد مجموعات في هذه القائمة</p>
                </td>
              </tr>
            ) : (
              filteredGroups.map((group) => (
                <tr key={group.id} className="hover:bg-blue-50/30 transition-colors">
                  {/* عمود الاسم */}
                  <td className="px-6 py-4">
                    {editingId === group.id ? (
                      <div className="space-y-2">
                        <input
                          type="text"
                          className="w-full p-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                          value={editForm.name}
                          onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                          placeholder="اسم المجموعة"
                        />
                        <input
                          type="url"
                          dir="ltr"
                          className="w-full p-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 text-left font-mono"
                          value={editForm.url || ''}
                          onChange={(e) => setEditForm({ ...editForm, url: e.target.value })}
                          placeholder="https://facebook.com/groups/..."
                        />
                      </div>
                    ) : (
                      <div>
                        <div className="text-sm font-bold text-gray-900">{group.name}</div>
                        {group.url ? (
                          <a
                            href={group.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="mt-1 inline-block max-w-xs truncate text-[11px] text-blue-600 hover:underline"
                            dir="ltr"
                          >
                            {group.url}
                          </a>
                        ) : (
                          <div className="mt-1 text-[11px] text-amber-600">لا يوجد رابط محفوظ</div>
                        )}
                      </div>
                    )}
                  </td>

                  {/* عمود التصنيف */}
                  <td className="px-6 py-4">
                    {editingId === group.id ? (
                      <select
                        className="w-full p-1 border rounded text-sm focus:ring-2 focus:ring-blue-500"
                        value={editForm.category}
                        onChange={(e) => setEditForm({ ...editForm, category: e.target.value })}
                      >
                        {allCategories.map(cat => (
                          <option key={cat} value={cat}>{cat}</option>
                        ))}
                      </select>
                    ) : (
                      <span className="px-2 py-1 bg-blue-50 text-blue-600 rounded text-xs font-bold border border-blue-100">
                        {group.category || 'عام'}
                      </span>
                    )}
                  </td>

                  {/* عمود الحالة */}
                  <td className="px-6 py-4">
                    <button
                      onClick={() => onToggleGroup(group.id, group.is_active)}
                      className={`px-3 py-1 rounded-full text-xs font-bold transition-colors ${group.is_active
                          ? 'bg-green-100 text-green-700'
                          : 'bg-red-100 text-red-700'
                        }`}
                    >
                      {group.is_active ? '● نشط' : '○ موقف'}
                    </button>
                  </td>

                  {/* عمود الإجراءات */}
                  <td className="px-6 py-4 text-center">
                    <div className="flex justify-center gap-2">
                      {editingId === group.id ? (
                        <>
                          <button onClick={() => handleSave(group.id)} className="p-1.5 text-green-600 bg-green-50 rounded-lg hover:bg-green-100">
                            <Check className="w-4 h-4" />
                          </button>
                          <button onClick={cancelEditing} className="p-1.5 text-gray-400 bg-gray-50 rounded-lg hover:bg-gray-100">
                            <X className="w-4 h-4" />
                          </button>
                        </>
                      ) : (
                        <>
                          <button onClick={() => startEditing(group)} className="p-1.5 text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100">
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button onClick={() => onDeleteGroup(group.id)} className="p-1.5 text-red-600 bg-red-50 rounded-lg hover:bg-red-100">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* ✅ Dialog إضافة قائمة جديدة */}
      {showAddCategory && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-sm shadow-xl" dir="rtl">
            <div className="flex items-center gap-2 mb-4">
              <FolderPlus className="w-5 h-5 text-blue-600" />
              <h3 className="text-lg font-bold text-gray-900">إضافة قائمة جديدة</h3>
            </div>

            <p className="text-sm text-gray-500 mb-4">
              أنشئ قائمة تصنيف جديدة لتنظيم مجموعاتك لاحقاً.
            </p>

            <input
              type="text"
              value={newCategoryName}
              onChange={(e) => setNewCategoryName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleConfirmAddCategory()}
              placeholder="مثال: وظائف، عقارات، بيع وشراء..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg mb-4 focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
              autoFocus
            />

            <div className="flex gap-2">
              <button
                onClick={handleConfirmAddCategory}
                className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 font-bold transition-colors"
              >
                ✅ إضافة القائمة
              </button>
              <button
                onClick={() => { setShowAddCategory(false); setNewCategoryName(''); }}
                className="px-4 py-2 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 transition-colors"
              >
                إلغاء
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
