from fastapi import APIRouter
from app.models.schemas import (
    RiskAnalysisRequest,
    RiskAnalysisResponse,
    SymptomExtractionRequest,
    SymptomExtractionResponse,
    DiseaseQuestionProtocolRequest,
    DiseaseQuestionProtocolResponse
)
from app.services.risk_engine import RiskEngine
from app.nlp.symptom_extractor import SymptomExtractor
from app.services.question_engine import DiseaseQuestionEngine

router = APIRouter()
risk_engine = RiskEngine()
symptom_extractor = SymptomExtractor()
question_engine = DiseaseQuestionEngine()

@router.post("/analyze", response_model=RiskAnalysisResponse)
def analyze_risk(request: RiskAnalysisRequest) -> RiskAnalysisResponse:
    return risk_engine.analyze(request)

@router.post("/extract-symptoms", response_model=SymptomExtractionResponse)
def extract_symptoms(request: SymptomExtractionRequest) -> SymptomExtractionResponse:
    return symptom_extractor.extract(request)

@router.post("/checkin-protocol", response_model=DiseaseQuestionProtocolResponse)
def get_checkin_protocol(request: DiseaseQuestionProtocolRequest) -> DiseaseQuestionProtocolResponse:
    return question_engine.generate_protocol(request)
