// frontend/app/components/GroupsManager.jsx

'use client';

import { Search } from 'lucide-react';
import StatusBadge from './StatusBadge';

export default function GroupsManager({ 
  groups, 
  searchQuery, 
  setSearchQuery,
  onToggleGroup,
  onDeleteGroup 
}) {
  const filteredGroups = groups.filter(g => 
    g.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
      {/* Search */}
      <div className="p-4 border-b border-gray-200">
        <div className="relative">
          <Search className="absolute right-3 top-2.5 h-5 w-5 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="بحث في المجموعات..."
            className="w-full pr-10 pl-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">#</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">اسم المجموعة</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">الرابط</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">الحالة</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">الإجراءات</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {filteredGroups.map((group, index) => (
              <tr key={group.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 text-sm text-gray-500">{index + 1}</td>
                <td className="px-6 py-4">
                  <div className="text-sm font-medium text-gray-900">{group.name}</div>
                </td>
                <td className="px-6 py-4">
                  {group.url ? (
                    <a href={group.url} target="_blank" rel="noopener noreferrer" className="text-sm text-blue-600 hover:text-blue-800 hover:underline">
                      🔗 رابط
                    </a>
                  ) : (
                    <span className="text-sm text-gray-400 italic">سيبحث بالاسم</span>
                  )}
                </td>
                <td className="px-6 py-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={group.is_active}
                      onChange={() => onToggleGroup(group.id, group.is_active)}
                      className="w-4 h-4 text-blue-600"
                    />
                    <span className={`text-sm ${group.is_active ? 'text-green-600' : 'text-gray-400'}`}>
                      {group.is_active ? 'نشط' : 'موقف'}
                    </span>
                  </label>
                </td>
                <td className="px-6 py-4">
                  <button
                    onClick={() => onDeleteGroup(group.id)}
                    className="text-red-600 hover:text-red-800 text-sm font-medium"
                  >
                    🗑️ حذف
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {filteredGroups.length === 0 && (
        <div className="text-center py-12 text-gray-500">
          <p className="text-lg">لا توجد مجموعات</p>
          <p className="text-sm mt-2">قم بإضافة مجموعة أو استيراد من CSV/Excel</p>
        </div>
      )}
    </div>
  );
}