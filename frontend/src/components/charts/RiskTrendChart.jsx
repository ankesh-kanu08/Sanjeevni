import React from 'react';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine, ReferenceArea } from 'recharts';
import { format } from 'date-fns';

const RiskTrendChart = ({ data }) => {
  const formattedData = data?.map(item => ({
    ...item,
    formattedDate: item.date ? format(new Date(item.date), 'MMM dd') : ''
  })) || [];

  return (
    <div className="h-72 w-full">
      {formattedData.length > 0 ? (
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={formattedData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="colorRisk" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
            <XAxis dataKey="formattedDate" tick={{ fontSize: 12, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
            <YAxis domain={[0, 100]} tick={{ fontSize: 12, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
            
            {/* Risk Zones */}
            <ReferenceArea y1={0} y2={40} fill="#10b981" fillOpacity={0.05} />
            <ReferenceArea y1={40} y2={70} fill="#f59e0b" fillOpacity={0.05} />
            <ReferenceArea y1={70} y2={100} fill="#ef4444" fillOpacity={0.05} />
            
            <ReferenceLine y={40} stroke="#10b981" strokeDasharray="3 3" strokeOpacity={0.5} />
            <ReferenceLine y={70} stroke="#ef4444" strokeDasharray="3 3" strokeOpacity={0.5} />

            <Tooltip 
              contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
            />
            <Area 
              type="monotone" 
              dataKey="riskScore" 
              stroke="#3b82f6" 
              strokeWidth={2}
              fillOpacity={1} 
              fill="url(#colorRisk)" 
              name="Risk Score"
            />
          </AreaChart>
        </ResponsiveContainer>
      ) : (
        <div className="h-full flex items-center justify-center text-slate-400">
          No risk history available
        </div>
      )}
    </div>
  );
};

export default RiskTrendChart;
