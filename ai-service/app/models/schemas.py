from pydantic import BaseModel
from typing import Optional, List, Dict, Any

class BloodPressure(BaseModel):
    systolic: Optional[float] = None
    diastolic: Optional[float] = None

class VitalsData(BaseModel):
    spo2: Optional[float] = None
    heartRate: Optional[float] = None
    temperature: Optional[float] = None
    bloodPressure: Optional[BloodPressure] = None
    respiratoryRate: Optional[float] = None

class PreviousAssessment(BaseModel):
    riskScore: float
    riskLevel: str
    date: str

class RiskAnalysisRequest(BaseModel):
    patientId: str
    baseline: VitalsData
    current: VitalsData
    symptoms: List[str]
    activityChange: Optional[float] = 0.0
    daysSinceDischarge: Optional[int] = 1
    previousAssessments: Optional[List[PreviousAssessment]] = []

class BaselineDeviation(BaseModel):
    parameter: str
    baseline: float
    current: float
    change: float
    unit: str
    severity: str

class RiskAnalysisResponse(BaseModel):
    riskScore: float
    riskLevel: str
    reasons: List[str]
    recommendedWorkflow: str
    baselineDeviation: List[BaselineDeviation]
    trends: Dict[str, Any]
    timestamp: str

class SymptomExtractionRequest(BaseModel):
    text: str

class ExtractedSymptom(BaseModel):
    name: str
    severity: str
    trend: str

class SymptomExtractionResponse(BaseModel):
    symptoms: List[ExtractedSymptom]

class CheckInQuestion(BaseModel):
    id: str
    category: str
    text_hi: str
    text_en: str
    criticality: Optional[str] = "routine"
    expected_symptoms: Optional[List[str]] = []

class DiseaseQuestionProtocolRequest(BaseModel):
    diagnosis: str
    patient_name: Optional[str] = "मरीज"
    comorbidities: Optional[List[str]] = []

class DiseaseQuestionProtocolResponse(BaseModel):
    disease_category: str
    diagnosis: str
    protocol_name: str
    questions: List[CheckInQuestion]

# ==========================================
# Document Extraction & OCR Schemas
# ==========================================

class ClinicalDocumentExtractRequest(BaseModel):
    text: str
    filename: Optional[str] = None
    file_type: Optional[str] = None

class ExtractedPatientInfo(BaseModel):
    fullName: Optional[str] = None
    age: Optional[int] = None
    dob: Optional[str] = None
    gender: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    address: Optional[str] = None
    district: Optional[str] = None
    state: Optional[str] = None
    pincode: Optional[str] = None
    locationType: Optional[str] = None
    patientId: Optional[str] = None

class ExtractedClinicalDetails(BaseModel):
    diagnosis: Optional[str] = None
    diagnosisDetails: Optional[str] = None
    comorbidities: List[str] = []
    allergies: List[str] = []
    procedures: List[str] = []
    medicalHistory: List[str] = []
    dischargeCondition: Optional[str] = None

class ExtractedVitals(BaseModel):
    spo2: Optional[float] = None
    heartRate: Optional[float] = None
    temp: Optional[float] = None
    bpSystolic: Optional[float] = None
    bpDiastolic: Optional[float] = None
    respRate: Optional[float] = None
    weight: Optional[float] = None
    height: Optional[float] = None

class ExtractedMedication(BaseModel):
    name: str
    dosage: Optional[str] = ""
    frequency: Optional[str] = "once daily"
    route: Optional[str] = "oral"
    duration: Optional[str] = ""
    instructions: Optional[str] = ""

class ExtractedLabValue(BaseModel):
    name: str
    value: str
    unit: Optional[str] = ""
    normalRange: Optional[str] = ""

class ExtractedMonitoringSetup(BaseModel):
    followUpDate: Optional[str] = None
    monitoringFreq: Optional[str] = "Daily"
    monitoredParams: List[str] = []
    warningSigns: List[str] = []
    instructions: Optional[str] = None

class FieldProvenance(BaseModel):
    field: str
    value: Any = None
    confidence: float = 1.0
    source: str = "uploaded_document"
    needsVerification: bool = False
    verified: bool = False

class ClinicalDocumentExtractResponse(BaseModel):
    success: bool = True
    patientInfo: ExtractedPatientInfo
    clinicalDetails: ExtractedClinicalDetails
    vitals: ExtractedVitals
    medications: List[ExtractedMedication] = []
    labs: List[ExtractedLabValue] = []
    monitoringSetup: ExtractedMonitoringSetup
    fieldProvenance: Dict[str, FieldProvenance] = {}
    totalFieldsFound: int = 0
    needsVerificationCount: int = 0
    rawTextLength: int = 0
    documentSummary: Optional[str] = None

