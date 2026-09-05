import React from 'react';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine } from 'recharts';
import { format } from 'date-fns';

const VitalsChart = ({ data, dataKey, title, unit, baselineValue, color = '#0891B2' }) => {
  const formattedData = data?.map(item => ({
    ...item,
    formattedDate: item.date ? format(new Date(item.date), 'MMM dd HH:mm') : ''
  })) || [];

  return (
    <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm w-full">
      <h3 className="text-base font-semibold text-slate-800 mb-4">{title}</h3>
      <div className="h-64 w-full">
        {formattedData.length > 0 ? (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={formattedData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
              <XAxis 
                dataKey="formattedDate" 
                axisLine={false} 
                tickLine={false} 
                tick={{ fontSize: 12, fill: '#64748b' }} 
                dy={10}
              />
              <YAxis 
                axisLine={false} 
                tickLine={false} 
                tick={{ fontSize: 12, fill: '#64748b' }} 
                domain={['auto', 'auto']}
                unit={unit}
              />
              <Tooltip
                contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                labelStyle={{ fontWeight: 'bold', color: '#334155' }}
              />
              
              {baselineValue !== undefined && baselineValue !== null && (
                <ReferenceLine 
                  y={baselineValue} 
                  stroke="#ef4444" 
                  strokeDasharray="4 4" 
                  label={{ position: 'top', value: 'Baseline', fill: '#ef4444', fontSize: 12 }} 
                />
              )}
              
              <Line 
                type="monotone" 
                dataKey={dataKey} 
                stroke={color} 
                strokeWidth={3}
                dot={{ r: 4, strokeWidth: 2, fill: '#fff' }}
                activeDot={{ r: 6, strokeWidth: 0 }}
                name={title}
              />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-full flex items-center justify-center text-slate-400">
            No data available
          </div>
        )}
      </div>
    </div>
  );
};

export default VitalsChart;
