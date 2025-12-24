// frontend/app/page.jsx - النسخة النهائية المحدثة والمبسطة
// من 1292 سطر → ~250 سطر! ✅

'use client';

import { useState, useEffect } from 'react';
import { RefreshCw, BarChart3 } from 'lucide-react';

// Components
import Header from './components/Header';
import StatsCards from './components/StatsCards';
import QuickActions from './components/QuickActions';
import GroupsManager from './components/GroupsManager';
import AddGroupDialog from './components/AddGroupDialog';
import ImportGroupsDialog from './components/ImportGroupsDialog';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';

export default function Dashboard() {
  // State
  const [stats, setStats] = useState(null);
  const [groups, setGroups] = useState([]);
  const [posts, setPosts] = useState([]);
  const [botStatus, setBotStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  
  // Dialogs
  const [showAddGroup, setShowAddGroup] = useState(false);
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [showBulkAdd, setShowBulkAdd] = useState(false);
  const [showSchedule, setShowSchedule] = useState(false);
  const [showReport, setShowReport] = useState(false);
  
  // Forms
  const [newGroup, setNewGroup] = useState({ name: '', url: '', is_active: true });
  const [searchQuery, setSearchQuery] = useState('');
  const [bulkGroups, setBulkGroups] = useState('');
  
  // Import
  const [importFile, setImportFile] = useState(null);
  const [importResult, setImportResult] = useState(null);

  // Fetch Data
  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 10000);
    return () => clearInterval(interval);
  }, []);

  const fetchData = async () => {
    try {
      const [statsRes, groupsRes, postsRes, statusRes] = await Promise.all([
        fetch(`${API_URL}/stats`),
        fetch(`${API_URL}/groups`),
        fetch(`${API_URL}/posts?limit=20`),
        fetch(`${API_URL}/bot/status`)
      ]);

      setStats(await statsRes.json());
      setGroups(await groupsRes.json());
      setPosts(await postsRes.json());
      setBotStatus(await statusRes.json());
      setLoading(false);
    } catch (error) {
      console.error('خطأ:', error);
      setLoading(false);
    }
  };

  // Bot Control
  const startBot = async () => {
    try {
      const response = await fetch(`${API_URL}/bot/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ force: false })
      });
      
      if (response.ok) {
        alert('✅ تم تشغيل البوت!');
        fetchData();
      }
    } catch (error) {
      alert('❌ خطأ في الاتصال بالسيرفر');
    }
  };

  const stopBot = async () => {
    try {
      await fetch(`${API_URL}/bot/stop`, { method: 'POST' });
      alert('✅ تم إيقاف البوت!');
      fetchData();
    } catch (error) {
      alert('❌ خطأ');
    }
  };

  const logoutFacebook = async () => {
    if (!confirm('⚠️ هل أنت متأكد؟')) return;
    try {
      await fetch(`${API_URL}/bot/logout`, { method: 'POST' });
      alert('✅ تم تسجيل الخروج!');
      fetchData();
    } catch (error) {
      alert('❌ خطأ');
    }
  };

  // Groups Management
  const handleAddGroup = async () => {
    if (!newGroup.name.trim()) {
      alert('الرجاء إدخال اسم المجموعة');
      return;
    }

    try {
      const response = await fetch(`${API_URL}/groups`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newGroup.name,
          url: newGroup.url || null,
          is_active: newGroup.is_active
        })
      });

      if (response.ok) {
        setShowAddGroup(false);
        setNewGroup({ name: '', url: '', is_active: true });
        fetchData();
        alert('✅ تمت الإضافة!');
      }
    } catch (error) {
      alert('❌ فشل');
    }
  };

  // Bulk Add Handler
  const handleBulkAdd = async () => {
    if (!bulkGroups.trim()) {
      alert('الرجاء إدخال أسماء المجموعات');
      return;
    }

    const lines = bulkGroups.split('\n').filter(l => l.trim());
    let successCount = 0;

    for (const line of lines) {
      try {
        const response = await fetch(`${API_URL}/groups`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: line.trim(),
            url: null,
            is_active: true
          })
        });
        if (response.ok) successCount++;
      } catch (error) {
        console.error('خطأ:', error);
      }
    }

    setShowBulkAdd(false);
    setBulkGroups('');
    fetchData();
    alert(`✅ تمت إضافة ${successCount} من ${lines.length} مجموعة!`);
  };

  const toggleGroup = async (groupId, currentStatus) => {
    try {
      await fetch(`${API_URL}/groups/${groupId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: !currentStatus })
      });
      fetchData();
    } catch (error) {
      alert('❌ خطأ');
    }
  };

  const deleteGroup = async (groupId) => {
    if (!confirm('هل أنت متأكد؟')) return;
    
    try {
      await fetch(`${API_URL}/groups/${groupId}`, { method: 'DELETE' });
      fetchData();
      alert('✅ تم الحذف');
    } catch (error) {
      alert('❌ خطأ');
    }
  };

  // Import
  const handleImportFile = async () => {
    if (!importFile) {
      alert('الرجاء اختيار ملف');
      return;
    }

    const formData = new FormData();
    formData.append('file', importFile);

    const fileExtension = importFile.name.split('.').pop().toLowerCase();
    const endpoint = fileExtension === 'csv' 
      ? `${API_URL}/groups/import/csv`
      : `${API_URL}/groups/import/excel`;

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        body: formData
      });

      const result = await response.json();

      if (result.success) {
        setImportResult(result);
        fetchData();
      } else {
        alert(`❌ فشل: ${result.errors?.join(', ')}`);
      }
    } catch (error) {
      alert('❌ فشل الاستيراد');
    }
  };

  const downloadExcelTemplate = () => {
    const data = [
      ['name', 'url', 'is_active'],
      ['سوق الكويت', '', 'true'],
      ['وظائف الكويت', '', 'true'],
      ['عقارات الكويت', 'https://facebook.com/groups/kuwait-real-estate', 'true'],
      ['مصريون بالكويت', '', 'true']
    ];
    
    let tableHTML = '<html><head><meta charset="utf-8"></head><body><table border="1">';
    
    data.forEach((row, i) => {
      tableHTML += '<tr>';
      row.forEach(cell => {
        const tag = i === 0 ? 'th' : 'td';
        tableHTML += `<${tag}>${cell}</${tag}>`;
      });
      tableHTML += '</tr>';
    });
    
    tableHTML += '</table></body></html>';
    
    const blob = new Blob([tableHTML], { 
      type: 'application/vnd.ms-excel;charset=utf-8' 
    });
    
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'groups_template.xls';
    link.click();
  };

  // Loading
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="w-12 h-12 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">جاري التحميل...</p>
        </div>
      </div>
    );
  }

  // Render
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100" dir="rtl">
      <Header
        onLogout={logoutFacebook}
        onSettings={() => alert('قريباً')}
        onStartBot={startBot}
        onStopBot={stopBot}
        botStatus={botStatus}
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <StatsCards stats={stats} />

        <QuickActions
          onAddGroup={() => setShowAddGroup(true)}
          onBulkAdd={() => setShowBulkAdd(true)}
          onImport={() => setShowImportDialog(true)}
          onSchedule={() => setShowSchedule(true)}
          onReport={() => setShowReport(true)}
        />

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Group Performance Chart */}
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

          {/* Success Rate Chart */}
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

        <div className="mb-8">
          <h2 className="text-xl font-bold text-gray-900 mb-4">📊 إدارة المجموعات</h2>
          <GroupsManager
            groups={groups}
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            onToggleGroup={toggleGroup}
            onDeleteGroup={deleteGroup}
          />
        </div>

        {/* Recent Posts Table */}
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
                          <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                            ✅ نجح
                          </span>
                        )}
                        {post.status === 'failed' && (
                          <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-red-100 text-red-800">
                            ❌ فشل
                          </span>
                        )}
                        {post.status === 'pending' && (
                          <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-yellow-100 text-yellow-800">
                            ⏳ قيد الانتظار
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {post.created_at ? new Date(post.created_at).toLocaleDateString('ar-EG') : '-'}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="4" className="px-6 py-8 text-center text-gray-500">
                      لا توجد منشورات بعد
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <AddGroupDialog
        show={showAddGroup}
        onClose={() => setShowAddGroup(false)}
        newGroup={newGroup}
        setNewGroup={setNewGroup}
        onSubmit={handleAddGroup}
      />

      <ImportGroupsDialog
        show={showImportDialog}
        onClose={() => setShowImportDialog(false)}
        importFile={importFile}
        setImportFile={setImportFile}
        onImport={handleImportFile}
        importResult={importResult}
        setImportResult={setImportResult}
        onDownloadTemplate={downloadExcelTemplate}
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
              <button
                onClick={handleBulkAdd}
                className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
              >
                إضافة الكل
              </button>
              <button
                onClick={() => setShowBulkAdd(false)}
                className="px-4 py-2 bg-gray-200 rounded-lg hover:bg-gray-300"
              >
                إلغاء
              </button>
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
            <button
              onClick={() => setShowSchedule(false)}
              className="w-full bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
            >
              حسناً
            </button>
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
            <button
              onClick={() => setShowReport(false)}
              className="w-full bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
            >
              إغلاق
            </button>
          </div>
        </div>
      )}
    </div>
  );
}