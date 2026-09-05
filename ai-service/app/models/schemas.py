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
