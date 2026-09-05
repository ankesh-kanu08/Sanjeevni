import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Wifi, WifiOff, Save, CheckCircle2 } from 'lucide-react';
import toast from 'react-hot-toast';
import workerService from '../../services/workerService';
import patientService from '../../services/patientService';
import { saveOfflineVisit, useOfflineSync } from '../../utils/offlineSync';

const SYMPTOMS = ['Breathlessness', 'Fever', 'Cough', 'Fatigue', 'Pain', 'Dizziness', 'Swelling', 'Confusion', 'Other'];

export default function WorkerVisitForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { isOnline } = useOfflineSync();
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
        const pData = res.data?.data || res.data;
        setPatient(pData);
      } catch (err) {
        console.warn('Error fetching patient details (may be offline):', err);
        setPatient({ name: 'Patient in Field', _id: id });
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

    const payload = {
      patientId: id,
      patientName: patient?.user?.name || patient?.name || 'Patient',
      timestamp: new Date().toISOString(),
      vitals: {
        spo2: formData.spo2 ? Number(formData.spo2) : undefined,
        heartRate: formData.heartRate ? Number(formData.heartRate) : undefined,
        temp: formData.temp ? Number(formData.temp) : undefined,
        bpSystolic: formData.bpSystolic ? Number(formData.bpSystolic) : undefined,
        bpDiastolic: formData.bpDiastolic ? Number(formData.bpDiastolic) : undefined,
        bp: formData.bpSystolic && formData.bpDiastolic ? `${formData.bpSystolic}/${formData.bpDiastolic}` : undefined,
        respRate: formData.respRate ? Number(formData.respRate) : undefined
      },
      symptoms: formData.symptoms,
      observations: formData.observations,
      notes: formData.notes
    };

    // If device is offline, store directly in queue
    if (!navigator.onLine) {
      saveOfflineVisit(payload);
      toast.success('Assessment saved locally in offline queue! Will sync automatically when back online.', {
        icon: '💾',
        duration: 5000
      });
      navigate('/worker/dashboard');
      return;
    }

    try {
      await workerService.submitVisit(payload);
      toast.success('Assessment submitted and analyzed successfully!');
      navigate('/worker/dashboard');
    } catch (err) {
      console.warn('Submission failed over network; falling back to offline queue:', err);
      saveOfflineVisit(payload);
      toast('Network error: Assessment saved to offline queue and will sync automatically.', {
        icon: '📦',
        duration: 5000
      });
      navigate('/worker/dashboard');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div className="p-8 text-center text-gray-500">Loading form...</div>;

  const patientDisplayName = patient?.user?.name || patient?.name || 'Patient';

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8 max-w-lg mx-auto pb-24">
      {/* Offline Status Banner */}
      {!isOnline && (
        <div className="mb-4 bg-amber-50 border border-amber-300 rounded-xl p-3 flex items-center justify-between text-amber-800 text-sm">
          <div className="flex items-center gap-2">
            <WifiOff size={18} className="text-amber-600" />
            <span className="font-medium">Offline Mode Active</span>
          </div>
          <span className="text-xs bg-amber-200 px-2 py-0.5 rounded-full font-semibold">Local Queue</span>
        </div>
      )}

      <div className="flex items-center justify-between mb-2">
        <h1 className="text-2xl font-bold text-gray-900">Record Field Visit</h1>
        <div className="flex items-center gap-1.5 text-xs text-slate-500">
          {isOnline ? (
            <span className="flex items-center gap-1 text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full font-medium">
              <Wifi size={14} /> Connected
            </span>
          ) : (
            <span className="flex items-center gap-1 text-amber-600 bg-amber-50 px-2 py-1 rounded-full font-medium">
              <WifiOff size={14} /> Offline Ready
            </span>
          )}
        </div>
      </div>

      <p className="text-gray-600 mb-6">
        Patient: <span className="font-semibold text-gray-900">{patientDisplayName}</span>
      </p>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100">
          <h2 className="font-semibold text-gray-900 mb-4">Physical Vitals Measurement</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-gray-600 mb-1">SpO2 (%)</label>
              <input
                type="number"
                min="50"
                max="100"
                value={formData.spo2}
                onChange={e => setFormData({...formData, spo2: e.target.value})}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-teal-500 focus:border-teal-500 font-semibold text-lg"
                placeholder="94"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-1">Heart Rate (bpm)</label>
              <input
                type="number"
                min="30"
                max="220"
                value={formData.heartRate}
                onChange={e => setFormData({...formData, heartRate: e.target.value})}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-teal-500 focus:border-teal-500 font-semibold text-lg"
                placeholder="88"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-1">Temp (°F)</label>
              <input
                type="number"
                step="0.1"
                value={formData.temp}
                onChange={e => setFormData({...formData, temp: e.target.value})}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-teal-500 focus:border-teal-500 font-semibold text-lg"
                placeholder="99.2"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-1">Resp Rate (/min)</label>
              <input
                type="number"
                value={formData.respRate}
                onChange={e => setFormData({...formData, respRate: e.target.value})}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-teal-500 focus:border-teal-500 font-semibold text-lg"
                placeholder="20"
              />
            </div>
            <div className="col-span-2">
              <label className="block text-sm text-gray-600 mb-1">Blood Pressure (Systolic / Diastolic mmHg)</label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  value={formData.bpSystolic}
                  onChange={e => setFormData({...formData, bpSystolic: e.target.value})}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-teal-500 focus:border-teal-500 text-center font-semibold text-lg"
                  placeholder="130"
                />
                <span className="text-gray-400 text-xl font-bold">/</span>
                <input
                  type="number"
                  value={formData.bpDiastolic}
                  onChange={e => setFormData({...formData, bpDiastolic: e.target.value})}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-teal-500 focus:border-teal-500 text-center font-semibold text-lg"
                  placeholder="85"
                />
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100">
          <h2 className="font-semibold text-gray-900 mb-4">Symptoms Observed</h2>
          <div className="grid grid-cols-2 gap-3">
            {SYMPTOMS.map(symp => (
              <label key={symp} className="flex items-center gap-2 p-2 rounded-lg hover:bg-gray-50 cursor-pointer border border-transparent hover:border-gray-200 transition-colors">
                <input
                  type="checkbox"
                  checked={formData.symptoms.includes(symp)}
                  onChange={() => toggleSymptom(symp)}
                  className="w-5 h-5 text-teal-600 rounded border-gray-300 focus:ring-teal-500"
                />
                <span className="text-sm font-medium text-gray-700">{symp}</span>
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
            placeholder="E.g., Patient appears visibly fatigued, using accessory muscles to breathe, speech is breathy."
          />
        </div>

        <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100">
          <h2 className="font-semibold text-gray-900 mb-4">Worker Notes & Escalation</h2>
          <textarea
            value={formData.notes}
            onChange={e => setFormData({...formData, notes: e.target.value})}
            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-teal-500 focus:border-teal-500 min-h-[80px]"
            placeholder="Advice given to family, oxygen administered, or immediate referral recommendations..."
          />
        </div>

        <button
          type="submit"
          disabled={submitting}
          className="w-full bg-teal-600 hover:bg-teal-700 text-white text-lg font-bold py-4 rounded-xl shadow-md disabled:opacity-70 transition-all flex items-center justify-center gap-2"
        >
          {submitting ? (
            'Submitting...'
          ) : !isOnline ? (
            <>
              <Save size={20} /> Save Assessment to Offline Queue
            </>
          ) : (
            <>
              <CheckCircle2 size={20} /> Submit & Sync Assessment
            </>
          )}
        </button>
      </form>
    </div>
  );
}
