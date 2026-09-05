import React from 'react';
import { User, MapPin, Clock, ChevronRight } from 'lucide-react';
import RiskBadge from './RiskBadge';
import { formatRelativeTime } from '../../utils/formatters';

const PatientCard = ({ patient, onClick, showActions = true }) => {
  const getBorderColor = (level) => {
    switch (level?.toUpperCase()) {
      case 'LOW': return 'border-emerald-500';
      case 'MEDIUM': return 'border-amber-500';
      case 'HIGH': return 'border-red-600';
      default: return 'border-slate-300';
    }
  };

  const borderClass = getBorderColor(patient?.currentRiskLevel);

  return (
    <div 
      onClick={() => onClick && onClick(patient)}
      className={`bg-white rounded-xl border border-slate-200 border-l-4 ${borderClass} shadow-sm hover:shadow-md transition-shadow p-4 flex flex-col ${onClick ? 'cursor-pointer' : ''}`}
    >
      <div className="flex justify-between items-start mb-3">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-500">
            <User size={20} />
          </div>
          <div>
            <h3 className="font-semibold text-slate-900 text-lg leading-tight">{patient?.userId?.name || 'Unknown'}</h3>
            <div className="text-sm text-slate-500 mt-0.5">
              {patient?.age} y/o • {patient?.gender}
            </div>
          </div>
        </div>
        <RiskBadge level={patient?.currentRiskLevel} size="sm" />
      </div>

      <div className="mt-2 space-y-2">
        <div className="text-sm font-medium text-slate-700 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-100">
          <span className="text-slate-500 mr-1">Dx:</span> {patient?.diagnosis || 'N/A'}
        </div>
        
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-slate-600">
          <div className="flex items-center gap-1.5">
            <MapPin size={14} className="text-slate-400" />
            <span>
              {patient?.locationType || 'Unknown'}
              {patient?.locationType?.toLowerCase() === 'rural' && <span className="ml-1.5 w-2 h-2 rounded-full bg-emerald-500 inline-block"></span>}
              {patient?.locationType?.toLowerCase() === 'urban' && <span className="ml-1.5 w-2 h-2 rounded-full bg-blue-500 inline-block"></span>}
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <Clock size={14} className="text-slate-400" />
            <span>{patient?.lastCheckInTime ? formatRelativeTime(patient.lastCheckInTime) : 'Never'}</span>
          </div>
        </div>
      </div>

      {showActions && (
        <div className="mt-4 pt-3 border-t border-slate-100 flex justify-end">
          <button className="flex items-center gap-1 text-sm font-medium text-teal-600 hover:text-teal-700">
            View Details <ChevronRight size={16} />
          </button>
        </div>
      )}
    </div>
  );
};

export default PatientCard;
