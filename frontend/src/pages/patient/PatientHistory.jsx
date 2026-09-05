import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';
import useAuth from '../../hooks/useAuth';
import patientService from '../../services/patientService';

export default function PatientHistory() {
  const { user } = useAuth();
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const patientRes = await patientService.getMyRecord();
        const patientId = patientRes.data?._id;
        if (patientId) {
          const res = await patientService.getCheckIns(patientId);
          setHistory(res.data || []);
        }
      } catch (err) {
        console.error("Error fetching history", err);
      } finally {
        setLoading(false);
      }
    };
    fetchHistory();
  }, []);

  const getMoodEmoji = (mood) => {
    if (mood === 'better') return '😊';
    if (mood === 'same') return '😐';
    if (mood === 'worse') return '😟';
    return '📝';
  };

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8 max-w-3xl mx-auto pb-24">
      <h1 className="text-3xl font-bold text-gray-900 mb-8">My History</h1>

      {loading ? (
        <div className="text-xl text-center text-gray-500 py-10">Loading history...</div>
      ) : history.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-sm p-10 text-center border border-gray-100">
          <p className="text-2xl text-gray-600">No check-ins yet.</p>
          <p className="text-xl text-gray-500 mt-2">Complete your first check-in!</p>
        </div>
      ) : (
        <div className="space-y-6">
          {history.map((record, index) => (
            <div key={index} className="bg-white rounded-2xl shadow-sm p-6 border border-gray-100">
              <div className="flex items-center justify-between mb-4 pb-4 border-b border-gray-100">
                <span className="text-xl font-bold text-gray-800">
                  {record.date ? format(new Date(record.date), 'MMMM do, yyyy') : 'Unknown Date'}
                </span>
                <span className="text-4xl">{getMoodEmoji(record.mood)}</span>
              </div>
              
              <div className="space-y-4">
                {record.feelingDesc && (
                  <p className="text-lg text-gray-700 italic">"{record.feelingDesc}"</p>
                )}
                
                {record.symptoms && record.symptoms.length > 0 && (
                  <div>
                    <h4 className="text-lg font-semibold text-gray-900 mb-2">Symptoms reported:</h4>
                    <div className="flex flex-wrap gap-2">
                      {record.symptoms.map(symp => (
                        <span key={symp} className="bg-gray-100 text-gray-800 px-4 py-2 rounded-lg text-base">
                          {symp}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {record.vitals && (record.vitals.spo2 || record.vitals.heartRate) && (
                  <div>
                    <h4 className="text-lg font-semibold text-gray-900 mb-2">Vitals:</h4>
                    <div className="flex gap-4 text-base text-gray-700">
                      {record.vitals.spo2 && <span>SpO2: <strong className="text-teal-700">{record.vitals.spo2}%</strong></span>}
                      {record.vitals.heartRate && <span>HR: <strong className="text-teal-700">{record.vitals.heartRate} bpm</strong></span>}
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
