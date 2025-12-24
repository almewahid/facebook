// frontend/app/components/StatusBadge.jsx

'use client';

export default function StatusBadge({ status }) {
  const styles = {
    success: 'bg-green-100 text-green-700',
    failed: 'bg-red-100 text-red-700',
    skipped: 'bg-yellow-100 text-yellow-700',
    pending: 'bg-blue-100 text-blue-700'
  };

  const labels = {
    success: 'نجح',
    failed: 'فشل',
    skipped: 'تخطي',
    pending: 'قيد الانتظار'
  };

  return (
    <span className={`px-2 py-1 rounded-full text-xs font-medium ${styles[status]}`}>
      {labels[status] || status}
    </span>
  );
}
