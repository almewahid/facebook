'use client';

import { useState, useEffect } from 'react';
import { RefreshCw } from 'lucide-react';
import Header from './Components/Header';
import Dashboard from './Components/Dashboard';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';

// ─── مفتاح حفظ القوائم اليدوية في localStorage ───
const CATEGORIES_STORAGE_KEY = 'fb_poster_extra_categories';

export default function Page() {
  // ===== State =====
  const [stats, setStats]         = useState(null);
  const [groups, setGroups]       = useState([]);
  const [posts, setPosts]         = useState([]);
  const [botStatus, setBotStatus] = useState(null);
  const [loading, setLoading]     = useState(true);

  const [view, setView] = useState('dashboard');

  // القوائم المضافة يدوياً (تُخزَّن في localStorage حتى تبقى حتى لو فارغة)
  const [manualCategories, setManualCategories] = useState(() => {
    try {
      const saved = localStorage.getItem(CATEGORIES_STORAGE_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Dialog visibility
  const [showAddGroup,      setShowAddGroup]      = useState(false);
  const [showImportDialog,  setShowImportDialog]  = useState(false);
  const [showBulkAdd,       setShowBulkAdd]       = useState(false);
  const [showSchedule,      setShowSchedule]      = useState(false);
  const [showReport,        setShowReport]        = useState(false);
  const [showSettings,      setShowSettings]      = useState(false);
  const [showPublish,       setShowPublish]       = useState(false);
  const [showAddCategory,   setShowAddCategory]   = useState(false); // ✅ جديد

  // Form state
  const [newGroup, setNewGroup]           = useState({ name: '', url: '', is_active: true, category: 'عام' });
  const [newCategoryName, setNewCategoryName] = useState('');        // ✅ جديد
  const [searchQuery, setSearchQuery]     = useState('');
  const [bulkGroups, setBulkGroups]       = useState('');
  const [importFile, setImportFile]       = useState(null);
  const [importResult, setImportResult]   = useState(null);

  // ===== Derived =====
  // القوائم من المجموعات الموجودة + القوائم المضافة يدوياً (بدون تكرار)
  const categoriesFromGroups = [...new Set(groups.map(g => g.category).filter(Boolean))];
  const existingCategories = [...new Set([...categoriesFromGroups, ...manualCategories])];

  // ===== Data fetching =====
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
        fetch(`${API_URL}/bot/status`),
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

  // ===== Bot controls =====
  const startBot = async () => {
    try {
      const response = await fetch(`${API_URL}/bot/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ force: false }),
      });
      if (response.ok) {
        alert('✅ تم تشغيل البوت!');
        setTimeout(fetchData, 1500);
      }
    } catch {
      alert('❌ خطأ في الاتصال بالسيرفر');
    }
  };

  const stopBot = async () => {
    try {
      await fetch(`${API_URL}/bot/stop`, { method: 'POST' });
      alert('✅ تم إيقاف البوت!');
      setTimeout(fetchData, 1500);
    } catch {
      alert('❌ خطأ');
    }
  };

  const logoutFacebook = async () => {
    if (!confirm('⚠️ هل أنت متأكد؟')) return;
    try {
      await fetch(`${API_URL}/bot/logout`, { method: 'POST' });
      alert('✅ تم تسجيل الخروج!');
      fetchData();
    } catch {
      alert('❌ خطأ');
    }
  };

  // ===== ✅ إضافة قائمة جديدة (category فقط) =====
  const handleAddCategory = (name) => {
    if (!name || !name.trim()) return;
    if (existingCategories.includes(name)) return;

    const updated = [...manualCategories, name];
    setManualCategories(updated);

    // حفظ دائم في localStorage
    try {
      localStorage.setItem(CATEGORIES_STORAGE_KEY, JSON.stringify(updated));
    } catch { /* ignore */ }
  };

  // حذف قائمة يدوية (اختياري - يمكن استخدامه لاحقاً)
  const handleDeleteCategory = (categoryName) => {
    // لا نحذف القوائم المرتبطة بمجموعات فعلية
    if (categoriesFromGroups.includes(categoryName)) {
      alert('⚠️ لا يمكن حذف قائمة تحتوي على مجموعات');
      return;
    }
    if (!confirm(`هل أنت متأكد من حذف القائمة "${categoryName}"؟`)) return;
    const updated = manualCategories.filter(c => c !== categoryName);
    setManualCategories(updated);
    try {
      localStorage.setItem(CATEGORIES_STORAGE_KEY, JSON.stringify(updated));
    } catch { /* ignore */ }
  };

  // ===== Group handlers =====
  const handleAddGroup = async (groupData) => {
    if (!groupData.name.trim()) { alert('الرجاء إدخال اسم المجموعة'); return; }
    try {
      const response = await fetch(`${API_URL}/groups`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: groupData.name,
          url: groupData.url || null,
          is_active: groupData.is_active,
          category: groupData.category,
        }),
      });
      if (response.ok) {
        setShowAddGroup(false);
        setNewGroup({ name: '', url: '', is_active: true, category: 'عام' });
        fetchData();
        alert('✅ تمت إضافة المجموعة وتصنيفها!');
      }
    } catch {
      alert('❌ فشل في إضافة المجموعة');
    }
  };

  const handleUpdateGroup = async (groupId, updatedData) => {
    try {
      const response = await fetch(`${API_URL}/groups/${groupId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedData),
      });
      if (response.ok) fetchData();
    } catch {
      alert('❌ فشل في تحديث البيانات');
    }
  };

  const handleBulkAdd = async () => {
    if (!bulkGroups.trim()) { alert('الرجاء إدخال أسماء المجموعات'); return; }
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
            is_active: true,
            category: newGroup.category,
          }),
        });
        if (response.ok) successCount++;
      } catch { /* skip failed lines */ }
    }

    setShowBulkAdd(false);
    setBulkGroups('');
    fetchData();
    alert(`✅ تمت إضافة ${successCount} من ${lines.length} مجموعة في قائمة (${newGroup.category})!`);
  };

  const toggleGroup = async (groupId, currentStatus) => {
    try {
      await fetch(`${API_URL}/groups/${groupId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: !currentStatus }),
      });
      fetchData();
    } catch {
      alert('❌ خطأ');
    }
  };

  const deleteGroup = async (groupId) => {
    if (!confirm('هل أنت متأكد؟')) return;
    try {
      await fetch(`${API_URL}/groups/${groupId}`, { method: 'DELETE' });
      fetchData();
      alert('✅ تم الحذف');
    } catch {
      alert('❌ خطأ');
    }
  };

  // ===== Import handler =====
  const handleImportFile = async () => {
    if (!importFile) { alert('الرجاء اختيار ملف'); return; }
    const formData = new FormData();
    formData.append('file', importFile);
    const ext = importFile.name.split('.').pop().toLowerCase();
    const endpoint = ext === 'csv'
      ? `${API_URL}/groups/import/csv`
      : `${API_URL}/groups/import/excel`;
    try {
      const response = await fetch(endpoint, { method: 'POST', body: formData });
      const result = await response.json();
      if (result.success) {
        setImportResult(result);
        fetchData();
      } else {
        alert(`❌ فشل: ${result.errors?.join(', ')}`);
      }
    } catch {
      alert('❌ فشل الاستيراد');
    }
  };

  const downloadExcelTemplate = () => {
    const data = [
      ['name', 'url', 'is_active', 'category'],
      ['سوق الكويت', '', 'true', 'عام'],
      ['وظائف السعودية', '', 'true', 'وظائف'],
    ];
    const csvContent = data.map(row => row.join(',')).join('\n');
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'groups_template.csv';
    link.click();
  };

  // ===== Loading screen =====
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-2 text-blue-600" />
          <p>جاري التحميل...</p>
        </div>
      </div>
    );
  }

  // ===== Render =====
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100" dir="rtl">
      <Header
        onLogout={logoutFacebook}
        onSettings={() => setShowSettings(true)}
        onStartBot={startBot}
        onStopBot={stopBot}
        botStatus={botStatus}
        currentView={view}
        setView={setView}
      />

      <Dashboard
        // Data
        stats={stats}
        groups={groups}
        posts={posts}
        botStatus={botStatus}
        existingCategories={existingCategories}

        // View
        view={view}
        setView={setView}

        // Dialog visibility
        showAddGroup={showAddGroup}           setShowAddGroup={setShowAddGroup}
        showImportDialog={showImportDialog}   setShowImportDialog={setShowImportDialog}
        showBulkAdd={showBulkAdd}             setShowBulkAdd={setShowBulkAdd}
        showSchedule={showSchedule}           setShowSchedule={setShowSchedule}
        showReport={showReport}               setShowReport={setShowReport}
        showSettings={showSettings}           setShowSettings={setShowSettings}
        showPublish={showPublish}             setShowPublish={setShowPublish}
        showAddCategory={showAddCategory}     setShowAddCategory={setShowAddCategory}   // ✅ جديد

        // Form state
        newGroup={newGroup}                   setNewGroup={setNewGroup}
        newCategoryName={newCategoryName}     setNewCategoryName={setNewCategoryName}   // ✅ جديد
        searchQuery={searchQuery}             setSearchQuery={setSearchQuery}
        bulkGroups={bulkGroups}               setBulkGroups={setBulkGroups}
        importFile={importFile}               setImportFile={setImportFile}
        importResult={importResult}           setImportResult={setImportResult}

        // Handlers
        onToggleGroup={toggleGroup}
        onDeleteGroup={deleteGroup}
        onAddGroup={handleAddGroup}
        onUpdateGroup={handleUpdateGroup}
        onBulkAdd={handleBulkAdd}
        onImportFile={handleImportFile}
        onDownloadTemplate={downloadExcelTemplate}
        onAddCategory={handleAddCategory}           // ✅ جديد
        onDeleteCategory={handleDeleteCategory}     // ✅ جديد (اختياري)
      />
    </div>
  );
}