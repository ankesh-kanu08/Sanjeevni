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

const TimelineEvent = ({ event }) => {
  const [expanded, setExpanded] = useState(false);
  const Icon = iconMap[event.eventType] || Activity;
  const colors = severityColor[event.severity] || severityColor.info;

  return (
    <div className="relative pl-6">
      <div className={`absolute -left-[22px] p-1.5 rounded-full border bg-white ${colors}`}>
        <Icon size={16} />
      </div>
      <div className="bg-white border rounded-lg p-4 shadow-sm">
        <div className="flex justify-between items-start mb-2">
          <div>
            <h4 className="font-semibold text-slate-800">{event.title}</h4>
            <p className="text-sm text-slate-600 mt-1">{event.description}</p>
          </div>
          <span className="text-xs text-slate-400 whitespace-nowrap ml-4">
            {eventDate(event.createdAt) ? formatDistanceToNow(eventDate(event.createdAt), { addSuffix: true }) : 'Time unavailable'}
          </span>
        </div>
        {event.data && (
          <div className="mt-2">
            <button 
              onClick={() => setExpanded(!expanded)}
              className="text-xs text-teal-600 flex items-center hover:text-teal-700 font-medium"
            >
              {expanded ? <ChevronUp size={14} className="mr-1" /> : <ChevronDown size={14} className="mr-1" />}
              {expanded ? 'Hide Details' : 'View Details'}
            </button>
            {expanded && (
              <pre className="mt-2 p-3 bg-slate-50 rounded text-xs text-slate-700 overflow-x-auto border border-slate-100">
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
