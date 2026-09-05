import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import workerService from '../../services/workerService';
import patientService from '../../services/patientService';

const SYMPTOMS = ['Breathlessness', 'Fever', 'Cough', 'Fatigue', 'Pain', 'Dizziness', 'Swelling', 'Confusion', 'Other'];

export default function WorkerVisitForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [patient, setPatient] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    spo2: '',
    heartRate: '',
    temp: '',
    bpSystolic: '',
    bpDiastolic: '',
    respRate: '',
    symptoms: [],
    observations: '',
    notes: ''
  });

  useEffect(() => {
    const fetchPatient = async () => {
      try {
        const res = await patientService.getPatient(id);
        setPatient(res.data);
      } catch (err) {
        console.error('Error fetching patient', err);
      } finally {
        setLoading(false);
      }
    };
    fetchPatient();
  }, [id]);

  const toggleSymptom = (symp) => {
    setFormData(prev => ({
      ...prev,
      symptoms: prev.symptoms.includes(symp)
        ? prev.symptoms.filter(s => s !== symp)
        : [...prev.symptoms, symp]
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const payload = {
        patientId: id,
        timestamp: new Date().toISOString(),
        vitals: {
          spo2: formData.spo2,
          heartRate: formData.heartRate,
          temp: formData.temp,
          bp: `${formData.bpSystolic}/${formData.bpDiastolic}`,
          respRate: formData.respRate
        },
        symptoms: formData.symptoms,
        observations: formData.observations,
        notes: formData.notes
      };
      await workerService.submitVisit(payload);
      toast.success('Assessment submitted successfully!');
      navigate('/worker/dashboard');
    } catch (err) {
      toast.error('Failed to submit assessment');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div className="p-8 text-center text-gray-500">Loading form...</div>;

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8 max-w-lg mx-auto pb-24">
      <h1 className="text-2xl font-bold text-gray-900 mb-2">Record Visit</h1>
      {patient && <p className="text-gray-600 mb-6">Patient: <span className="font-medium text-gray-900">{patient.name}</span></p>}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100">
          <h2 className="font-semibold text-gray-900 mb-4">Vitals</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-gray-600 mb-1">SpO2 (%)</label>
              <input type="number" value={formData.spo2} onChange={e => setFormData({...formData, spo2: e.target.value})} className="w-full p-3 border border-gray-300 rounded-lg focus:ring-teal-500 focus:border-teal-500" placeholder="98" />
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-1">Heart Rate (bpm)</label>
              <input type="number" value={formData.heartRate} onChange={e => setFormData({...formData, heartRate: e.target.value})} className="w-full p-3 border border-gray-300 rounded-lg focus:ring-teal-500 focus:border-teal-500" placeholder="72" />
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-1">Temp (°F)</label>
              <input type="number" step="0.1" value={formData.temp} onChange={e => setFormData({...formData, temp: e.target.value})} className="w-full p-3 border border-gray-300 rounded-lg focus:ring-teal-500 focus:border-teal-500" placeholder="98.6" />
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-1">Resp Rate (/min)</label>
              <input type="number" value={formData.respRate} onChange={e => setFormData({...formData, respRate: e.target.value})} className="w-full p-3 border border-gray-300 rounded-lg focus:ring-teal-500 focus:border-teal-500" placeholder="16" />
            </div>
            <div className="col-span-2">
              <label className="block text-sm text-gray-600 mb-1">Blood Pressure (mmHg)</label>
              <div className="flex items-center gap-2">
                <input type="number" value={formData.bpSystolic} onChange={e => setFormData({...formData, bpSystolic: e.target.value})} className="w-full p-3 border border-gray-300 rounded-lg focus:ring-teal-500 focus:border-teal-500" placeholder="120" />
                <span className="text-gray-400 text-xl">/</span>
                <input type="number" value={formData.bpDiastolic} onChange={e => setFormData({...formData, bpDiastolic: e.target.value})} className="w-full p-3 border border-gray-300 rounded-lg focus:ring-teal-500 focus:border-teal-500" placeholder="80" />
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100">
          <h2 className="font-semibold text-gray-900 mb-4">Symptoms Observed</h2>
          <div className="grid grid-cols-2 gap-3">
            {SYMPTOMS.map(symp => (
              <label key={symp} className="flex items-center gap-2 p-2 rounded-lg hover:bg-gray-50 cursor-pointer">
                <input 
                  type="checkbox" 
                  checked={formData.symptoms.includes(symp)}
                  onChange={() => toggleSymptom(symp)}
                  className="w-5 h-5 text-teal-600 rounded border-gray-300 focus:ring-teal-500"
                />
                <span className="text-sm text-gray-700">{symp}</span>
              </label>
            ))}
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100">
          <h2 className="font-semibold text-gray-900 mb-4">Physical Observations</h2>
          <textarea 
            value={formData.observations}
            onChange={e => setFormData({...formData, observations: e.target.value})}
            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-teal-500 focus:border-teal-500 min-h-[100px]"
            placeholder="Describe patient's physical appearance, breathing effort, etc."
          />
        </div>

        <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100">
          <h2 className="font-semibold text-gray-900 mb-4">Worker Notes</h2>
          <textarea 
            value={formData.notes}
            onChange={e => setFormData({...formData, notes: e.target.value})}
            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-teal-500 focus:border-teal-500 min-h-[80px]"
            placeholder="Any additional notes or concerns..."
          />
        </div>

        <button 
          type="submit"
          disabled={submitting}
          className="w-full bg-teal-600 hover:bg-teal-700 text-white text-lg font-bold py-4 rounded-xl shadow-md disabled:opacity-70 transition-colors"
        >
          {submitting ? 'Submitting...' : 'Submit Assessment'}
        </button>
      </form>
    </div>
  );
}
