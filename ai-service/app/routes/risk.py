from fastapi import APIRouter
from app.models.schemas import (
    RiskAnalysisRequest,
    RiskAnalysisResponse,
    SymptomExtractionRequest,
    SymptomExtractionResponse,
    DiseaseQuestionProtocolRequest,
    DiseaseQuestionProtocolResponse,
    ClinicalDocumentExtractRequest,
    ClinicalDocumentExtractResponse
)
from app.services.risk_engine import RiskEngine
from app.nlp.symptom_extractor import SymptomExtractor
from app.services.question_engine import DiseaseQuestionEngine
from app.services.document_parser import ClinicalDocumentParser

router = APIRouter()
risk_engine = RiskEngine()
symptom_extractor = SymptomExtractor()
question_engine = DiseaseQuestionEngine()
document_parser = ClinicalDocumentParser()

@router.post("/analyze", response_model=RiskAnalysisResponse)
def analyze_risk(request: RiskAnalysisRequest) -> RiskAnalysisResponse:
    return risk_engine.analyze(request)

@router.post("/extract-symptoms", response_model=SymptomExtractionResponse)
def extract_symptoms(request: SymptomExtractionRequest) -> SymptomExtractionResponse:
    return symptom_extractor.extract(request)

@router.post("/checkin-protocol", response_model=DiseaseQuestionProtocolResponse)
def get_checkin_protocol(request: DiseaseQuestionProtocolRequest) -> DiseaseQuestionProtocolResponse:
    return question_engine.generate_protocol(request)

@router.post("/extract-clinical-document", response_model=ClinicalDocumentExtractResponse)
def extract_clinical_document(request: ClinicalDocumentExtractRequest) -> ClinicalDocumentExtractResponse:
    return document_parser.parse(
        text=request.text,
        filename=request.filename,
        file_type=request.file_type
    )

