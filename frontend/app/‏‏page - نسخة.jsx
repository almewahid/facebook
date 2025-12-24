// frontend/app/page.jsx - النسخة النهائية المحدثة والمبسطة
// من 1292 سطر → ~250 سطر! ✅

'use client';

import { useState, useEffect } from 'react';
import { RefreshCw } from 'lucide-react';

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
  const [botStatus, setBotStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  
  // Dialogs
  const [showAddGroup, setShowAddGroup] = useState(false);
  const [showImportDialog, setShowImportDialog] = useState(false);
  
  // Forms
  const [newGroup, setNewGroup] = useState({ name: '', url: '', is_active: true });
  const [searchQuery, setSearchQuery] = useState('');
  
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
      const [statsRes, groupsRes, statusRes] = await Promise.all([
        fetch(`${API_URL}/stats`),
        fetch(`${API_URL}/groups`),
        fetch(`${API_URL}/bot/status`)
      ]);

      setStats(await statsRes.json());
      setGroups(await groupsRes.json());
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
          onBulkAdd={() => alert('قريباً')}
          onImport={() => setShowImportDialog(true)}
          onSchedule={() => alert('قريباً')}
          onReport={() => alert('قريباً')}
        />

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
  onDownloadTemplate={downloadExcelTemplate}  // ← من downloadCSVTemplate
/>
    </div>
  );
}