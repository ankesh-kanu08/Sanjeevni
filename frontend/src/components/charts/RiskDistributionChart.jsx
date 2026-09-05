import React from 'react';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, Legend } from 'recharts';

const RiskDistributionChart = ({ data }) => {
  const chartData = [
    { name: 'Low Risk', value: data?.low || 0, color: '#10b981' },
    { name: 'Medium Risk', value: data?.medium || 0, color: '#f59e0b' },
    { name: 'High Risk', value: data?.high || 0, color: '#ef4444' }
  ].filter(item => item.value > 0);

  const total = chartData.reduce((sum, item) => sum + item.value, 0);

  return (
    <div className="h-64 w-full relative">
      {total > 0 ? (
        <>
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={80}
                paddingAngle={5}
                dataKey="value"
              >
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip 
                formatter={(value) => [`${value} Patients`, 'Count']}
                contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
              />
              <Legend verticalAlign="bottom" height={36} iconType="circle" />
            </PieChart>
          </ResponsiveContainer>
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none pb-8">
            <span className="text-3xl font-bold text-slate-800">{total}</span>
            <span className="text-xs text-slate-500">Total</span>
          </div>
        </>
      ) : (
        <div className="h-full flex items-center justify-center text-slate-400">
          No patient data
        </div>
      )}
    </div>
  );
};

export default RiskDistributionChart;
