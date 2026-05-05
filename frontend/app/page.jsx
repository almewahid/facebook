'use client';

import { useState, useRef, useEffect } from 'react';
import { RefreshCw, PlusCircle, Upload, List, ChevronDown } from 'lucide-react';
import Header from './Components/Header';
import Dashboard from './Components/Dashboard';
import { useAppData } from './hooks/useAppData';
import SmartScheduleDialog from './Components/SmartScheduleDialog';
import SmartModeDialog from './Components/SmartModeDialog';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';

// ────────────────────────────────────────────────────────────
// القائمة المنسدلة الموحّدة لإجراءات المجموعات
// ────────────────────────────────────────────────────────────
function GroupActionsMenu({ onAddGroup, onImport, onBulkAdd }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  // إغلاق عند النقر خارج القائمة
  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const actions = [
    {
      icon: '➕',
      label: 'إضافة مجموعة',
      sublabel: 'مجموعة واحدة يدوياً',
      onClick: onAddGroup,
    },
    {
      icon: '📥',
      label: 'استيراد مجموعات',
      sublabel: 'من CSV أو Excel',
      onClick: onImport,
    },
    {
      icon: '📝',
      label: 'إضافة جماعية',
      sublabel: 'لصق روابط متعددة دفعة واحدة',
      onClick: onBulkAdd,
    },
  ];

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white rounded-xl shadow-md transition-all duration-150 font-medium text-sm select-none"
      >
        <PlusCircle className="w-4 h-4" />
        إدارة المجموعات
        <ChevronDown
          className={`w-4 h-4 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
        />
      </button>

      {open && (
        <div
          className="absolute left-0 mt-2 w-64 bg-white rounded-2xl shadow-xl border border-gray-100 z-50 overflow-hidden animate-fade-in"
          style={{ animation: 'fadeSlideDown 0.15s ease-out' }}
        >
          {actions.map((action, idx) => (
            <button
              key={idx}
              onClick={() => { action.onClick(); setOpen(false); }}
              className="w-full flex items-start gap-3 px-4 py-3 hover:bg-blue-50 transition-colors text-right group"
            >
              <span className="text-xl mt-0.5">{action.icon}</span>
              <div>
                <p className="font-semibold text-gray-800 text-sm group-hover:text-blue-700">
                  {action.label}
                </p>
                <p className="text-xs text-gray-400 mt-0.5">{action.sublabel}</p>
              </div>
            </button>
          ))}
        </div>
      )}

      <style>{`
        @keyframes fadeSlideDown {
          from { opacity: 0; transform: translateY(-6px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}

// ────────────────────────────────────────────────────────────
// الصفحة الرئيسية
// ────────────────────────────────────────────────────────────
export default function Page() {
  const appData = useAppData();

  const [view, setView] = useState('dashboard');
  const [activeCampaignId, setActiveCampaignId] = useState(null);

  // Dialog visibility
  const [showAddGroup, setShowAddGroup] = useState(false);
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [showBulkAdd, setShowBulkAdd] = useState(false);
  const [showSchedule, setShowSchedule] = useState(false);
  const [showReport, setShowReport] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showPublish, setShowPublish] = useState(false);
  const [showSmartMode, setShowSmartMode] = useState(false);
  const [showAddCategory, setShowAddCategory] = useState(false);

  // Form state
  const [newGroup, setNewGroup] = useState({ name: '', url: '', is_active: true, category: 'عام' });
  const [newCategoryName, setNewCategoryName] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [bulkGroups, setBulkGroups] = useState('');
  const [importFile, setImportFile] = useState(null);
  const [importResult, setImportResult] = useState(null);

  // ===== Handlers =====
  const onAddGroupSubmit = () => {
    appData.handleAddGroup(newGroup, () => {
      setShowAddGroup(false);
      setNewGroup({ name: '', url: '', is_active: true, category: 'عام' });
    });
  };

  const onBulkAddSubmit = () => {
    appData.handleBulkAdd(bulkGroups, newGroup.category, () => {
      setShowBulkAdd(false);
      setBulkGroups('');
    });
  };

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
        appData.fetchData();
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
  if (appData.loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="text-center space-y-3">
          <RefreshCw className="w-10 h-10 animate-spin mx-auto text-blue-600" />
          <p className="text-gray-500 font-medium">جاري التحميل...</p>
        </div>
      </div>
    );
  }

  // ===== Render =====
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100" dir="rtl">
      <Header
        onLogout={appData.logoutFacebook}
        onSettings={() => setShowSettings(true)}
        onStartBot={appData.startBot}
        onStopBot={appData.stopBot}
        botStatus={appData.botStatus}
        currentView={view}
        setView={setView}
        // ✅ تمرير القائمة المنسدلة الموحّدة للـ Header ليعرضها بجانب عناصر التحكم
        groupActionsMenu={
          <GroupActionsMenu
            onAddGroup={() => setShowAddGroup(true)}
            onImport={() => setShowImportDialog(true)}
            onBulkAdd={() => setShowBulkAdd(true)}
          />
        }
      />

      <Dashboard
        // Data
        stats={appData.stats}
        groups={appData.groups}
        posts={appData.posts}
        botStatus={appData.botStatus}
        existingCategories={appData.existingCategories}

        activeCampaignId={activeCampaignId}
        setActiveCampaignId={setActiveCampaignId}

        // View
        view={view}
        setView={setView}

        // ✅ تعطيل بطاقتَي "أداء المجموعات" و"معدل النجاح"
        hideGroupPerformance={true}
        hideSuccessRate={true}

        // Dialog visibility
        showAddGroup={showAddGroup} setShowAddGroup={setShowAddGroup}
        showImportDialog={showImportDialog} setShowImportDialog={setShowImportDialog}
        showBulkAdd={showBulkAdd} setShowBulkAdd={setShowBulkAdd}
        showSchedule={showSchedule} setShowSchedule={setShowSchedule}
        showReport={showReport} setShowReport={setShowReport}
        showSettings={showSettings} setShowSettings={setShowSettings}
        showPublish={showPublish} setShowPublish={setShowPublish}
        showSmartMode={showSmartMode} setShowSmartMode={setShowSmartMode}
        showAddCategory={showAddCategory} setShowAddCategory={setShowAddCategory}

        // Form state
        newGroup={newGroup} setNewGroup={setNewGroup}
        newCategoryName={newCategoryName} setNewCategoryName={setNewCategoryName}
        searchQuery={searchQuery} setSearchQuery={setSearchQuery}
        bulkGroups={bulkGroups} setBulkGroups={setBulkGroups}
        importFile={importFile} setImportFile={setImportFile}
        importResult={importResult} setImportResult={setImportResult}

        // Handlers
        onToggleGroup={appData.toggleGroup}
        onDeleteGroup={appData.deleteGroup}
        onAddGroup={onAddGroupSubmit}
        onUpdateGroup={appData.handleUpdateGroup}
        onBulkAdd={onBulkAddSubmit}
        onImportFile={handleImportFile}
        onDownloadTemplate={downloadExcelTemplate}
        onAddCategory={appData.handleAddCategory}
        onDeleteCategory={appData.handleDeleteCategory}
      />

      <SmartScheduleDialog
        open={showSchedule}
        onClose={() => setShowSchedule(false)}
        onStartBot={(scheduleConfig) => appData.startBot(scheduleConfig)}
        existingCategories={appData.existingCategories}
      />
      <SmartModeDialog
        open={showSmartMode}
        onClose={() => setShowSmartMode(false)}
      />
    </div>
  );
}