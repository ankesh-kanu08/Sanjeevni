import React, { useState } from 'react';
import { Hospital, ClipboardList, Activity, Shield, UserCheck, Bell, Stethoscope, Flag, ChevronDown, ChevronUp } from 'lucide-react';
import { formatDistanceToNow, format, isValid } from 'date-fns';

const eventDate = (value) => {
  const date = value ? new Date(value) : null;
  return date && isValid(date) ? date : null;
};

const iconMap = {
  discharge: Hospital,
  checkin: ClipboardList,
  vital_measurement: Activity,
  risk_assessment: Shield,
  worker_visit: UserCheck,
  alert: Bell,
  doctor_decision: Stethoscope,
  outcome: Flag
};

const severityColor = {
  info: 'bg-teal-100 text-teal-600 border-teal-200',
  warning: 'bg-amber-100 text-amber-600 border-amber-200',
  critical: 'bg-red-100 text-red-600 border-red-200'
};

const PatientTimeline = ({ events = [] }) => {
  if (!events.length) {
    return <div className="text-center py-8 text-slate-500">No timeline events yet</div>;
  }

  // Group by day
  const groupedEvents = events.reduce((acc, event) => {
    const date = eventDate(event.createdAt);
    const label = date ? format(date, 'MMM dd, yyyy') : 'Unknown date';
    if (!acc[label]) acc[label] = [];
    acc[label].push(event);
    return acc;
  }, {});

  return (
    <div className="relative border-l-2 border-slate-200 ml-4 my-6">
      {Object.entries(groupedEvents).map(([date, dayEvents]) => (
        <div key={date} className="mb-8">
          <div className="absolute -left-3 -ml-[1px] bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-500 rounded-full">
            {date}
          </div>
          <div className="mt-8 space-y-6">
            {dayEvents.map((event, idx) => (
              <TimelineEvent key={idx} event={event} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
};

const sourceLabels = {
  hospital: { label: 'Hospital Discharge Record', color: 'bg-indigo-50 text-indigo-700 border-indigo-200' },
  patient: { label: 'Patient Voice Check-in', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  worker: { label: 'ASHA Field Assessment', color: 'bg-purple-50 text-purple-700 border-purple-200' },
  ai: { label: 'AI Risk Engine', color: 'bg-teal-50 text-teal-700 border-teal-200' },
  doctor: { label: 'Doctor Clinical Decision', color: 'bg-blue-50 text-blue-700 border-blue-200' }
};

const TimelineEvent = ({ event }) => {
  const [expanded, setExpanded] = useState(false);
  const Icon = iconMap[event.eventType] || Activity;
  const colors = severityColor[event.severity] || severityColor.info;
  const sourceInfo = sourceLabels[event.sourceRole] || (event.sourceRole ? { label: event.sourceRole, color: 'bg-slate-50 text-slate-700 border-slate-200' } : null);

  return (
    <div className="relative pl-6">
      <div className={`absolute -left-[22px] p-1.5 rounded-full border bg-white ${colors}`}>
        <Icon size={16} />
      </div>
      <div className="bg-white border rounded-lg p-4 shadow-sm hover:border-slate-300 transition-colors">
        <div className="flex justify-between items-start mb-1.5">
          <div>
            <h4 className="font-semibold text-slate-800 text-sm">{event.title}</h4>
            <p className="text-xs sm:text-sm text-slate-600 mt-0.5">{event.description}</p>
          </div>
          <span className="text-[11px] text-slate-400 whitespace-nowrap ml-3">
            {eventDate(event.createdAt) ? formatDistanceToNow(eventDate(event.createdAt), { addSuffix: true }) : 'Recently'}
          </span>
        </div>

        {sourceInfo && (
          <div className="mt-2 flex items-center">
            <span className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium border ${sourceInfo.color}`}>
              Source: {sourceInfo.label}
            </span>
          </div>
        )}

        {event.data && (
          <div className="mt-2.5 pt-2 border-t border-slate-100">
            <button 
              onClick={() => setExpanded(!expanded)}
              className="text-xs text-teal-600 flex items-center hover:text-teal-700 font-medium"
            >
              {expanded ? <ChevronUp size={14} className="mr-1" /> : <ChevronDown size={14} className="mr-1" />}
              {expanded ? 'Hide Clinical Details' : 'View Clinical Details'}
            </button>
            {expanded && (
              <pre className="mt-2 p-3 bg-slate-50 rounded text-xs text-slate-700 overflow-x-auto border border-slate-100 font-mono">
                {JSON.stringify(event.data, null, 2)}
              </pre>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default PatientTimeline;
