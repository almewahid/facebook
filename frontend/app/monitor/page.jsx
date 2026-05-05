'use client';

import React, { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Header from '../Components/Header';
import CampaignMonitor from '../Components/CampaignMonitor';

function MonitorContent() {
  const searchParams = useSearchParams();
  const publishId = searchParams.get('publishId');
  const campaignId = searchParams.get('campaignId');

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-6">
        <a href="/" className="text-blue-600 hover:text-blue-800 font-medium flex items-center gap-2">
          &larr; العودة للداشبورد
        </a>
      </div>
      
      {!publishId && !campaignId ? (
        <div className="p-10 text-center text-gray-500 bg-white rounded-xl shadow-md border border-gray-100">
          لم يتم تحديد عملية نشر لمتابعتها.
        </div>
      ) : (
        <CampaignMonitor publishId={publishId} campaignId={campaignId} />
      )}
    </div>
  );
}

export default function MonitorPage() {
  return (
    <div className="min-h-screen bg-gray-50" dir="rtl">
      <Header />
      <Suspense fallback={<div className="p-10 text-center">جاري التحميل...</div>}>
        <MonitorContent />
      </Suspense>
    </div>
  );
}
