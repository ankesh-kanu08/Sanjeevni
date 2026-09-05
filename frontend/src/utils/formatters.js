import { format, formatDistanceToNow as fdtNow } from 'date-fns';

export const formatDate = (date) => {
  if (!date) return '';
  return format(new Date(date), 'MMM dd, yyyy');
};

export const formatDateTime = (date) => {
  if (!date) return '';
  return format(new Date(date), 'MMM dd, yyyy HH:mm');
};

export const formatRelativeTime = (date) => {
  if (!date) return '';
  return fdtNow(new Date(date), { addSuffix: true });
};

export const getRiskColor = (level) => {
  switch (level?.toUpperCase()) {
    case 'LOW':
      return { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200' };
    case 'MEDIUM':
      return { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200' };
    case 'HIGH':
      return { bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200' };
    default:
      return { bg: 'bg-slate-50', text: 'text-slate-700', border: 'border-slate-200' };
  }
};

export const getRiskBgClass = (level) => {
  switch (level?.toUpperCase()) {
    case 'LOW': return 'bg-emerald-600';
    case 'MEDIUM': return 'bg-amber-500';
    case 'HIGH': return 'bg-red-600';
    default: return 'bg-slate-400';
  }
};

export const capitalize = (str) => {
  if (typeof str !== 'string') return '';
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
};
