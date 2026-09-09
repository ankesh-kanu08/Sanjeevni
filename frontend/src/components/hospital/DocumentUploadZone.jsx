import React, { useState, useRef } from 'react';
import { UploadCloud, FileText, CheckCircle2, AlertCircle, Loader2, X, RefreshCw } from 'lucide-react';
import toast from 'react-hot-toast';
import hospitalService from '../../services/hospitalService';

const ALLOWED_EXTENSIONS = ['.pdf', '.jpg', '.jpeg', '.png', '.webp'];
const MAX_FILE_SIZE_MB = 10;

export default function DocumentUploadZone({ onExtracted, isExtracting, setIsExtracting }) {
  const [dragActive, setDragActive] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploadStatus, setUploadStatus] = useState('idle'); // 'idle' | 'extracting' | 'success' | 'error'
  const [extractionSummary, setExtractionSummary] = useState(null);
  const [errorMessage, setErrorMessage] = useState('');
  const fileInputRef = useRef(null);

  const validateFile = (file) => {
    if (!file) return 'No file selected.';
    const ext = '.' + file.name.split('.').pop().toLowerCase();
    if (!ALLOWED_EXTENSIONS.includes(ext)) {
      return `Unsupported file format (${ext}). Supported formats: PDF, JPG, JPEG, PNG, WebP.`;
    }
    const maxBytes = MAX_FILE_SIZE_MB * 1024 * 1024;
    if (file.size > maxBytes) {
      return `File is too large (${(file.size / (1024 * 1024)).toFixed(1)} MB). Please upload a document smaller than ${MAX_FILE_SIZE_MB} MB.`;
    }
    return null;
  };

  const handleFileProcess = async (file) => {
    const error = validateFile(file);
    if (error) {
      setErrorMessage(error);
      setUploadStatus('error');
      toast.error(error);
      return;
    }

    setSelectedFile(file);
    setUploadStatus('extracting');
    if (setIsExtracting) setIsExtracting(true);
    setErrorMessage('');

    try {
      const response = await hospitalService.extractDocument(file);
      if (response && response.success && response.data) {
        setUploadStatus('success');
        setExtractionSummary(response.data);
        toast.success(`Successfully extracted ${response.data.totalFieldsFound || 0} fields from document!`);
        if (onExtracted) {
          onExtracted(response.data, file);
        }
      } else {
        throw new Error(response.message || 'Unable to extract structured data from document.');
      }
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Failed to process document';
      setErrorMessage(msg);
      setUploadStatus('error');
      toast.error(msg);
    } finally {
      if (setIsExtracting) setIsExtracting(false);
    }
  };

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileProcess(e.dataTransfer.files[0]);
    }
  };

  const handleChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      handleFileProcess(e.target.files[0]);
    }
  };

  const handleReset = () => {
    setSelectedFile(null);
    setUploadStatus('idle');
    setExtractionSummary(null);
    setErrorMessage('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="mb-8 bg-gradient-to-br from-teal-50/50 via-white to-sky-50/40 rounded-2xl border border-teal-100/80 p-6 shadow-sm">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-teal-600 text-white flex items-center justify-center shadow-sm">
            <UploadCloud size={20} />
          </div>
          <div>
            <h2 className="text-base font-bold text-gray-900">Upload Discharge Document / Medical Report</h2>
            <p className="text-xs text-gray-500">
              Upload a PDF, scanned report, prescription, discharge summary, or image. CareWatch AI will extract available information and pre-fill the form.
            </p>
          </div>
        </div>
        {uploadStatus !== 'idle' && (
          <button
            onClick={handleReset}
            type="button"
            className="text-xs text-gray-500 hover:text-gray-800 flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
          >
            <RefreshCw size={12} /> Replace Document
          </button>
        )}
      </div>

      <input
        ref={fileInputRef}
        type="file"
        id="discharge-doc-upload"
        className="hidden"
        accept=".pdf,.jpg,.jpeg,.png,.webp"
        onChange={handleChange}
      />

      {uploadStatus === 'idle' && (
        <div
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all duration-200 ${
            dragActive
              ? 'border-teal-500 bg-teal-50/60 scale-[0.99]'
              : 'border-teal-200 hover:border-teal-400 bg-white/70 hover:bg-white'
          }`}
        >
          <div className="flex flex-col items-center">
            <div className="w-12 h-12 rounded-full bg-teal-100 text-teal-700 flex items-center justify-center mb-3">
              <FileText size={24} />
            </div>
            <p className="text-sm font-semibold text-gray-800 mb-1">
              Drag & drop medical file here, or <span className="text-teal-600 underline">Browse</span>
            </p>
            <p className="text-xs text-gray-500 mb-2">
              Supports PDF, JPG, JPEG, PNG, WebP • Max 10 MB
            </p>
            <span className="inline-flex items-center gap-1 text-[11px] font-medium text-teal-700 bg-teal-50 px-2.5 py-1 rounded-full border border-teal-200/60">
              ⚡ OCR & AI text extraction will assist form pre-fill (Human confirmation required)
            </span>
          </div>
        </div>
      )}

      {uploadStatus === 'extracting' && (
        <div className="border border-teal-200 rounded-xl p-6 bg-white text-center">
          <div className="flex items-center justify-center gap-3 mb-3">
            <Loader2 size={24} className="text-teal-600 animate-spin" />
            <span className="font-semibold text-gray-800 text-sm">
              Analyzing & extracting: {selectedFile?.name}
            </span>
          </div>
          <div className="w-full max-w-md mx-auto bg-gray-100 rounded-full h-2 mb-3 overflow-hidden">
            <div className="bg-teal-600 h-2 rounded-full animate-pulse w-3/4"></div>
          </div>
          <p className="text-xs text-gray-500">
            Running OCR text recognition and clinical entity parsing... This usually takes 2–4 seconds.
          </p>
        </div>
      )}

      {uploadStatus === 'success' && extractionSummary && (
        <div className="border border-emerald-200 rounded-xl p-5 bg-emerald-50/40">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-start gap-3">
              <CheckCircle2 size={22} className="text-emerald-600 shrink-0 mt-0.5" />
              <div>
                <div className="flex items-center gap-2">
                  <p className="font-semibold text-sm text-gray-900">{selectedFile?.name}</p>
                  <span className="text-xs text-gray-500">({(selectedFile?.size / 1024).toFixed(0)} KB)</span>
                </div>
                <div className="flex flex-wrap items-center gap-2 mt-1.5">
                  <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-emerald-100 text-emerald-800 border border-emerald-200">
                    ✓ {extractionSummary.totalFieldsFound || 0} fields extracted
                  </span>
                  {extractionSummary.needsVerificationCount > 0 ? (
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-amber-100 text-amber-800 border border-amber-200">
                      ⚠ {extractionSummary.needsVerificationCount} fields need verification
                    </span>
                  ) : (
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-teal-100 text-teal-800">
                      High extraction confidence
                    </span>
                  )}
                  {extractionSummary.patientInfo?.fullName && (
                    <span className="text-xs text-gray-600">
                      Patient: <strong className="text-gray-900">{extractionSummary.patientInfo.fullName}</strong>
                    </span>
                  )}
                  {extractionSummary.clinicalDetails?.diagnosis && (
                    <span className="text-xs text-gray-600">
                      • Diagnosis: <strong className="text-gray-900">{extractionSummary.clinicalDetails.diagnosis}</strong>
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
              <span className="text-xs text-emerald-700 bg-emerald-100/70 px-3 py-1.5 rounded-lg font-medium">
                Form Pre-filled
              </span>
            </div>
          </div>
          <p className="text-[11px] text-gray-500 mt-2.5 pt-2 border-t border-emerald-200/50">
            ℹ️ Extracted data has pre-filled the corresponding steps. All fields remain fully editable. Please review highlighted values before final submission.
          </p>
        </div>
      )}

      {uploadStatus === 'error' && (
        <div className="border border-red-200 rounded-xl p-5 bg-red-50/50">
          <div className="flex items-start gap-3">
            <AlertCircle size={20} className="text-red-600 shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="font-semibold text-sm text-red-900">Document Extraction Failed</p>
              <p className="text-xs text-red-700 mt-0.5">{errorMessage}</p>
              <div className="mt-3 flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="px-3 py-1.5 bg-red-600 text-white rounded-lg text-xs font-medium hover:bg-red-700 transition-colors"
                >
                  Try Another File
                </button>
                <button
                  type="button"
                  onClick={handleReset}
                  className="px-3 py-1.5 bg-white border border-gray-300 text-gray-700 rounded-lg text-xs font-medium hover:bg-gray-50 transition-colors"
                >
                  Continue Manually
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
