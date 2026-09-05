from typing import Dict, Any, List
from app.models.schemas import SymptomExtractionRequest, SymptomExtractionResponse, ExtractedSymptom

class SymptomExtractor:
    def __init__(self) -> None:
        self.keyword_map = {
            'saans': 'breathlessness',
            'breathing': 'breathlessness',
            'breathless': 'breathlessness',
            'bukhar': 'fever',
            'fever': 'fever',
            'thakaan': 'fatigue',
            'fatigue': 'fatigue',
            'dard': 'pain',
            'pain': 'pain',
            'chakkar': 'dizziness',
            'dizzy': 'dizziness',
            'dizziness': 'dizziness'
        }
    
    def extract(self, request: SymptomExtractionRequest) -> SymptomExtractionResponse:
        text = request.text.lower()
        extracted = []
        found_symptoms = set()
        worsening_words = ['worse', 'worsening', 'increased', 'zyada', 'badhta', 'badh', 'kal se']
        improving_words = ['better', 'improving', 'kam', 'theek']
        severe_words = ['severe', 'very', 'bahut', 'bohot', 'zyada']
        trend = 'worsening' if any(word in text for word in worsening_words) else 'improving' if any(word in text for word in improving_words) else 'stable'
        severity = 'severe' if any(word in text for word in severe_words) else 'moderate'
        
        for keyword, standard_symptom in self.keyword_map.items():
            if keyword in text and standard_symptom not in found_symptoms:
                found_symptoms.add(standard_symptom)
                extracted.append(ExtractedSymptom(
                    name=standard_symptom,
                    severity=severity,
                    trend=trend
                ))
                
        return SymptomExtractionResponse(symptoms=extracted)
