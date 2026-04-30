'use client';

import { BarChart3 } from 'lucide-react';
import StatsCards from './StatsCards';
import QuickActions from './QuickActions';
import GroupsManager from './GroupsManager';
import AddGroupDialog from './AddGroupDialog';
import ImportGroupsDialog from './ImportGroupsDialog';
import SettingsDialog from './SettingsDialog';
import PublishDialog from './PublishDialog';

export default function Dashboard({
  // Data
  stats,
  groups,
  posts,
  botStatus,

  // View
  view,
  setView,

  // Dialog visibility
  showAddGroup,
  setShowAddGroup,
  showImportDialog,
  setShowImportDialog,
  showBulkAdd,
  setShowBulkAdd,
  showSchedule,
  setShowSchedule,
  showReport,
  setShowReport,
  showSettings,
  setShowSettings,
  showPublish,
  setShowPublish,

  // Form state
  newGroup,
  setNewGroup,
  searchQuery,
  setSearchQuery,
  bulkGroups,
  setBulkGroups,
  importFile,
  setImportFile,
  importResult,
  setImportResult,
  existingCategories,

  // Handlers
  onToggleGroup,
  onDeleteGroup,
  onAddGroup,
  onUpdateGroup,
  onBulkAdd,
  onImportFile,
  onDownloadTemplate,
  onAddCategory,     // ✅ جديد
}) {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

      {/* View Switcher */}
      <div className="flex gap-3 mb-6">
        <button
          onClick={() => setView('dashboard')}
          className={`px-5 py-2 rounded-xl font-medium transition-all ${
            view === 'dashboard'
              ? 'bg-blue-600 text-white shadow-md'
              : 'bg-white text-gray-600 hover:bg-gray-100'
          }`}
        >
          📊 الداشبورد
        </button>
        <button
          onClick={() => setView('groups')}
          className={`px-5 py-2 rounded-xl font-medium transition-all ${
            view === 'groups'
              ? 'bg-blue-600 text-white shadow-md'
              : 'bg-white text-gray-600 hover:bg-gray-100'
          }`}
        >
          👥 إدارة المجموعات
        </button>
      </div>

      {/* Groups View */}
      {view === 'groups' && (
        <div className="mb-8">
          <GroupsManager
            groups={groups}
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            onToggleGroup={onToggleGroup}
            onDeleteGroup={onDeleteGroup}
            onAddClick={() => setShowAddGroup(true)}
            onUpdateGroup={onUpdateGroup}
            existingCategories={existingCategories}
            onAddCategory={onAddCategory}
          />
        </div>
      )}

      {/* Dashboard View */}
      {view === 'dashboard' && (
        <>
          <StatsCards stats={stats} />

          <QuickActions
            onAddGroup={() => setShowAddGroup(true)}
            onBulkAdd={() => setShowBulkAdd(true)}
            onImport={() => setShowImportDialog(true)}
            onSchedule={() => setShowSchedule(true)}
            onReport={() => setShowReport(true)}
            onPublish={() => setShowPublish(true)}
          />

          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            <div className="bg-white p-6 rounded-lg shadow">
              <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center">
                <BarChart3 className="w-5 h-5 ml-2 text-blue-600" />
                أداء المجموعات
              </h3>
              <div className="h-64 flex items-center justify-center text-gray-500">
                <div className="text-center">
                  <BarChart3 className="w-16 h-16 mx-auto mb-2 text-gray-300" />
                  <p>قريباً - رسم بياني تفاعلي</p>
                </div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-lg shadow">
              <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center">
                <BarChart3 className="w-5 h-5 ml-2 text-green-600" />
                معدل النجاح (آخر 7 أيام)
              </h3>
              <div className="h-64 flex items-center justify-center text-gray-500">
                <div className="text-center">
                  <div className="text-4xl font-bold text-green-600 mb-2">
                    {stats?.success_rate || 0}%
                  </div>
                  <p>معدل النجاح</p>
                </div>
              </div>
            </div>
          </div>

          {/* Posts Table */}
          <div className="mb-8">
            <h2 className="text-xl font-bold text-gray-900 mb-4">📝 آخر المنشورات</h2>
            <div className="bg-white rounded-lg shadow overflow-hidden">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">المجموعة</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">المنشور</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">الحالة</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">التاريخ</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {posts && posts.length > 0 ? (
                    posts.map((post) => (
                      <tr key={post.id}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {post.group_name || 'غير معروف'}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-500">
                          <div className="max-w-xs truncate">
                            {post.content ? post.content.substring(0, 50) + '...' : 'لا يوجد محتوى'}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {post.status === 'success' && (
                            <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">✅ نجح</span>
                          )}
                          {post.status === 'failed' && (
                            <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-red-100 text-red-800">❌ فشل</span>
                          )}
                          {post.status === 'pending' && (
                            <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-yellow-100 text-yellow-800">⏳ قيد الانتظار</span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {post.created_at ? new Date(post.created_at).toLocaleDateString('ar-EG') : '-'}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="4" className="px-6 py-8 text-center text-gray-500">لا توجد منشورات بعد</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* ===== Dialogs ===== */}
      <AddGroupDialog
        show={showAddGroup}
        onClose={() => setShowAddGroup(false)}
        newGroup={newGroup}
        setNewGroup={setNewGroup}
        onSubmit={onAddGroup}
        categories={existingCategories}
      />

      <ImportGroupsDialog
        show={showImportDialog}
        onClose={() => setShowImportDialog(false)}
        importFile={importFile}
        setImportFile={setImportFile}
        onImport={onImportFile}
        importResult={importResult}
        setImportResult={setImportResult}
        onDownloadTemplate={onDownloadTemplate}
      />

      <SettingsDialog
        show={showSettings}
        onClose={() => setShowSettings(false)}
      />

      <PublishDialog
        show={showPublish}
        onClose={() => setShowPublish(false)}
      />

      {/* Bulk Add Dialog */}
      {showBulkAdd && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-bold mb-4">إضافة جماعية</h3>
            <textarea
              value={bulkGroups}
              onChange={(e) => setBulkGroups(e.target.value)}
              placeholder="اكتب اسم كل مجموعة في سطر منفصل..."
              className="w-full h-48 px-3 py-2 border border-gray-300 rounded-lg mb-4"
            />
            <div className="flex gap-2">
              <button onClick={onBulkAdd} className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700">إضافة الكل</button>
              <button onClick={() => setShowBulkAdd(false)} className="px-4 py-2 bg-gray-200 rounded-lg hover:bg-gray-300">إلغاء</button>
            </div>
          </div>
        </div>
      )}

      {/* Schedule Dialog */}
      {showSchedule && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-bold mb-4">⏰ الجدولة الذكية</h3>
            <p className="text-gray-600 mb-4">قريباً - سيتم إضافة ميزة الجدولة الذكية!</p>
            <button onClick={() => setShowSchedule(false)} className="w-full bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700">حسناً</button>
          </div>
        </div>
      )}

      {/* Report Dialog */}
      {showReport && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl">
            <h3 className="text-lg font-bold mb-4">📊 تقرير مفصل</h3>
            <div className="space-y-4 mb-4">
              <div className="flex justify-between items-center p-3 bg-gray-50 rounded">
                <span>إجمالي المجموعات:</span>
                <span className="font-bold">{stats?.total_groups || 0}</span>
              </div>
              <div className="flex justify-between items-center p-3 bg-gray-50 rounded">
                <span>المجموعات النشطة:</span>
                <span className="font-bold text-green-600">{stats?.active_groups || 0}</span>
              </div>
              <div className="flex justify-between items-center p-3 bg-gray-50 rounded">
                <span>إجمالي المنشورات:</span>
                <span className="font-bold">{stats?.total_posts || 0}</span>
              </div>
              <div className="flex justify-between items-center p-3 bg-gray-50 rounded">
                <span>المنشورات الناجحة:</span>
                <span className="font-bold text-green-600">{stats?.successful_posts || 0}</span>
              </div>
              <div className="flex justify-between items-center p-3 bg-gray-50 rounded">
                <span>معدل النجاح:</span>
                <span className="font-bold text-blue-600">{stats?.success_rate || 0}%</span>
              </div>
            </div>
            <button onClick={() => setShowReport(false)} className="w-full bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700">إغلاق</button>
          </div>
        </div>
      )}
    </div>
  );
}