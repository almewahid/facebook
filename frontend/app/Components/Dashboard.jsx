'use client';

import React from 'react';
import {
  Clock, CheckCircle, XCircle, Send, Users, ChevronLeft,
  Rocket, UsersRound, Zap, History, ListChecks,
  Facebook, PenLine, Share2, FilePlus2
} from 'lucide-react';
import GroupsManager from './GroupsManager';
import AddGroupDialog from './AddGroupDialog';
import ImportGroupsDialog from './ImportGroupsDialog';
import SettingsDialog from './SettingsDialog';
import PublishDialog from './PublishDialog/index';
import SmartModeDialog from './SmartModeDialog';

function StatCard({ icon: Icon, label, value, unit, bg, iconColor, valColor }) {
  return (
    <div className="bg-white rounded-2xl p-4 border border-gray-100 flex items-center gap-3 shadow-sm">
      <div className={`${bg} p-2.5 rounded-xl flex-shrink-0`}>
        <Icon className={`w-5 h-5 ${iconColor}`} />
      </div>
      <div>
        <p className="text-xs text-gray-400 mb-0.5">{label}</p>
        <p className={`text-2xl font-bold ${valColor}`}>
          {value ?? '—'} <span className="text-xs font-normal text-gray-400">{unit}</span>
        </p>
      </div>
    </div>
  );
}

