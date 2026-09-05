import React from 'react';

const StatCard = ({ title, value, icon: Icon, color = 'teal', trend = null, subtitle }) => {
  const colorMap = {
    teal: { text: 'text-teal-600', bg: 'bg-teal-50', border: 'border-teal-500' },
    red: { text: 'text-red-600', bg: 'bg-red-50', border: 'border-red-500' },
    amber: { text: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-500' },
    green: { text: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-500' },
    blue: { text: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-500' }
  };

  const selectedColor = colorMap[color] || colorMap.teal;

  return (
    <div className={`bg-white rounded-xl shadow-sm border border-slate-200 border-l-4 ${selectedColor.border} p-5 flex flex-col`}>
      <div className="flex justify-between items-start mb-4">
        <h3 className="text-sm font-medium text-slate-500">{title}</h3>
        <div className={`p-2 rounded-full ${selectedColor.bg} ${selectedColor.text}`}>
          {Icon && <Icon size={20} />}
        </div>
      </div>
      
      <div className="mt-auto">
        <div className="text-3xl font-bold text-slate-900">{value}</div>
        
        {(subtitle || trend) && (
          <div className="mt-2 text-sm flex items-center gap-2">
            {trend && (
              <span className={`font-medium ${trend > 0 ? 'text-emerald-600' : trend < 0 ? 'text-red-600' : 'text-slate-500'}`}>
                {trend > 0 ? '↑' : trend < 0 ? '↓' : ''} {Math.abs(trend)}%
              </span>
            )}
            <span className="text-slate-500">{subtitle}</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default StatCard;
