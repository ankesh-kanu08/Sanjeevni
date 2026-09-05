import React from 'react';

export default function RiskBadge({ level, riskLevel, className = '', size = 'md' }) {
  const risk = level || riskLevel;
  let bgColor = 'bg-gray-100';
  let textColor = 'text-gray-800';
  let pulse = false;

  if (risk === 'LOW' || risk === 'Low' || risk === 'low') {
    bgColor = 'bg-emerald-100';
    textColor = 'text-emerald-800';
  } else if (risk === 'MEDIUM' || risk === 'Medium' || risk === 'medium') {
    bgColor = 'bg-amber-100';
    textColor = 'text-amber-800';
  } else if (risk === 'HIGH' || risk === 'High' || risk === 'high') {
    bgColor = 'bg-red-100';
    textColor = 'text-red-800';
    pulse = true;
  }

  return (
    <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${bgColor} ${textColor} ${pulse ? 'animate-pulse' : ''} ${className}`}>
      {risk ? risk.toUpperCase() : 'UNKNOWN'} RISK
    </span>
  );
}
