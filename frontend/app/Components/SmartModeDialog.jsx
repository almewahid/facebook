'use client';

import React, { useState, useEffect } from 'react';
import { Brain, Sparkles, RefreshCw, Copy, Check, MessageSquare, AlertTriangle, TrendingUp, Clock } from 'lucide-react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';

export default function SmartModeDialog({ open, onClose }) {
  const [tab, setTab] = useState('insights'); // insights | generator
  const [insights, setInsights] = useState([]);
  const [loadingInsights, setLoadingInsights] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);

  const [context, setContext] = useState('');
  const [generatedContent, setGeneratedContent] = useState('');
  const [generating, setGenerating] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (open && tab === 'insights') {
      fetchInsights();
    }
  }, [open, tab]);

  const fetchInsights = async () => {
    setLoadingInsights(true);
    try {
      const res = await fetch(`${API_URL}/stats/ai/insights`);
      if (res.ok) {
        const data = await res.json();
        // تم تحديث البيانات لتتوافق مع هيكل قاعدة البيانات الجديد (AIInsight)
        setInsights(data);
      }
    } catch (e) {
      console.error('Failed to fetch insights', e);
    }
    setLoadingInsights(false);
  };

  const triggerAnalysis = async () => {
    setAnalyzing(true);
    try {
      const res = await fetch(`${API_URL}/stats/ai/analyze`, { method: 'POST' });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || 'Failed');
      }
      // التحليل ناجح، نقوم بتحديث القائمة فوراً
      await fetchInsights();
    } catch (e) {
      alert(`❌ خطأ: ${e.message}`);
    }
    setAnalyzing(false);
  };

  const handleGenerate = async () => {
    if (!context.trim()) return;
    setGenerating(true);
    try {
      const form = new FormData();
      form.append('context', context);
      const res = await fetch(`${API_URL}/stats/ai/generate`, {
        method: 'POST',
        body: form
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || 'Failed');
      }
      const data = await res.json();
      setGeneratedContent(data.content);
      setCopied(false);
    } catch (e) {
      alert(`❌ خطأ: ${e.message}`);
    }
    setGenerating(false);
  };

  const handleCopy = () => {
    if (!generatedContent) return;
    navigator.clipboard.writeText(generatedContent);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const getInsightIcon = (category) => {
    if (category === 'performance') return <TrendingUp className="w-5 h-5 text-green-500" />;
    if (category === 'warning') return <AlertTriangle className="w-5 h-5 text-red-500" />;
    if (category === 'suggestion') return <Sparkles className="w-5 h-5 text-blue-500" />;
    return <Brain className="w-5 h-5 text-purple-500" />;
  };

  const getInsightTitle = (category) => {
    if (category === 'performance') return 'تحليل الأداء';
    if (category === 'warning') return 'تنبيهات Gemini';
    if (category === 'suggestion') return 'مقترحات ذكية';
    return 'رؤية تحليلية';
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-3xl flex flex-col h-[85vh] shadow-2xl overflow-hidden">

        {/* Header */}
        <div className="flex justify-between items-center px-6 py-4 border-b border-gray-100 bg-gray-50/50">
          <div className="flex items-center gap-3">
            <div className="bg-red-100 text-red-600 p-2 rounded-xl">
              <Brain className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">الوضع الذكي (Gemini AI)</h2>
              <p className="text-xs text-gray-500">تحليل 76 منشوراً وتوليد المحتوى بالذكاء الاصطناعي</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition">
            ✖
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-200">
          <button
            onClick={() => setTab('insights')}
            className={`flex-1 py-3 text-sm font-medium transition-colors ${tab === 'insights' ? 'border-b-2 border-red-600 text-red-600' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'}`}
          >
            📊 تحليل الأداء والرؤى
          </button>
          <button
            onClick={() => setTab('generator')}
            className={`flex-1 py-3 text-sm font-medium transition-colors ${tab === 'generator' ? 'border-b-2 border-red-600 text-red-600' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'}`}
          >
            ✍️ توليد محتوى تفاعلي
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 bg-gray-50">
          {tab === 'insights' && (
            <div className="space-y-6">
              <div className="flex justify-between items-center bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
                <div>
                  <h3 className="font-bold text-gray-800">تحديث التحليل الذكي</h3>
                  <p className="text-xs text-gray-500">يقوم Gemini بدراسة سجلات النشر لتقديم اقتراحات مخصصة</p>
                </div>
                <button
                  onClick={triggerAnalysis}
                  disabled={analyzing}
                  className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white px-5 py-2.5 rounded-lg text-sm font-bold shadow-md transition-all disabled:opacity-50"
                >
                  {analyzing ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Brain className="w-4 h-4" />}
                  {analyzing ? 'جاري التحليل...' : 'بدء التحليل'}
                </button>
              </div>

              {loadingInsights ? (
                <div className="flex justify-center p-10"><RefreshCw className="w-8 h-8 text-gray-300 animate-spin" /></div>
              ) : insights.length === 0 ? (
                <div className="text-center p-10 text-gray-400">
                  <Brain className="w-12 h-12 mx-auto mb-3 opacity-20" />
                  <p>لا توجد رؤى متاحة حالياً. ابدأ التحليل للحصول على نتائج.</p>
                </div>
              ) : (
                <div className="grid gap-4">
                  {insights.map(insight => (
                    <div key={insight.id} className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm relative overflow-hidden">
                      <div className={`absolute top-0 right-0 w-2 h-full ${insight.category === 'warning' ? 'bg-orange-500' : 'bg-red-500'}`}></div>
                      <div className="flex items-center gap-2 mb-3">
                        {getInsightIcon(insight.category)}
                        <h4 className="font-bold text-gray-800">{getInsightTitle(insight.category)}</h4>
                        <span className="text-xs text-gray-400 mr-auto flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {new Date(insight.created_at).toLocaleString('ar-EG', { dateStyle: 'short', timeStyle: 'short' })}
                        </span>
                      </div>
                      <div className="text-gray-700 text-sm leading-relaxed whitespace-pre-wrap bg-gray-50 p-3 rounded-lg border border-gray-100">
                        {/* استخدام الحقل الصحيح insight بدلاً من content */}
                        {insight.insight}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {tab === 'generator' && (
            <div className="h-full flex flex-col gap-4">
              <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
                <h3 className="font-bold text-gray-800 mb-2 flex items-center gap-2">
                  <MessageSquare className="w-5 h-5 text-indigo-500" />
                  عن ماذا تريد التحدث؟
                </h3>
                <textarea
                  className="w-full border border-gray-300 rounded-lg p-3 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all min-h-[100px] resize-none"
                  placeholder="مثال: اكتب منشوراً عن مميزات البوت لزيادة المبيعات مع إيموجيات جذابة..."
                  value={context}
                  onChange={e => setContext(e.target.value)}
                />
                <div className="mt-3 flex justify-end">
                  <button
                    onClick={handleGenerate}
                    disabled={generating || !context.trim()}
                    className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-lg text-sm font-bold shadow-md transition-all disabled:opacity-50"
                  >
                    {generating ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                    {generating ? 'جاري التوليد...' : 'توليد المنشور'}
                  </button>
                </div>
              </div>

              {generatedContent && (
                <div className="bg-white p-5 rounded-xl border border-indigo-200 shadow-sm flex-1 flex flex-col">
                  <div className="flex justify-between items-center mb-3">
                    <h3 className="font-bold text-indigo-900 flex items-center gap-2">
                      <Check className="w-5 h-5 text-green-500" />
                      المنشور المقترح
                    </h3>
                    <button
                      onClick={handleCopy}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${copied ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
                    >
                      {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                      {copied ? 'تم النسخ!' : 'نسخ النص'}
                    </button>
                  </div>
                  <div className="flex-1 bg-indigo-50/50 rounded-lg p-4 text-gray-800 text-sm whitespace-pre-wrap border border-indigo-100 leading-relaxed overflow-y-auto">
                    {generatedContent}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}