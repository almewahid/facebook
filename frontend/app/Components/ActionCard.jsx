// frontend/app/components/ActionCard.jsx

'use client';

export default function ActionCard({ icon, title, description, color = 'blue', onClick }) {
  const colors = {
    blue: 'bg-gradient-to-br from-blue-500 to-blue-600',
    purple: 'bg-gradient-to-br from-purple-500 to-purple-600',
    green: 'bg-gradient-to-br from-green-500 to-green-600',
    orange: 'bg-gradient-to-br from-orange-500 to-orange-600',
    red: 'bg-gradient-to-br from-red-500 to-red-600',
    indigo: 'bg-gradient-to-br from-indigo-500 to-indigo-600'
  };

  return (
    <button
      onClick={onClick}
      className={`${colors[color]} text-white rounded-xl p-6 text-right hover:shadow-lg transition transform hover:-translate-y-1`}
    >
      <div className="flex items-center space-x-3 space-x-reverse mb-2">
        {icon}
        <h3 className="font-semibold">{title}</h3>
      </div>
      <p className="text-sm opacity-90">{description}</p>
    </button>
  );
}