function QuickCard({ icon: Icon, title, desc, bg, border, iconBg, iconColor, textColor, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center justify-between w-full px-3 py-2.5 rounded-xl border ${bg} ${border} text-right hover:brightness-95 transition-all`}
    >
      <div className="flex items-center gap-2.5">
        <div className={`${iconBg} w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0`}>
          <Icon className={`w-4 h-4 ${iconColor}`} />
        </div>
        <div>
          <p className={`font-semibold text-xs ${textColor}`}>{title}</p>
          <p className="text-[10px] text-gray-400 mt-0.5">{desc}</p>
        </div>
      </div>
      <ChevronLeft className="w-3.5 h-3.5 text-gray-300 flex-shrink-0" />
    </button>
  );
}

export default function Dashboard({
  stats, groups, posts, botStatus, existingCategories,
  activeCampaignId, setActiveCampaignId,
  view, setView,
  showAddGroup, setShowAddGroup,
  showImportDialog, setShowImportDialog,
  showBulkAdd, setShowBulkAdd,
  showSchedule, setShowSchedule,
  showReport, setShowReport,
  showSettings, setShowSettings,
  showPublish, setShowPublish,
  publishMethod, setPublishMethod,
  showSmartMode, setShowSmartMode,
  showAddCategory, setShowAddCategory,
  newGroup, setNewGroup,
  newCategoryName, setNewCategoryName,
  searchQuery, setSearchQuery,
  bulkGroups, setBulkGroups,
  importFile, setImportFile,
  importResult, setImportResult,
  onToggleGroup, onDeleteGroup, onAddGroup, onUpdateGroup,
  onBulkAdd, onImportFile, onDownloadTemplate,
  onAddCategory, onDeleteCategory,
}) {
  const openPublishMethod = (method) => {
    setPublishMethod(method);
    setShowPublish(true);
  };

  return (
    <div className="p-6 space-y-5">

      {view === 'groups' && (
        <GroupsManager
          groups={groups} searchQuery={searchQuery} setSearchQuery={setSearchQuery}
          onToggleGroup={onToggleGroup} onDeleteGroup={onDeleteGroup}
          onAddClick={() => setShowAddGroup(true)} onUpdateGroup={onUpdateGroup}
          existingCategories={existingCategories} onAddCategory={onAddCategory}
        />
      )}

      {view === 'dashboard' && (
        <>
          <div>
            <h1 className="text-xl font-bold text-gray-900">مرحبًا بك! 👋</h1>
            <p className="text-gray-400 text-xs mt-1">إدارة حسابك والنشر التلقائي على مجموعات فيسبوك بسهولة.</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <StatCard icon={Send}        label="إجمالي المنشورات"  value={stats?.total_posts}      unit="منشور"  bg="bg-blue-50"   iconColor="text-blue-500"   valColor="text-blue-700"   />
            <StatCard icon={CheckCircle} label="المنشورات الناجحة" value={stats?.successful_posts} unit="منشور"  bg="bg-green-50"  iconColor="text-green-500"  valColor="text-green-700"  />
            <StatCard icon={UsersRound}  label="المجموعات النشطة"  value={stats?.active_groups}    unit="مجموعة" bg="bg-purple-50" iconColor="text-purple-500" valColor="text-purple-700" />
          </div>

          {/* الصف الأوسط */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

            {/* يسار: إجراءات سريعة */}
            <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm space-y-2.5">
              <h2 className="font-bold text-gray-800 text-sm flex items-center gap-1.5 mb-3">
                <Zap className="w-4 h-4 text-amber-400" />
                الإجراءات السريعة
              </h2>
              <QuickCard icon={Users}       title="إضافة مجموعات"     desc="إضافة مجموعات جديدة للنشر"        bg="bg-blue-50"   border="border-blue-100"   iconBg="bg-blue-100"   iconColor="text-blue-600"   textColor="text-blue-800"   onClick={() => setShowAddGroup(true)}  />
              <QuickCard icon={Share2}      title="مشاركة منشور من الصفحة" desc="اختيار المجموعات والجدولة ثم المشاركة" bg="bg-purple-50" border="border-purple-100" iconBg="bg-purple-100" iconColor="text-purple-600" textColor="text-purple-800" onClick={() => openPublishMethod('share_page')} />
              <QuickCard icon={FilePlus2}   title="النشر بمنشور جديد" desc="كتابة محتوى جديد وجدولته للمجموعات" bg="bg-indigo-50" border="border-indigo-100" iconBg="bg-indigo-100" iconColor="text-indigo-600" textColor="text-indigo-800" onClick={() => openPublishMethod('new_post')}  />
            </div>

            {/* يمين/وسط: 3 خطوات */}
            <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm flex flex-col">
              <h2 className="font-bold text-gray-800 text-sm flex items-center gap-1.5 mb-4">
                <ListChecks className="w-4 h-4 text-blue-500" />
                ابدأ النشر التلقائي في 3 خطوات
              </h2>
              <div className="flex items-start justify-between gap-1 flex-1">
                <div className="flex-1 text-center">
                  <div className="w-11 h-11 rounded-full bg-blue-600 text-white flex items-center justify-center mx-auto mb-2 shadow-sm shadow-blue-200">
                    <Facebook className="w-5 h-5" />
                  </div>
                  <p className="text-xs font-semibold text-gray-700">تسجيل الدخول للفيس</p>
                  <p className="text-[10px] text-gray-400 mt-1 leading-relaxed">قم بتسجيل الدخول بحسابك لربط البوت</p>
                </div>
                <div className="pt-3 text-gray-300 text-base flex-shrink-0">←</div>
                <div className="flex-1 text-center">
                  <div className="w-11 h-11 rounded-full bg-blue-600 text-white flex items-center justify-center mx-auto mb-2 shadow-sm shadow-blue-200">
                    <PenLine className="w-5 h-5" />
                  </div>
                  <p className="text-xs font-semibold text-gray-700">أضف منشوراتك</p>
                  <p className="text-[10px] text-gray-400 mt-1 leading-relaxed">أنشئ أو اختر من المنشورات السابقة</p>
                </div>
                <div className="pt-3 text-gray-300 text-base flex-shrink-0">←</div>
                <div className="flex-1 text-center">
                  <div className="w-11 h-11 rounded-full bg-blue-600 text-white flex items-center justify-center mx-auto mb-2 shadow-sm shadow-blue-200">
                    <Rocket className="w-5 h-5" />
                  </div>
                  <p className="text-xs font-semibold text-gray-700">ابدأ النشر</p>
                  <p className="text-[10px] text-gray-400 mt-1 leading-relaxed">شغّل البوت ودعنا نقوم بالباقي</p>
                </div>
              </div>
              <button
                onClick={() => openPublishMethod('new_post')}
                className="mt-4 w-full bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold py-2.5 rounded-xl transition-colors flex items-center justify-center gap-2 shadow-sm shadow-blue-100"
              >
                <Rocket className="w-3.5 h-3.5" />
                لنبدأ الآن
              </button>
            </div>
          </div>

          {/* آخر عمليات النشر */}
          <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm">
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-50">
              <h2 className="font-bold text-gray-800 text-sm flex items-center gap-1.5">
                <History className="w-4 h-4 text-indigo-400" />
                آخر عمليات النشر
              </h2>
              <button onClick={() => setView('posts')} className="text-xs text-blue-600 hover:underline">عرض الكل</button>
            </div>
            <table className="min-w-full text-right">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-5 py-2.5 text-xs font-medium text-gray-400">المجموعة</th>
                  <th className="px-5 py-2.5 text-xs font-medium text-gray-400">المنشور</th>
                  <th className="px-5 py-2.5 text-xs font-medium text-gray-400">الحالة</th>
                  <th className="px-5 py-2.5 text-xs font-medium text-gray-400">الوقت</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {posts && posts.length > 0 ? (
                  posts.slice(0, 5).map((post) => (
                    <tr key={post.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-5 py-3 font-medium text-gray-800 text-xs">{post.group_name || '—'}</td>
                      <td className="px-5 py-3 text-gray-400 text-xs max-w-[180px] truncate">{post.content?.slice(0, 35) || '—'}...</td>
                      <td className="px-5 py-3">
                        {post.status === 'success' && (
                          <span className="px-2 py-0.5 text-[10px] rounded-full bg-green-50 text-green-700 font-semibold border border-green-100 inline-flex items-center gap-1">
                            <CheckCircle className="w-3 h-3" /> نجح
                          </span>
                        )}
                        {post.status === 'failed' && (
                          <span className="px-2 py-0.5 text-[10px] rounded-full bg-red-50 text-red-700 font-semibold border border-red-100 inline-flex items-center gap-1">
                            <XCircle className="w-3 h-3" /> فشل
                          </span>
                        )}
                      </td>
                      <td className="px-5 py-3 text-gray-400 text-xs">
                        <span className="inline-flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {post.created_at ? new Date(post.created_at).toLocaleTimeString('ar-EG') : '—'}
                        </span>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr><td colSpan="4" className="px-5 py-8 text-center text-gray-300 text-sm">لا توجد بيانات نشر حالياً</td></tr>
                )}
              </tbody>
            </table>
            {posts && posts.length > 5 && (
              <div className="px-5 py-3 border-t border-gray-50">
                <button onClick={() => setView('posts')} className="text-xs text-blue-600 hover:underline">عرض كل العمليات</button>
              </div>
            )}
          </div>
        </>
      )}

      {/* Dialogs */}
      <SmartModeDialog open={showSmartMode} onClose={() => setShowSmartMode(false)} />
      <AddGroupDialog show={showAddGroup} onClose={() => setShowAddGroup(false)} newGroup={newGroup} setNewGroup={setNewGroup} onSubmit={onAddGroup} categories={existingCategories} />
      <ImportGroupsDialog show={showImportDialog} onClose={() => setShowImportDialog(false)} importFile={importFile} setImportFile={setImportFile} onImport={onImportFile} importResult={importResult} setImportResult={setImportResult} onDownloadTemplate={onDownloadTemplate} />
      <SettingsDialog show={showSettings} onClose={() => setShowSettings(false)} />
      <PublishDialog show={showPublish} onClose={() => setShowPublish(false)} onSuccess={(id, type = 'publish') => { setShowPublish(false); window.open(`/monitor?${type === 'publish' ? 'publishId' : 'campaignId'}=${id}`, '_blank'); }} existingCategories={existingCategories} publishMethod={publishMethod} />

      {showBulkAdd && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl">
            <h3 className="text-base font-bold mb-4 text-gray-800">إضافة جماعية للمجموعات</h3>
            <textarea value={bulkGroups} onChange={(e) => setBulkGroups(e.target.value)} placeholder="ضع كل اسم مجموعة في سطر منفصل..." className="w-full h-44 px-4 py-3 border border-gray-200 rounded-xl mb-4 outline-none focus:ring-2 focus:ring-blue-500 text-sm" />
            <div className="flex gap-3">
              <button onClick={onBulkAdd} className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-xl font-bold text-sm hover:bg-blue-700 transition-colors">إضافة الكل</button>
              <button onClick={() => setShowBulkAdd(false)} className="px-4 py-2 bg-gray-100 text-gray-600 rounded-xl text-sm hover:bg-gray-200 transition-colors">إلغاء</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
