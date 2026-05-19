'use client';

import React, { useMemo, useState } from 'react';
import {
  Clock, CheckCircle, XCircle, Send, Users, ChevronLeft,
  Rocket, UsersRound, Zap, History, ListChecks,
  Facebook, PenLine, Share2, FilePlus2,
  CalendarDays, Settings2, ExternalLink, AlertCircle, PlayCircle,
  Search, ListFilter
} from 'lucide-react';
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  PieChart, Pie, Cell
} from 'recharts';
import GroupsManager from './GroupsManager';
import AddGroupDialog from './AddGroupDialog';
import ImportGroupsDialog from './ImportGroupsDialog';
import SettingsDialog from './SettingsDialog';
import PublishDialog from './PublishDialog/index';
import SmartModeDialog from './SmartModeDialog';

const API_URL = process.env.NEXT_PUBLIC_API_URL || '/api/v1';
const API_ORIGIN = API_URL.replace(/\/api\/v1\/?$/, '');

function mediaSrc(path) {
  if (!path) return null;
  if (path.startsWith('http')) return path;
  return `${API_ORIGIN}${path}`;
}

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

function StatusPill({ status }) {
  if (status === 'success') {
    return (
      <span className="px-2 py-0.5 text-[10px] rounded-full bg-green-50 text-green-700 font-semibold border border-green-100 inline-flex items-center gap-1">
        <CheckCircle className="w-3 h-3" /> نجح
      </span>
    );
  }

  if (status === 'failed') {
    return (
      <span className="px-2 py-0.5 text-[10px] rounded-full bg-red-50 text-red-700 font-semibold border border-red-100 inline-flex items-center gap-1">
        <XCircle className="w-3 h-3" /> فشل
      </span>
    );
  }

  return (
    <span className="px-2 py-0.5 text-[10px] rounded-full bg-amber-50 text-amber-700 font-semibold border border-amber-100 inline-flex items-center gap-1">
      <Clock className="w-3 h-3" /> {status || 'قيد الانتظار'}
    </span>
  );
}

function PaginationControls({ page, pageSize, total, onPageChange, onPageSizeChange }) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(page, totalPages);

  return (
    <div className="flex flex-col gap-3 border-t border-gray-50 p-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-center gap-2 text-xs text-gray-500">
        <span>عرض</span>
        <input
          type="number"
          min="1"
          max="100"
          value={pageSize}
          onChange={(event) => onPageSizeChange(Math.max(1, Number(event.target.value) || 10))}
          className="w-16 rounded-lg border border-gray-200 px-2 py-1 text-center text-xs focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100"
        />
        <span>صفوف من {total}</span>
      </div>
      <div className="flex items-center justify-center gap-2">
        <button
          onClick={() => onPageChange(safePage - 1)}
          disabled={safePage <= 1}
          className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-semibold text-gray-600 disabled:cursor-not-allowed disabled:opacity-40"
        >
          السابق
        </button>
        <span className="text-xs font-semibold text-gray-500">
          صفحة {safePage} من {totalPages}
        </span>
        <button
          onClick={() => onPageChange(safePage + 1)}
          disabled={safePage >= totalPages}
          className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-semibold text-gray-600 disabled:cursor-not-allowed disabled:opacity-40"
        >
          التالي
        </button>
      </div>
    </div>
  );
}

