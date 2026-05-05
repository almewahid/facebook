// frontend/app/components/Dashboard.jsx

'use client';

import React, { useState } from 'react';
// تم إضافة TrendingUp هنا لحل مشكلة الخطأ في السطر 127
import { BarChart3, Clock, AlertCircle, TrendingUp } from 'lucide-react';
import StatsCards from './StatsCards';
import QuickActions from './QuickActions';
import GroupsManager from './GroupsManager';
import AddGroupDialog from './AddGroupDialog';
import ImportGroupsDialog from './ImportGroupsDialog';
import SettingsDialog from './SettingsDialog';
import PublishDialog from './PublishDialog/index';
// تم استيراد المكون الجديد للوضع الذكي
import SmartModeDialog from './SmartModeDialog';
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
  // التحكم في ظهور الوضع الذكي[cite: 1]
  showSmartMode,
  setShowSmartMode,

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
  onAddCategory,
}) {

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

      {/* View Switcher */}
      <div className="flex gap-3 mb-6">
        <button
          onClick={() => setView('dashboard')}
          className={`px-5 py-2 rounded-xl font-medium transition-all ${view === 'dashboard'
            ? 'bg-blue-600 text-white shadow-md'
            : 'bg-white text-gray-600 hover:bg-gray-100'
            }`}
        >
          📊 الداشبورد
        </button>
        <button
          onClick={() => setView('groups')}
          className={`px-5 py-2 rounded-xl font-medium transition-all ${view === 'groups'
            ? 'bg-blue-600 text-white shadow-md'
            : 'bg-white text-gray-600 hover:bg-gray-100'
            }`}
        >
          👥 إدارة المجموعات
        </button>
      </div>

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
            // تفعيل زر الوضع الذكي
            onSmartMode={() => setShowSmartMode(true)}
          />

          {/* Charts & AI Insights Summary */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            <div className="bg-white p-6 rounded-lg shadow border-t-4 border-blue-600">
              <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center">
                <BarChart3 className="w-5 h-5 ml-2 text-blue-600" />
                أداء المجموعات
              </h3>
              <div className="h-64 flex items-center justify-center text-gray-500">
                <div className="text-center">
                  <BarChart3 className="w-16 h-16 mx-auto mb-2 text-gray-300" />
                  <p>التحليل البياني متاح عبر "الوضع الذكي"</p>
                </div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-lg shadow border-t-4 border-green-600">
              <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center">
                <TrendingUp className="w-5 h-5 ml-2 text-green-600" />
                معدل النجاح الإجمالي
              </h3>
              <div className="h-64 flex items-center justify-center">
                <div className="text-center">
                  <div className="text-5xl font-bold text-green-600 mb-2">
                    {stats?.success_rate || 0}%
                  </div>
                  <p className="text-gray-500">بناءً على آخر {stats?.total_posts || 0} عملية نشر</p>
                </div>
              </div>
            </div>
          </div>

          {/* Posts Table */}
          <div className="mb-8">
            <h2 className="text-xl font-bold text-gray-900 mb-4">📝 آخر عمليات النشر</h2>
            <div className="bg-white rounded-lg shadow overflow-hidden border border-gray-200">
              <table className="min-w-full divide-y divide-gray-200 text-right">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase">المجموعة</th>
                    <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase">الحالة</th>
                    <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase">التوقيت</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {posts && posts.length > 0 ? (
                    posts.slice(0, 5).map((post) => (
                      <tr key={post.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-medium">
                          {post.group_name || 'مجموعة غير محددة'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {post.status === 'success' && (
                            <span className="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">✅ نجح</span>
                          )}
                          {post.status === 'failed' && (
                            <span className="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-red-100 text-red-800">❌ فشل</span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          <div className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {post.created_at ? new Date(post.created_at).toLocaleTimeString('ar-EG') : '-'}
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="3" className="px-6 py-8 text-center text-gray-500">لا توجد بيانات نشر حالياً</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

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

      {/* ===== Dialogs ===== */}

      {/* نافذة الوضع الذكي الجديدة */}
      <SmartModeDialog
        open={showSmartMode}
        onClose={() => setShowSmartMode(false)}
      />

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
        onSuccess={(id, type = 'publish') => {
          setShowPublish(false);
          const url = `/monitor?${type === 'publish' ? 'publishId' : 'campaignId'}=${id}`;
          window.open(url, '_blank');
        }}
        existingCategories={existingCategories}
      />

      {/* Bulk Add Dialog */}
      {showBulkAdd && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl">
            <h3 className="text-xl font-bold mb-4">إضافة جماعية للمجموعات</h3>
            <textarea
              value={bulkGroups}
              onChange={(e) => setBulkGroups(e.target.value)}
              placeholder="ضع كل اسم مجموعة في سطر منفصل..."
              className="w-full h-48 px-4 py-3 border border-gray-300 rounded-xl mb-4 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
            />
            <div className="flex gap-3">
              <button onClick={onBulkAdd} className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-xl font-bold hover:bg-blue-700 transition-colors">إضافة الكل</button>
              <button onClick={() => setShowBulkAdd(false)} className="px-4 py-2 bg-gray-100 text-gray-600 rounded-xl hover:bg-gray-200 transition-colors">إلغاء</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}