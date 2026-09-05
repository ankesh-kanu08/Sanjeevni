import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import workerService from '../../services/workerService';
import RiskBadge from '../../components/common/RiskBadge';

export default function WorkerTasks() {
  const navigate = useNavigate();
  const [tasks, setTasks] = useState([]);
  const [filter, setFilter] = useState('All');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTasks = async () => {
      try {
        const res = await workerService.getTasks();
        setTasks(res || []);
      } catch (err) {
        console.error('Error fetching tasks', err);
      } finally {
        setLoading(false);
      }
    };
    fetchTasks();
  }, []);

  const getStatusBadge = (status) => {
    if (status === 'completed') return <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">Completed</span>;
    if (status === 'in_progress') return <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">In Progress</span>;
    return <span className="px-2 py-1 bg-amber-100 text-amber-800 text-xs rounded-full">Pending</span>;
  };

  const filteredTasks = tasks.filter(task => {
    if (filter === 'All') return true;
    return task.status === filter.toLowerCase().replace(' ', '_');
  });

  return (
    <div className="min-h-screen bg-slate-50 p-4 max-w-7xl mx-auto pb-24">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">My Tasks</h1>

      <div className="flex space-x-2 mb-6 overflow-x-auto pb-2">
        {['All', 'Pending', 'In Progress', 'Completed'].map(tab => (
          <button
            key={tab}
            onClick={() => setFilter(tab)}
            className={`whitespace-nowrap px-4 py-2 rounded-full text-sm font-medium ${
              filter === tab ? 'bg-teal-600 text-white' : 'bg-white text-gray-600 border border-gray-200'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="text-center py-10 text-gray-500">Loading tasks...</div>
      ) : filteredTasks.length === 0 ? (
        <div className="bg-white p-8 rounded-xl text-center shadow-sm border border-gray-100">
          <p className="text-gray-600">No tasks found for this filter.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredTasks.map(task => (
            <div key={task.id} className="bg-white rounded-xl shadow-sm border-l-4 border-teal-500 p-4">
              <div className="flex justify-between items-start mb-2">
                <button 
                  onClick={() => navigate(`/worker/patient/${task.patientId}`)}
                  className="font-semibold text-lg text-gray-900 hover:text-teal-600 text-left"
                >
                  {task.patientName}
                </button>
                <RiskBadge riskLevel={task.riskLevel} />
              </div>
              
              <div className="mb-3">
                <p className="text-sm text-gray-700 font-medium mb-1">{task.assignedReason}</p>
                <div className="flex flex-wrap gap-2 mt-2">
                  {(task.requiredMeasurements || []).map(measure => (
                    <span key={measure} className="bg-gray-100 text-gray-600 text-xs px-2 py-1 rounded">
                      {measure}
                    </span>
                  ))}
                </div>
              </div>
              
              <div className="flex justify-between items-center mt-4 pt-3 border-t border-gray-50">
                {getStatusBadge(task.status)}
                {task.status !== 'completed' && (
                  <button 
                    onClick={() => navigate(`/worker/visit/${task.patientId}`)}
                    className="text-teal-600 text-sm font-medium hover:text-teal-700"
                  >
                    Start Visit &rarr;
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
