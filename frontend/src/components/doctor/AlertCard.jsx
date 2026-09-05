import React from 'react';
import { formatDistanceToNow } from 'date-fns';
import { ShieldAlert, CheckCircle } from 'lucide-react';

const AlertCard = ({ alert, onReview, onMarkRead }) => {
  const isHighRisk = alert.riskLevel === 'HIGH';

  return (
    <div className={`relative bg-white rounded-lg shadow-sm border overflow-hidden ${isHighRisk ? 'border-red-400' : 'border-slate-200'} ${alert.isRead ? 'opacity-75' : 'opacity-100'}`}>
      {isHighRisk && (
        <div className="bg-red-100 text-red-800 text-xs font-bold px-3 py-1 flex items-center">
          <ShieldAlert size={14} className="mr-1.5" /> URGENT
        </div>
      )}
      <div className={`p-4 ${isHighRisk ? 'border-l-4 border-l-red-500' : ''}`}>
        <div className="flex justify-between items-start mb-3">
          <div>
            <h3 className="font-bold text-lg text-slate-800">
              {alert.patient?.name || 'Unknown Patient'} <span className="text-sm font-normal text-slate-500">({alert.patient?.age || 'N/A'}y)</span>
            </h3>
            <span className="text-xs text-slate-400">
              {alert.createdAt ? formatDistanceToNow(new Date(alert.createdAt), { addSuffix: true }) : 'Recently'}
            </span>
          </div>
          <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
            alert.riskLevel === 'HIGH' ? 'bg-red-100 text-red-700' : 
            alert.riskLevel === 'MEDIUM' ? 'bg-amber-100 text-amber-700' : 
            'bg-green-100 text-green-700'
          }`}>
            {alert.riskLevel} RISK
          </span>
        </div>

        <h4 className="font-semibold text-slate-700 mb-1">{alert.title}</h4>
        <p className="text-sm text-slate-600 mb-3">{alert.message}</p>
        
        {alert.reasons && alert.reasons.length > 0 && (
          <ul className="text-sm text-slate-600 mb-4 list-disc pl-5 space-y-1">
            {alert.reasons.map((reason, idx) => (
              <li key={idx}>{reason}</li>
            ))}
          </ul>
        )}

        <div className="flex space-x-3 mt-4">
          <button 
            onClick={() => onReview && onReview(alert)}
            className="flex-1 bg-teal-600 text-white py-2 px-4 rounded-md text-sm font-medium hover:bg-teal-700 transition-colors"
          >
            Review Patient
          </button>
          {!alert.isRead && (
            <button 
              onClick={() => onMarkRead && onMarkRead(alert._id)}
              className="flex items-center justify-center flex-1 bg-slate-100 text-slate-700 py-2 px-4 rounded-md text-sm font-medium hover:bg-slate-200 transition-colors"
            >
              <CheckCircle size={16} className="mr-1.5" /> Mark Read
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default AlertCard;
