import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle2, ChevronRight, ChevronLeft, Plus, X } from 'lucide-react';
import toast from 'react-hot-toast';
import hospitalService from '../../services/hospitalService';

const STEPS = ['Patient Info', 'Clinical Details', 'Vitals', 'Medications', 'Lab Values', 'Monitoring Setup', 'Review'];
const COMORBIDITIES = ['Diabetes', 'Hypertension', 'Heart Disease', 'COPD', 'Asthma', 'Kidney Disease', 'Cancer', 'None'];

export default function HospitalDischarge() {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(0);
  const [submitted, setSubmitted] = useState(false);

  const [formData, setFormData] = useState({
    name: '', age: '', gender: 'Male', bloodGroup: 'O+', phone: '', email: '',
    address: '', district: '', state: '', pincode: '', locationType: 'Urban',
    diagnosis: '', diagnosisDetails: '', comorbidities: [],
    vitals: { spo2: '', heartRate: '', temp: '', bpSystolic: '', bpDiastolic: '', respRate: '' },
    medications: [], labs: [],
    followUpDate: '', monitoringFreq: 'Daily', monitoredParams: [], assignedDoctor: '', assignedWorker: ''
  });

  const [tempMed, setTempMed] = useState({ name: '', dosage: '', frequency: 'once daily', duration: '', instructions: '' });
  const [tempLab, setTempLab] = useState({ name: '', value: '', unit: '', normalRange: '' });

  const handleNext = () => {
    if (currentStep < STEPS.length - 1) setCurrentStep(c => c + 1);
  };
  const handlePrev = () => {
    if (currentStep > 0) setCurrentStep(c => c - 1);
  };

  const toggleComorbidity = (item) => {
    setFormData(prev => ({
      ...prev,
      comorbidities: prev.comorbidities.includes(item) 
        ? prev.comorbidities.filter(c => c !== item)
        : [...prev.comorbidities, item]
    }));
  };

  const toggleParam = (item) => {
    setFormData(prev => ({
      ...prev,
      monitoredParams: prev.monitoredParams.includes(item)
        ? prev.monitoredParams.filter(p => p !== item)
        : [...prev.monitoredParams, item]
    }));
  };

  const addMed = () => {
    if (tempMed.name && tempMed.dosage) {
      setFormData(prev => ({ ...prev, medications: [...prev.medications, tempMed] }));
      setTempMed({ name: '', dosage: '', frequency: 'once daily', duration: '', instructions: '' });
    }
  };
  const removeMed = (index) => {
    setFormData(prev => ({ ...prev, medications: prev.medications.filter((_, i) => i !== index) }));
  };

  const addLab = () => {
    if (tempLab.name && tempLab.value) {
      setFormData(prev => ({ ...prev, labs: [...prev.labs, tempLab] }));
      setTempLab({ name: '', value: '', unit: '', normalRange: '' });
    }
  };
  const removeLab = (index) => {
    setFormData(prev => ({ ...prev, labs: prev.labs.filter((_, i) => i !== index) }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await hospitalService.discharge(formData);
      toast.success('Patient discharged successfully!');
      setSubmitted(true);
    } catch (err) {
      toast.error('Failed to discharge patient');
    }
  };

  if (submitted) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 text-center">
        <CheckCircle2 size={100} className="text-emerald-500 mb-6" />
        <h1 className="text-3xl font-bold text-gray-900 mb-4">Patient Discharged Successfully</h1>
        <p className="text-lg text-gray-600 mb-8">Monitoring has been initiated for {formData.name}.</p>
        <button onClick={() => navigate('/hospital/patients')} className="bg-teal-600 text-white font-bold py-3 px-6 rounded-lg">
          View Patient Directory
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 p-6 max-w-5xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">New Patient Discharge</h1>
      
      {/* Progress Bar */}
      <div className="mb-8">
        <div className="flex justify-between relative">
          <div className="absolute top-1/2 left-0 w-full h-1 bg-gray-200 -z-10 transform -translate-y-1/2"></div>
          {STEPS.map((step, idx) => (
            <div key={idx} className="flex flex-col items-center">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold border-2 ${
                idx <= currentStep ? 'bg-teal-600 border-teal-600 text-white' : 'bg-white border-gray-300 text-gray-400'
              }`}>
                {idx + 1}
              </div>
              <span className={`text-xs mt-2 hidden sm:block ${idx <= currentStep ? 'text-teal-700 font-medium' : 'text-gray-400'}`}>{step}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 min-h-[400px]">
        {currentStep === 0 && (
          <div className="space-y-4">
            <h2 className="text-xl font-semibold mb-4">Patient Information</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div><label className="block text-sm mb-1">Full Name</label><input type="text" className="w-full p-2 border rounded" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} /></div>
              <div><label className="block text-sm mb-1">Age</label><input type="number" className="w-full p-2 border rounded" value={formData.age} onChange={e => setFormData({...formData, age: e.target.value})} /></div>
              <div><label className="block text-sm mb-1">Gender</label><select className="w-full p-2 border rounded" value={formData.gender} onChange={e => setFormData({...formData, gender: e.target.value})}><option>Male</option><option>Female</option><option>Other</option></select></div>
              <div><label className="block text-sm mb-1">Phone</label><input type="tel" className="w-full p-2 border rounded" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} /></div>
              <div className="md:col-span-2"><label className="block text-sm mb-1">Address</label><textarea className="w-full p-2 border rounded" value={formData.address} onChange={e => setFormData({...formData, address: e.target.value})} /></div>
              <div><label className="block text-sm mb-1">Location Type</label>
                <div className="flex gap-4 mt-1">
                  <label className="flex items-center gap-2"><input type="radio" name="loc" checked={formData.locationType==='Urban'} onChange={()=>setFormData({...formData, locationType:'Urban'})}/> Urban</label>
                  <label className="flex items-center gap-2"><input type="radio" name="loc" checked={formData.locationType==='Rural'} onChange={()=>setFormData({...formData, locationType:'Rural'})}/> Rural</label>
                </div>
              </div>
            </div>
          </div>
        )}

        {currentStep === 1 && (
          <div className="space-y-4">
            <h2 className="text-xl font-semibold mb-4">Clinical Details</h2>
            <div><label className="block text-sm mb-1 font-medium">Primary Diagnosis *</label><input type="text" className="w-full p-2 border rounded" value={formData.diagnosis} onChange={e => setFormData({...formData, diagnosis: e.target.value})} required/></div>
            <div><label className="block text-sm mb-1 font-medium">Diagnosis Details</label><textarea className="w-full p-2 border rounded h-24" value={formData.diagnosisDetails} onChange={e => setFormData({...formData, diagnosisDetails: e.target.value})} /></div>
            <div>
              <label className="block text-sm mb-2 font-medium">Comorbidities</label>
              <div className="flex flex-wrap gap-2">
                {COMORBIDITIES.map(c => (
                  <button key={c} onClick={() => toggleComorbidity(c)} className={`px-4 py-2 rounded-full border text-sm ${formData.comorbidities.includes(c) ? 'bg-teal-50 border-teal-500 text-teal-800' : 'bg-white border-gray-300'}`}>
                    {c}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {currentStep === 2 && (
          <div className="space-y-4">
            <h2 className="text-xl font-semibold mb-4">Discharge Vitals</h2>
            <div className="grid grid-cols-2 gap-4">
              <div><label className="block text-sm mb-1">SpO2 (%)</label><input type="number" className="w-full p-2 border rounded" value={formData.vitals.spo2} onChange={e => setFormData({...formData, vitals: {...formData.vitals, spo2: e.target.value}})} /></div>
              <div><label className="block text-sm mb-1">Heart Rate (bpm)</label><input type="number" className="w-full p-2 border rounded" value={formData.vitals.heartRate} onChange={e => setFormData({...formData, vitals: {...formData.vitals, heartRate: e.target.value}})} /></div>
              <div><label className="block text-sm mb-1">Temperature (°F)</label><input type="number" step="0.1" className="w-full p-2 border rounded" value={formData.vitals.temp} onChange={e => setFormData({...formData, vitals: {...formData.vitals, temp: e.target.value}})} /></div>
              <div><label className="block text-sm mb-1">Respiratory Rate (/min)</label><input type="number" className="w-full p-2 border rounded" value={formData.vitals.respRate} onChange={e => setFormData({...formData, vitals: {...formData.vitals, respRate: e.target.value}})} /></div>
              <div className="col-span-2">
                <label className="block text-sm mb-1">Blood Pressure (mmHg)</label>
                <div className="flex items-center gap-2">
                  <input type="number" placeholder="Systolic" className="w-full p-2 border rounded" value={formData.vitals.bpSystolic} onChange={e => setFormData({...formData, vitals: {...formData.vitals, bpSystolic: e.target.value}})} />
                  <span>/</span>
                  <input type="number" placeholder="Diastolic" className="w-full p-2 border rounded" value={formData.vitals.bpDiastolic} onChange={e => setFormData({...formData, vitals: {...formData.vitals, bpDiastolic: e.target.value}})} />
                </div>
              </div>
            </div>
          </div>
        )}

        {currentStep === 3 && (
          <div className="space-y-4">
            <h2 className="text-xl font-semibold mb-4">Medications</h2>
            <div className="bg-gray-50 p-4 rounded-lg flex flex-col md:flex-row gap-2 items-end mb-4">
              <div className="flex-1"><label className="text-xs">Medication Name</label><input type="text" className="w-full p-2 border rounded text-sm" value={tempMed.name} onChange={e=>setTempMed({...tempMed, name: e.target.value})}/></div>
              <div className="w-24"><label className="text-xs">Dosage</label><input type="text" className="w-full p-2 border rounded text-sm" value={tempMed.dosage} onChange={e=>setTempMed({...tempMed, dosage: e.target.value})}/></div>
              <div className="w-32"><label className="text-xs">Frequency</label><select className="w-full p-2 border rounded text-sm" value={tempMed.frequency} onChange={e=>setTempMed({...tempMed, frequency: e.target.value})}><option>once daily</option><option>twice daily</option><option>thrice daily</option></select></div>
              <button onClick={addMed} className="bg-teal-600 text-white p-2 rounded flex items-center justify-center"><Plus size={20}/></button>
            </div>
            
            {formData.medications.length > 0 && (
              <div className="space-y-2">
                {formData.medications.map((med, idx) => (
                  <div key={idx} className="flex justify-between items-center p-3 border rounded bg-white">
                    <div>
                      <p className="font-semibold text-sm">{med.name} - {med.dosage}</p>
                      <p className="text-xs text-gray-500">{med.frequency}</p>
                    </div>
                    <button onClick={() => removeMed(idx)} className="text-red-500 hover:bg-red-50 p-1 rounded"><X size={16}/></button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {currentStep === 4 && (
          <div className="space-y-4">
            <h2 className="text-xl font-semibold mb-4">Lab Values (Optional)</h2>
            <div className="bg-gray-50 p-4 rounded-lg flex flex-col md:flex-row gap-2 items-end mb-4">
              <div className="flex-1"><label className="text-xs">Test Name</label><input type="text" className="w-full p-2 border rounded text-sm" value={tempLab.name} onChange={e=>setTempLab({...tempLab, name: e.target.value})}/></div>
              <div className="w-24"><label className="text-xs">Value</label><input type="text" className="w-full p-2 border rounded text-sm" value={tempLab.value} onChange={e=>setTempLab({...tempLab, value: e.target.value})}/></div>
              <div className="w-24"><label className="text-xs">Unit</label><input type="text" className="w-full p-2 border rounded text-sm" value={tempLab.unit} onChange={e=>setTempLab({...tempLab, unit: e.target.value})}/></div>
              <button onClick={addLab} className="bg-teal-600 text-white p-2 rounded flex items-center justify-center"><Plus size={20}/></button>
            </div>
            
            {formData.labs.length > 0 && (
              <div className="space-y-2">
                {formData.labs.map((lab, idx) => (
                  <div key={idx} className="flex justify-between items-center p-3 border rounded bg-white">
                    <p className="font-semibold text-sm">{lab.name}: {lab.value} {lab.unit}</p>
                    <button onClick={() => removeLab(idx)} className="text-red-500 hover:bg-red-50 p-1 rounded"><X size={16}/></button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {currentStep === 5 && (
          <div className="space-y-4">
            <h2 className="text-xl font-semibold mb-4">Monitoring Setup</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div><label className="block text-sm mb-1 font-medium">Follow-up Date</label><input type="date" className="w-full p-2 border rounded" value={formData.followUpDate} onChange={e=>setFormData({...formData, followUpDate: e.target.value})} /></div>
              <div><label className="block text-sm mb-1 font-medium">Monitoring Frequency</label>
                <div className="flex gap-4 mt-2">
                  <label className="flex items-center gap-1"><input type="radio" name="freq" checked={formData.monitoringFreq==='Daily'} onChange={()=>setFormData({...formData, monitoringFreq:'Daily'})}/> Daily</label>
                  <label className="flex items-center gap-1"><input type="radio" name="freq" checked={formData.monitoringFreq==='Twice Daily'} onChange={()=>setFormData({...formData, monitoringFreq:'Twice Daily'})}/> 2x Daily</label>
                </div>
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm mb-2 font-medium">Parameters to Monitor</label>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                  {['SpO2', 'Heart Rate', 'Temperature', 'Blood Pressure', 'Breathlessness', 'Cough', 'Fatigue', 'Pain', 'Activity', 'Medication Adherence'].map(p => (
                    <label key={p} className="flex items-center gap-2 p-2 bg-gray-50 rounded text-sm cursor-pointer hover:bg-gray-100">
                      <input type="checkbox" checked={formData.monitoredParams.includes(p)} onChange={()=>toggleParam(p)} className="rounded text-teal-600 focus:ring-teal-500" />
                      {p}
                    </label>
                  ))}
                </div>
              </div>
              <div><label className="block text-sm mb-1 font-medium">Assign Doctor</label><select className="w-full p-2 border rounded" value={formData.assignedDoctor} onChange={e=>setFormData({...formData, assignedDoctor: e.target.value})}><option value="">Select Doctor...</option><option value="dr_smith">Dr. Smith</option></select></div>
              <div><label className="block text-sm mb-1 font-medium">Assign Health Worker</label><select className="w-full p-2 border rounded" value={formData.assignedWorker} onChange={e=>setFormData({...formData, assignedWorker: e.target.value})}><option value="">Select Worker...</option><option value="worker_jane">Jane Doe</option></select></div>
            </div>
          </div>
        )}

        {currentStep === 6 && (
          <div className="space-y-6">
            <h2 className="text-xl font-semibold mb-2">Review & Confirm</h2>
            <div className="bg-gray-50 p-4 rounded-lg text-sm">
              <h3 className="font-bold border-b pb-2 mb-2">Patient Details</h3>
              <p>Name: {formData.name} | Age: {formData.age} | Gender: {formData.gender}</p>
              <p>Diagnosis: {formData.diagnosis}</p>
              
              <h3 className="font-bold border-b pb-2 mb-2 mt-4">Medications ({formData.medications.length})</h3>
              <ul className="list-disc pl-5">{formData.medications.map((m, i) => <li key={i}>{m.name} - {m.dosage}</li>)}</ul>
              
              <h3 className="font-bold border-b pb-2 mb-2 mt-4">Monitoring Plan</h3>
              <p>Follow-up: {formData.followUpDate} | Freq: {formData.monitoringFreq}</p>
              <p>Tracking: {formData.monitoredParams.join(', ')}</p>
            </div>
          </div>
        )}
      </div>

      <div className="mt-6 flex justify-between items-center border-t pt-4">
        <button onClick={handlePrev} disabled={currentStep === 0} className={`flex items-center px-4 py-2 rounded-lg font-medium ${currentStep === 0 ? 'text-gray-400 bg-gray-100 cursor-not-allowed' : 'text-gray-700 bg-white border shadow-sm hover:bg-gray-50'}`}>
          <ChevronLeft size={20} className="mr-1" /> Back
        </button>
        
        {currentStep < STEPS.length - 1 ? (
          <button onClick={handleNext} className="flex items-center px-4 py-2 bg-teal-600 text-white rounded-lg font-medium hover:bg-teal-700 shadow-sm transition-colors">
            Next <ChevronRight size={20} className="ml-1" />
          </button>
        ) : (
          <button onClick={handleSubmit} className="flex items-center px-6 py-2 bg-teal-600 text-white rounded-lg font-bold text-lg hover:bg-teal-700 shadow-md transition-colors">
            Confirm Discharge
          </button>
        )}
      </div>
    </div>
  );
}