function PostsTable({ posts }) {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const totalPages = Math.max(1, Math.ceil((posts?.length || 0) / pageSize));
  const safePage = Math.min(page, totalPages);
  const visiblePosts = (posts || []).slice((safePage - 1) * pageSize, safePage * pageSize);

  return (
    <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm">
      <div className="overflow-x-auto">
        <table className="min-w-full text-right">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-5 py-3 text-xs font-medium text-gray-400">المجموعة</th>
              <th className="px-5 py-3 text-xs font-medium text-gray-400">المنشور</th>
              <th className="px-5 py-3 text-xs font-medium text-gray-400">رقم عملية النشر</th>
              <th className="px-5 py-3 text-xs font-medium text-gray-400">الحالة</th>
              <th className="px-5 py-3 text-xs font-medium text-gray-400">الوقت</th>
              <th className="px-5 py-3 text-xs font-medium text-gray-400 text-center">الرابط</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {visiblePosts.length > 0 ? (
              visiblePosts.map((post) => (
                <tr key={post.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-5 py-3 font-medium text-gray-800 text-xs">
                    {post.group_name || post.group?.name || (post.group_id ? `مجموعة ${post.group_id}` : 'غير محدد')}
                  </td>
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-3">
                      {mediaSrc(post.image_url) && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={mediaSrc(post.image_url)}
                          alt=""
                          className="h-11 w-11 rounded-md border border-gray-100 object-cover"
                        />
                      )}
                      <div className="min-w-0 text-xs text-gray-600">
                        <div className="max-w-[320px] truncate font-medium text-gray-700" title={post.content || ''}>
                          {post.content || 'بدون نص'}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-3">
                    {post.cycle_number ? (
                      <a
                        href={`/monitor?publishId=${post.cycle_number}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex rounded-lg bg-blue-50 px-2.5 py-1 text-xs font-bold text-blue-600 hover:bg-blue-100"
                      >
                        #{post.cycle_number}
                      </a>
                    ) : (
                      <span className="text-gray-300 text-xs">—</span>
                    )}
                  </td>
                  <td className="px-5 py-3"><StatusPill status={post.status} /></td>
                  <td className="px-5 py-3 text-gray-400 text-xs">
                    {post.created_at || post.posted_at ? new Date(post.created_at || post.posted_at).toLocaleString('ar-EG') : '—'}
                  </td>
                  <td className="px-5 py-3 text-center">
                    {post.post_url ? (
                      <a href={post.post_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs text-blue-600 hover:underline">
                        فتح <ExternalLink className="w-3 h-3" />
                      </a>
                    ) : (
                      <span className="text-gray-300 text-xs">—</span>
                    )}
                  </td>
                </tr>
              ))
            ) : (
              <tr><td colSpan="6" className="px-5 py-12 text-center text-gray-300 text-sm">لا توجد منشورات حتى الآن</td></tr>
            )}
          </tbody>
        </table>
      </div>
      {(posts?.length || 0) > 0 && (
        <PaginationControls
          page={safePage}
          pageSize={pageSize}
          total={posts.length}
          onPageChange={setPage}
          onPageSizeChange={(value) => { setPageSize(value); setPage(1); }}
        />
      )}
    </div>
  );
}

function ReportsView({ stats, groups, posts }) {
  const [groupSearch, setGroupSearch] = useState('');
  const [groupFilter, setGroupFilter] = useState('all');
  const [groupSort, setGroupSort] = useState('successRate');
  const [groupPage, setGroupPage] = useState(1);
  const [groupPageSize, setGroupPageSize] = useState(10);

  const report = useMemo(() => {
    const rowsMap = new Map();

    groups.forEach((group) => {
      rowsMap.set(group.id, {
        group_id: group.id,
        group_name: group.name,
        total: 0,
        success: 0,
        failed: 0,
        skipped: 0,
        successRate: 0,
      });
    });

    posts.forEach((post) => {
      const key = post.group_id || post.group_name || post.id;
      const existing = rowsMap.get(key) || {
        group_id: post.group_id,
        group_name: post.group_name || post.group?.name || `مجموعة ${post.group_id}`,
        total: 0,
        success: 0,
        failed: 0,
        skipped: 0,
        successRate: 0,
      };

      existing.group_name = post.group_name || existing.group_name;
      existing.total += 1;
      if (post.status === 'success') existing.success += 1;
      if (post.status === 'failed') existing.failed += 1;
      if (post.status === 'skipped') existing.skipped += 1;
      rowsMap.set(key, existing);
    });

    const groupRows = [...rowsMap.values()].map(row => ({
      ...row,
      successRate: row.total > 0 ? Math.round((row.success / row.total) * 100) : 0,
    }));

    const total = stats?.total_posts ?? posts.length;
    const success = stats?.successful_posts ?? posts.filter(p => p.status === 'success').length;
    const failed = stats?.failed_posts ?? posts.filter(p => p.status === 'failed').length;
    const skipped = stats?.skipped_posts ?? posts.filter(p => p.status === 'skipped').length;
    const successRate = total > 0 ? Math.round((success / total) * 100) : 0;

    const lastSevenDays = Array.from({ length: 7 }, (_, index) => {
      const date = new Date();
      date.setDate(date.getDate() - (6 - index));
      const key = date.toISOString().slice(0, 10);
      const label = new Intl.DateTimeFormat('ar-EG', { weekday: 'short' }).format(date);
      return { key, label, total: 0 };
    });

    posts.forEach((post) => {
      const rawDate = post.posted_at || post.created_at;
      if (!rawDate) return;
      const key = new Date(rawDate).toISOString().slice(0, 10);
      const day = lastSevenDays.find(item => item.key === key);
      if (day) day.total += 1;
    });

    return { groupRows, total, success, failed, skipped, successRate, lastSevenDays };
  }, [groups, posts, stats]);

  const filteredGroups = useMemo(() => {
    return report.groupRows
      .filter(row => row.group_name?.toLowerCase().includes(groupSearch.toLowerCase()))
      .filter(row => {
        if (groupFilter === 'high') return row.successRate >= 80 && row.total > 0;
        if (groupFilter === 'low') return row.successRate < 80 && row.total > 0;
        if (groupFilter === 'empty') return row.total === 0;
        return true;
      })
      .sort((a, b) => {
        if (groupSort === 'name') return a.group_name.localeCompare(b.group_name, 'ar');
        if (groupSort === 'total') return b.total - a.total;
        if (groupSort === 'failed') return b.failed - a.failed;
        return b.successRate - a.successRate;
      });
  }, [groupFilter, groupSearch, groupSort, report.groupRows]);

  const pieData = [
    { name: 'ناجح', value: report.success, color: '#22c55e' },
    { name: 'فشل', value: report.failed, color: '#ef4444' },
    { name: 'تم التخطي', value: report.skipped, color: '#f59e0b' },
  ].filter(item => item.value > 0);

  const groupTotalPages = Math.max(1, Math.ceil(filteredGroups.length / groupPageSize));
  const safeGroupPage = Math.min(groupPage, groupTotalPages);
  const visibleRows = filteredGroups.slice(
    (safeGroupPage - 1) * groupPageSize,
    safeGroupPage * groupPageSize
  );

  return (
    <>
      <div>
        <h1 className="text-xl font-bold text-gray-900">التقارير</h1>
        <p className="text-gray-400 text-xs mt-1">نظرة شاملة على أداء النشر ونتائج المجموعات.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
        <StatCard icon={Send} label="إجمالي المنشورات" value={report.total} unit="منشور" bg="bg-blue-50" iconColor="text-blue-500" valColor="text-blue-700" />
        <StatCard icon={CheckCircle} label="نسبة النجاح" value={report.successRate} unit="%" bg="bg-green-50" iconColor="text-green-500" valColor="text-green-700" />
        <StatCard icon={XCircle} label="عدد المنشورات الفاشلة" value={report.failed} unit="منشور" bg="bg-red-50" iconColor="text-red-500" valColor="text-red-700" />
        <StatCard icon={Clock} label="متوسط آخر نشر" value={groups.length || 0} unit="مجموعة" bg="bg-indigo-50" iconColor="text-indigo-500" valColor="text-indigo-700" />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm">
          <h2 className="font-bold text-gray-800 text-sm mb-4">أداء النشر خلال آخر 7 أيام</h2>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={report.lastSevenDays}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#eef2f7" />
                <XAxis dataKey="label" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip />
                <Line type="monotone" dataKey="total" stroke="#2563eb" strokeWidth={2} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm">
          <h2 className="font-bold text-gray-800 text-sm mb-4">نسبة نتائج النشر</h2>
          <div className="h-56 flex items-center">
            <div className="w-2/3 h-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={pieData.length ? pieData : [{ name: 'لا توجد بيانات', value: 1, color: '#e5e7eb' }]} innerRadius={55} outerRadius={85} paddingAngle={4} dataKey="value">
                    {(pieData.length ? pieData : [{ color: '#e5e7eb' }]).map((entry, index) => (
                      <Cell key={index} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="space-y-2 text-xs">
              {pieData.map(item => (
                <div key={item.name} className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                  <span className="text-gray-500">{item.name}</span>
                  <span className="font-bold text-gray-800">{item.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm">
        <div className="flex flex-col gap-3 border-b border-gray-100 p-4 lg:flex-row lg:items-center lg:justify-between">
          <h2 className="font-bold text-gray-800 text-sm">أداء المجموعات</h2>
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="relative">
              <Search className="absolute right-3 top-2.5 h-4 w-4 text-gray-400" />
              <input
                value={groupSearch}
                onChange={(event) => { setGroupSearch(event.target.value); setGroupPage(1); }}
                placeholder="بحث عن مجموعة..."
                className="w-full sm:w-56 rounded-xl border border-gray-200 bg-white py-2 pr-9 pl-3 text-xs focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100"
              />
            </div>
            <div className="relative">
              <ListFilter className="absolute right-3 top-2.5 h-4 w-4 text-gray-400" />
              <select
                value={groupFilter}
                onChange={(event) => { setGroupFilter(event.target.value); setGroupPage(1); }}
                className="w-full sm:w-40 appearance-none rounded-xl border border-gray-200 bg-white py-2 pr-9 pl-3 text-xs focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100"
              >
                <option value="all">كل المجموعات</option>
                <option value="high">نجاح مرتفع</option>
                <option value="low">تحتاج متابعة</option>
                <option value="empty">بدون نشر</option>
              </select>
            </div>
            <select
              value={groupSort}
              onChange={(event) => { setGroupSort(event.target.value); setGroupPage(1); }}
              className="w-full sm:w-40 rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100"
            >
              <option value="successRate">ترتيب حسب النجاح</option>
              <option value="total">ترتيب حسب العدد</option>
              <option value="failed">ترتيب حسب الفشل</option>
              <option value="name">ترتيب حسب الاسم</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full text-right">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-5 py-3 text-xs font-medium text-gray-400">المجموعة</th>
                <th className="px-5 py-3 text-xs font-medium text-gray-400">عدد المنشورات</th>
                <th className="px-5 py-3 text-xs font-medium text-gray-400">ناجح</th>
                <th className="px-5 py-3 text-xs font-medium text-gray-400">فشل</th>
                <th className="px-5 py-3 text-xs font-medium text-gray-400">نسبة النجاح</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {visibleRows.length > 0 ? visibleRows.map(row => (
                <tr key={row.group_id || row.group_name} className="hover:bg-gray-50 transition-colors">
                  <td className="px-5 py-3 text-xs font-bold text-gray-800">{row.group_name}</td>
                  <td className="px-5 py-3 text-xs text-gray-500">{row.total}</td>
                  <td className="px-5 py-3 text-xs text-green-700">{row.success}</td>
                  <td className="px-5 py-3 text-xs text-red-700">{row.failed}</td>
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-3">
                      <span className="w-10 text-xs font-bold text-gray-700">{row.successRate}%</span>
                      <div className="h-1.5 w-28 overflow-hidden rounded-full bg-gray-100">
                        <div className="h-full rounded-full bg-green-500" style={{ width: `${row.successRate}%` }} />
                      </div>
                    </div>
                  </td>
                </tr>
              )) : (
                <tr>
                  <td colSpan="5" className="px-5 py-10 text-center text-sm text-gray-300">لا توجد نتائج مطابقة</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {filteredGroups.length > 0 && (
          <PaginationControls
            page={safeGroupPage}
            pageSize={groupPageSize}
            total={filteredGroups.length}
            onPageChange={setGroupPage}
            onPageSizeChange={(value) => { setGroupPageSize(value); setGroupPage(1); }}
          />
        )}
      </div>
    </>
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

      {view === 'posts' && (
        <>
          <div className="flex items-center justify-between gap-3">
            <div>
              <h1 className="text-xl font-bold text-gray-900">المنشورات</h1>
              <p className="text-gray-400 text-xs mt-1">متابعة آخر المنشورات ونتائج النشر على المجموعات.</p>
            </div>
            <button
              onClick={() => openPublishMethod('new_post')}
              className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold px-4 py-2.5 rounded-xl transition-colors flex items-center gap-2"
            >
              <FilePlus2 className="w-4 h-4" />
              منشور جديد
            </button>
          </div>
          <PostsTable posts={posts} />
        </>
      )}

      {view === 'reports' && (
        <ReportsView stats={stats} groups={groups} posts={posts} />
      )}

      {view === 'schedule' && (
        <>
          <div>
            <h1 className="text-xl font-bold text-gray-900">الجدولة</h1>
            <p className="text-gray-400 text-xs mt-1">تشغيل البوت بجدول نشر ذكي وفواصل آمنة بين المجموعات.</p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                  <CalendarDays className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="font-bold text-gray-800 text-sm">إعداد جدول النشر</h2>
                  <p className="text-xs text-gray-400 mt-0.5">اختر الأوقات والفواصل ثم ابدأ التشغيل.</p>
                </div>
              </div>
              <button
                onClick={() => setShowSchedule(true)}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold py-3 rounded-xl transition-colors flex items-center justify-center gap-2"
              >
                <PlayCircle className="w-4 h-4" />
                فتح إعدادات الجدولة
              </button>
            </div>

            <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
              <h2 className="font-bold text-gray-800 text-sm mb-3">حالة التشغيل</h2>
              <div className={`p-4 rounded-xl border ${botStatus?.is_running ? 'bg-green-50 border-green-100' : 'bg-gray-50 border-gray-100'}`}>
                <p className={`text-sm font-bold ${botStatus?.is_running ? 'text-green-700' : 'text-gray-500'}`}>
                  {botStatus?.is_running ? 'البوت يعمل الآن' : 'البوت متوقف'}
                </p>
                <p className="text-xs text-gray-400 mt-1">المجموعات النشطة: {stats?.active_groups ?? 0}</p>
              </div>
            </div>
          </div>
        </>
      )}

      {view === 'settings' && (
        <>
          <div>
            <h1 className="text-xl font-bold text-gray-900">الإعدادات</h1>
            <p className="text-gray-400 text-xs mt-1">إدارة حساب Chrome، رابط الصفحة، وحماية الحساب من السلوك الآلي.</p>
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm max-w-2xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-gray-100 text-gray-700 flex items-center justify-center">
                <Settings2 className="w-5 h-5" />
              </div>
              <div>
                <h2 className="font-bold text-gray-800 text-sm">إعدادات التحكم الذكي</h2>
                <p className="text-xs text-gray-400 mt-0.5">كل خيارات الإعدادات محفوظة في نافذة واحدة.</p>
              </div>
            </div>
            <button
              onClick={() => setShowSettings(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold px-4 py-2.5 rounded-xl transition-colors flex items-center gap-2"
            >
              <Settings2 className="w-4 h-4" />
              فتح الإعدادات
            </button>
          </div>

          <div className="bg-amber-50 border border-amber-100 rounded-2xl p-4 max-w-2xl flex gap-3 text-amber-800">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <p className="text-xs leading-6">تأكد من حفظ جلسة الدخول ورابط الصفحة قبل تشغيل النشر التلقائي.</p>
          </div>
        </>
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
                        <StatusPill status={post.status} />
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
      <AddGroupDialog
        show={showAddGroup}
        onClose={() => setShowAddGroup(false)}
        newGroup={newGroup}
        setNewGroup={setNewGroup}
        onSubmit={onAddGroup}
        onImportClick={() => {
          setShowAddGroup(false);
          setShowImportDialog(true);
        }}
        categories={existingCategories}
      />
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
