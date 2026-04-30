'use client';

import { useState, useRef, useEffect } from 'react';
import { X, Send, Image, Video, FileText, CheckCircle, XCircle, Loader2, Trash2, List, Plus, ExternalLink } from 'lucide-react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';

export default function PublishDialog({ show, onClose }) {
  const [text, setText] = useState('');
  const [images, setImages] = useState([]);
  const [video, setVideo] = useState(null);
  const [step, setStep] = useState('form'); // 'form' | 'publishing' | 'done'
  const [postId, setPostId] = useState(null);
  const [progress, setProgress] = useState(null);
  const [results, setResults] = useState([]); // ✅ نتائج المجموعات التفصيلية
  const [error, setError] = useState('');

  // قوائم المجموعات
  const [groups, setGroups] = useState([]);
  const [lists, setLists] = useState([]);
  const [selectedList, setSelectedList] = useState('all');
  const [showListManager, setShowListManager] = useState(false);
  const [newListName, setNewListName] = useState('');
  const [selectedGroupIds, setSelectedGroupIds] = useState([]);
  const [loadingGroups, setLoadingGroups] = useState(false);

  const imageInputRef = useRef();
  const videoInputRef = useRef();
  const pollRef = useRef();
  const pollCountRef = useRef(0); // ✅ عداد لمنع الانتظار اللانهائي

  useEffect(() => {
    if (show) {
      fetchGroups();
      loadLists();
    } else {
      clearInterval(pollRef.current);
    }
  }, [show]);

  // ==================== جلب البيانات ====================

  const fetchGroups = async () => {
    setLoadingGroups(true);
    try {
      const res = await fetch(`${API_URL}/groups`);
      if (!res.ok) throw new Error();
      setGroups(await res.json());
    } catch (_) {}
    finally { setLoadingGroups(false); }
  };

  const loadLists = () => {
    try {
      const saved = localStorage.getItem('group_lists');
      if (saved) setLists(JSON.parse(saved));
    } catch (_) {}
  };

  const saveLists = (newLists) => {
    setLists(newLists);
    localStorage.setItem('group_lists', JSON.stringify(newLists));
  };

  // ==================== إدارة القوائم ====================

  const createList = () => {
    if (!newListName.trim() || selectedGroupIds.length === 0) {
      alert('اكتب اسم القائمة واختر مجموعة واحدة على الأقل');
      return;
    }
    const newList = { id: Date.now().toString(), name: newListName.trim(), groupIds: selectedGroupIds };
    saveLists([...lists, newList]);
    setNewListName('');
    setSelectedGroupIds([]);
    alert(`✅ تم إنشاء القائمة "${newList.name}"`);
  };

  const deleteList = (id) => {
    if (!confirm('هل تريد حذف هذه القائمة؟')) return;
    saveLists(lists.filter(l => l.id !== id));
    if (selectedList === id) setSelectedList('all');
  };

  const toggleGroupInSelection = (id) => {
    setSelectedGroupIds(prev =>
      prev.includes(id) ? prev.filter(g => g !== id) : [...prev, id]
    );
  };

  const getTargetGroups = () => {
    if (selectedList === 'all') return groups.filter(g => g.is_active);
    const list = lists.find(l => l.id === selectedList);
    if (!list) return [];
    return groups.filter(g => list.groupIds.includes(g.id) && g.is_active);
  };

  const targetGroups = getTargetGroups();

  // ==================== الصور والفيديو ====================

  const handleImageChange = (e) => {
    const files = Array.from(e.target.files);
    setImages(prev => [...prev, ...files.map(file => ({ file, preview: URL.createObjectURL(file) }))]);
    e.target.value = '';
  };

  const handleVideoChange = (e) => {
    const file = e.target.files[0];
    if (file) setVideo({ file, preview: URL.createObjectURL(file) });
    e.target.value = '';
  };

  const removeImage = (i) => setImages(prev => prev.filter((_, idx) => idx !== i));
  const removeVideo = () => setVideo(null);

  // ==================== النشر ====================

  const handlePublish = async () => {
    if (!text.trim()) { setError('الرجاء كتابة نص المنشور'); return; }
    if (targetGroups.length === 0) { setError('لا توجد مجموعات نشطة'); return; }

    setError('');
    setStep('publishing');
    setResults([]);
    pollCountRef.current = 0;

    const formData = new FormData();
    formData.append('text', text);
    targetGroups.forEach(g => formData.append('group_ids', g.id));
    images.forEach(img => formData.append('images', img.file));
    if (video) formData.append('video', video.file);

    try {
      const res = await fetch(`${API_URL}/publish`, { method: 'POST', body: formData });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || `خطأ ${res.status}`);
      }

      const data = await res.json();
      setPostId(data.post_id);
      setProgress({
        total_groups: data.total_groups,
        success_count: 0,
        failed_count: 0,
        status: 'publishing',
        progress_percent: 0,
      });

      // ✅ polling مع حد أقصى لمنع الانتظار الأبدي
      pollRef.current = setInterval(async () => {
        pollCountRef.current += 1;

        try {
          const statusRes = await fetch(`${API_URL}/publish/${data.post_id}/status`);
          const statusData = await statusRes.json();

          setProgress(statusData);

          // ✅ حفظ نتائج المجموعات إن وجدت
          if (statusData.results) {
            setResults(statusData.results);
          }

          // ✅ إنهاء عند done أو failed أو بعد 5 دقائق (150 * 2ث)
          const isDone = statusData.status === 'done' || statusData.status === 'failed';
          const isTimeout = pollCountRef.current >= 150;

          if (isDone || isTimeout) {
            clearInterval(pollRef.current);
            setStep('done');
          }
        } catch (_) {
          // إذا فشل الـ polling 10 مرات متتالية، أنهِ
          if (pollCountRef.current >= 10) {
            clearInterval(pollRef.current);
            setStep('done');
          }
        }
      }, 2000);

    } catch (err) {
      setError(err.message);
      setStep('form');
    }
  };

  const handleClose = () => {
    clearInterval(pollRef.current);
    images.forEach(img => URL.revokeObjectURL(img.preview));
    if (video) URL.revokeObjectURL(video.preview);
    setText(''); setImages([]); setVideo(null);
    setStep('form'); setPostId(null); setProgress(null);
    setResults([]); setError('');
    setShowListManager(false);
    onClose();
  };

  if (!show) return null;

  const progressPct = progress?.progress_percent || 0;
  const successRate = progress?.total_groups
    ? Math.round((progress.success_count / progress.total_groups) * 100)
    : 0;

  // ==================== UI ====================

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-xl shadow-2xl overflow-hidden flex flex-col" style={{ maxHeight: '90vh' }}>

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
              <Send className="w-4 h-4 text-white" />
            </div>
            <h2 className="text-lg font-bold text-gray-900">نشر منشور جديد</h2>
          </div>
          <button onClick={handleClose} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto">

          {/* ===== FORM ===== */}
          {step === 'form' && (
            <div className="p-6 space-y-5">

              {/* اختيار القائمة */}
              <div>
                <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-2">
                  <List className="w-4 h-4 text-blue-500" />
                  النشر في
                </label>
                <div className="flex gap-2 flex-wrap mb-2">
                  <button
                    onClick={() => setSelectedList('all')}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-all ${
                      selectedList === 'all' ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-600 border-gray-200 hover:border-blue-300'
                    }`}
                  >
                    🌐 جميع المجموعات ({groups.filter(g => g.is_active).length})
                  </button>
                  {lists.map(list => {
                    const count = groups.filter(g => list.groupIds.includes(g.id) && g.is_active).length;
                    return (
                      <button
                        key={list.id}
                        onClick={() => setSelectedList(list.id)}
                        className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-all ${
                          selectedList === list.id ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-600 border-gray-200 hover:border-blue-300'
                        }`}
                      >
                        📋 {list.name} ({count})
                      </button>
                    );
                  })}
                  <button
                    onClick={() => setShowListManager(!showListManager)}
                    className="px-3 py-1.5 rounded-lg text-sm font-medium border border-dashed border-gray-300 text-gray-500 hover:border-blue-400 hover:text-blue-600 transition-all flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" /> قائمة جديدة
                  </button>
                </div>
                {targetGroups.length > 0 ? (
                  <p className="text-xs text-green-600 bg-green-50 px-3 py-1.5 rounded-lg">
                    ✅ سيتم النشر في <strong>{targetGroups.length}</strong> مجموعة نشطة
                  </p>
                ) : (
                  <p className="text-xs text-red-500 bg-red-50 px-3 py-1.5 rounded-lg">
                    ⚠️ لا توجد مجموعات نشطة في هذه القائمة
                  </p>
                )}
              </div>

              {/* إدارة القوائم */}
              {showListManager && (
                <div className="border border-blue-100 rounded-xl bg-blue-50 p-4 space-y-4">
                  <h4 className="text-sm font-bold text-blue-800 flex items-center gap-1">
                    <List className="w-4 h-4" /> إنشاء قائمة جديدة
                  </h4>
                  <input
                    value={newListName}
                    onChange={e => setNewListName(e.target.value)}
                    placeholder="اسم القائمة (مثل: مجموعات الخليج)"
                    className="w-full px-3 py-2 text-sm border border-blue-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white"
                  />
                  <div className="max-h-40 overflow-y-auto space-y-1">
                    {loadingGroups ? (
                      <p className="text-xs text-gray-400 text-center py-2">جاري التحميل...</p>
                    ) : groups.map(g => (
                      <label key={g.id} className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-white cursor-pointer">
                        <input
                          type="checkbox"
                          checked={selectedGroupIds.includes(g.id)}
                          onChange={() => toggleGroupInSelection(g.id)}
                          className="rounded"
                        />
                        <span className="text-sm text-gray-700">{g.name}</span>
                        {!g.is_active && <span className="text-xs text-gray-400">(معطل)</span>}
                      </label>
                    ))}
                  </div>
                  <button
                    onClick={createList}
                    className="w-full py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700"
                  >
                    حفظ القائمة ({selectedGroupIds.length} مجموعة)
                  </button>
                  {lists.length > 0 && (
                    <div className="border-t border-blue-200 pt-3 space-y-1">
                      <p className="text-xs text-blue-700 font-medium mb-2">القوائم المحفوظة:</p>
                      {lists.map(list => (
                        <div key={list.id} className="flex items-center justify-between px-2 py-1.5 bg-white rounded-lg">
                          <span className="text-sm text-gray-700">📋 {list.name} ({list.groupIds.length} مجموعة)</span>
                          <button onClick={() => deleteList(list.id)} className="text-red-400 hover:text-red-600">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* نص المنشور */}
              <div>
                <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-2">
                  <FileText className="w-4 h-4 text-blue-500" />
                  نص المنشور *
                </label>
                <textarea
                  value={text}
                  onChange={e => setText(e.target.value)}
                  rows={5}
                  placeholder="اكتب نص المنشور هنا..."
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <div className="text-xs text-gray-400 text-left mt-1">{text.length} حرف</div>
              </div>

              {/* الصور */}
              <div>
                <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-2">
                  <Image className="w-4 h-4 text-green-500" />
                  الصور (اختياري)
                </label>
                {images.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-3">
                    {images.map((img, i) => (
                      <div key={i} className="relative group w-20 h-20">
                        <img src={img.preview} alt="" className="w-full h-full object-cover rounded-lg border border-gray-200" />
                        <button onClick={() => removeImage(i)} className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                          <X className="w-3 h-3 text-white" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                <button onClick={() => imageInputRef.current.click()} className="w-full py-2.5 border-2 border-dashed border-gray-200 rounded-xl text-sm text-gray-500 hover:border-green-400 hover:text-green-600 hover:bg-green-50 transition-all flex items-center justify-center gap-2">
                  <Image className="w-4 h-4" /> اضغط لإضافة صور
                </button>
                <input ref={imageInputRef} type="file" accept="image/*" multiple className="hidden" onChange={handleImageChange} />
              </div>

              {/* الفيديو */}
              <div>
                <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-2">
                  <Video className="w-4 h-4 text-purple-500" />
                  فيديو (اختياري)
                </label>
                {video ? (
                  <div className="flex items-center gap-3 p-3 bg-purple-50 border border-purple-200 rounded-xl">
                    <Video className="w-5 h-5 text-purple-500 shrink-0" />
                    <span className="text-sm text-gray-700 truncate flex-1">{video.file.name}</span>
                    <button onClick={removeVideo} className="text-red-400 hover:text-red-600"><Trash2 className="w-4 h-4" /></button>
                  </div>
                ) : (
                  <button onClick={() => videoInputRef.current.click()} className="w-full py-2.5 border-2 border-dashed border-gray-200 rounded-xl text-sm text-gray-500 hover:border-purple-400 hover:text-purple-600 hover:bg-purple-50 transition-all flex items-center justify-center gap-2">
                    <Video className="w-4 h-4" /> اضغط لإضافة فيديو
                  </button>
                )}
                <input ref={videoInputRef} type="file" accept="video/*" className="hidden" onChange={handleVideoChange} />
              </div>

              {error && (
                <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-600">
                  <XCircle className="w-4 h-4 shrink-0" /> {error}
                </div>
              )}
            </div>
          )}

          {/* ===== PUBLISHING ===== */}
          {step === 'publishing' && (
            <div className="p-8 flex flex-col items-center text-center space-y-6">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center">
                <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-900 mb-1">جاري النشر...</h3>
                <p className="text-sm text-gray-500">يتم النشر في المجموعات تلقائياً</p>
              </div>
              <div className="w-full space-y-2">
                <div className="flex justify-between text-xs text-gray-500">
                  <span>{Math.round(progressPct)}%</span>
                  <span>{(progress?.success_count || 0) + (progress?.failed_count || 0)} / {progress?.total_groups || 0} مجموعة</span>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-2.5 overflow-hidden">
                  <div className="h-full bg-blue-500 rounded-full transition-all duration-500" style={{ width: `${progressPct}%` }} />
                </div>
              </div>
              <div className="flex gap-4 w-full">
                <div className="flex-1 p-3 bg-green-50 rounded-xl text-center">
                  <div className="text-xl font-bold text-green-600">{progress?.success_count || 0}</div>
                  <div className="text-xs text-gray-500 mt-0.5">نجح</div>
                </div>
                <div className="flex-1 p-3 bg-red-50 rounded-xl text-center">
                  <div className="text-xl font-bold text-red-500">{progress?.failed_count || 0}</div>
                  <div className="text-xs text-gray-500 mt-0.5">فشل</div>
                </div>
                <div className="flex-1 p-3 bg-gray-50 rounded-xl text-center">
                  <div className="text-xl font-bold text-gray-700">{progress?.total_groups || 0}</div>
                  <div className="text-xs text-gray-500 mt-0.5">إجمالي</div>
                </div>
              </div>

              {/* ✅ زر إنهاء يدوي إذا انتهى البوت فعلاً */}
              <button
                onClick={() => { clearInterval(pollRef.current); setStep('done'); }}
                className="text-xs text-gray-400 underline hover:text-gray-600"
              >
                انتهى النشر؟ اضغط هنا لإغلاق شاشة التحميل
              </button>
            </div>
          )}

          {/* ===== DONE ===== */}
          {step === 'done' && (
            <div className="p-6 space-y-5">
              {/* ملخص */}
              <div className="flex flex-col items-center text-center space-y-3">
                <div className={`w-14 h-14 rounded-full flex items-center justify-center ${progress?.failed_count === 0 ? 'bg-green-100' : 'bg-yellow-100'}`}>
                  <CheckCircle className={`w-7 h-7 ${progress?.failed_count === 0 ? 'text-green-600' : 'text-yellow-500'}`} />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-900">
                    {progress?.failed_count === 0 ? '✅ تم النشر بنجاح!' : '⚠️ اكتمل النشر مع بعض الأخطاء'}
                  </h3>
                  <p className="text-sm text-gray-500">رقم المنشور: #{postId}</p>
                </div>
              </div>

              {/* الأرقام */}
              <div className="flex gap-3">
                <div className="flex-1 p-3 bg-green-50 rounded-xl text-center">
                  <div className="text-2xl font-bold text-green-600">{progress?.success_count || 0}</div>
                  <div className="text-xs text-gray-500 mt-0.5">نجح</div>
                </div>
                <div className="flex-1 p-3 bg-red-50 rounded-xl text-center">
                  <div className="text-2xl font-bold text-red-500">{progress?.failed_count || 0}</div>
                  <div className="text-xs text-gray-500 mt-0.5">فشل</div>
                </div>
                <div className="flex-1 p-3 bg-gray-50 rounded-xl text-center">
                  <div className="text-2xl font-bold text-gray-700">{progress?.total_groups || 0}</div>
                  <div className="text-xs text-gray-500 mt-0.5">إجمالي</div>
                </div>
              </div>

              {/* شريط النجاح */}
              <div>
                <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
                  <div className="h-full bg-green-500 rounded-full" style={{ width: `${successRate}%` }} />
                </div>
                <p className="text-xs text-gray-400 text-center mt-1">معدل النجاح: {successRate}%</p>
              </div>

              {/* ✅ جدول المجموعات مع رابط المنشور */}
              {results.length > 0 && (
                <div>
                  <h4 className="text-sm font-semibold text-gray-700 mb-2">تفاصيل المجموعات:</h4>
                  <div className="border border-gray-100 rounded-xl overflow-hidden">
                    <div className="max-h-52 overflow-y-auto">
                      <table className="w-full text-sm">
                        <thead className="bg-gray-50 sticky top-0">
                          <tr>
                            <th className="text-right px-3 py-2 text-xs text-gray-500 font-medium">المجموعة</th>
                            <th className="text-center px-3 py-2 text-xs text-gray-500 font-medium">الحالة</th>
                            <th className="text-center px-3 py-2 text-xs text-gray-500 font-medium">المنشور</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                          {results.map((r, i) => (
                            <tr key={i} className="hover:bg-gray-50">
                              <td className="px-3 py-2 text-gray-800 font-medium truncate max-w-[160px]">
                                {r.group_name || r.group_id}
                              </td>
                              <td className="px-3 py-2 text-center">
                                {r.status === 'success' ? (
                                  <span className="inline-flex items-center gap-1 text-green-600 text-xs bg-green-50 px-2 py-0.5 rounded-full">
                                    <CheckCircle className="w-3 h-3" /> نجح
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 text-red-500 text-xs bg-red-50 px-2 py-0.5 rounded-full">
                                    <XCircle className="w-3 h-3" /> فشل
                                  </span>
                                )}
                              </td>
                              <td className="px-3 py-2 text-center">
                                {r.post_url ? (
                                  <a
                                    href={r.post_url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-800 text-xs"
                                  >
                                    <ExternalLink className="w-3 h-3" /> فتح
                                  </a>
                                ) : (
                                  <span className="text-gray-300 text-xs">-</span>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {/* إذا لم تكن هناك نتائج تفصيلية من الـ API */}
              {results.length === 0 && (
                <p className="text-xs text-gray-400 text-center">
                  💡 لعرض روابط المنشورات، تأكد أن الـ API يُرجع حقل <code>results</code> في status endpoint
                </p>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-100 flex gap-3">
          {step === 'form' && (
            <>
              <button onClick={handleClose} className="px-4 py-2.5 text-sm font-medium text-gray-600 bg-gray-100 rounded-xl hover:bg-gray-200">
                إلغاء
              </button>
              <button
                onClick={handlePublish}
                disabled={!text.trim() || targetGroups.length === 0}
                className="flex-1 py-2.5 text-sm font-semibold text-white bg-blue-600 rounded-xl hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                <Send className="w-4 h-4" />
                نشر في {targetGroups.length} مجموعة
              </button>
            </>
          )}
          {step === 'publishing' && (
            <div className="flex-1 py-2.5 text-sm text-center text-gray-400">
              يُرجى الانتظار حتى اكتمال النشر...
            </div>
          )}
          {step === 'done' && (
            <button onClick={handleClose} className="flex-1 py-2.5 text-sm font-semibold text-white bg-blue-600 rounded-xl hover:bg-blue-700">
              إغلاق
            </button>
          )}
        </div>
      </div>
    </div>
  );
}