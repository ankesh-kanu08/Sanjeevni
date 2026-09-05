from typing import Dict, Any, List
from app.models.schemas import SymptomExtractionRequest, SymptomExtractionResponse, ExtractedSymptom

class SymptomExtractor:
    def __init__(self) -> None:
        self.keyword_map = {
            # Respiratory symptoms
            'saans': 'breathlessness',
            'breathing': 'breathlessness',
            'breathless': 'breathlessness',
            'shortness of breath': 'breathlessness',
            'khansi': 'cough',
            'cough': 'cough',
            'balgam': 'phlegm',
            'phlegm': 'phlegm',
            'sputum': 'phlegm',
            'seene mein dard': 'chest_pain',
            'chest pain': 'chest_pain',
            'chest tightness': 'chest_pain',
            'seena bhari': 'chest_pain',

            # Cardiovascular symptoms
            'soojan': 'pedal_edema',
            'sujan': 'pedal_edema',
            'swelling': 'pedal_edema',
            'edema': 'pedal_edema',
            'pairo mein sujan': 'pedal_edema',
            'letne par saans': 'orthopnea',
            'lying flat': 'orthopnea',
            'takiya': 'orthopnea',
            'orthopnea': 'orthopnea',
            'dhadkan': 'palpitation',
            'palpitation': 'palpitation',
            'ghabrahat': 'palpitation',

            # Post-surgical symptoms
            'taanke': 'surgical_wound_pain',
            'cheera': 'surgical_wound_pain',
            'stitches': 'surgical_wound_pain',
            'incision': 'surgical_wound_pain',
            'wound pain': 'surgical_wound_pain',
            'mavad': 'wound_discharge',
            'pus': 'wound_discharge',
            'wound discharge': 'wound_discharge',
            'ulti': 'vomiting',
            'vomiting': 'vomiting',
            'matli': 'nausea',
            'nausea': 'nausea',
            'pet saaf nahi': 'constipation',

            # General & Metabolic symptoms
            'bukhar': 'fever',
            'bukhaar': 'fever',
            'fever': 'fever',
            'thand': 'chills',
            'chills': 'chills',
            'thakaan': 'fatigue',
            'fatigue': 'fatigue',
            'kamzori': 'fatigue',
            'weakness': 'fatigue',
            'dard': 'pain',
            'pain': 'pain',
            'chakkar': 'dizziness',
            'dizzy': 'dizziness',
            'dizziness': 'dizziness',
            'pyas': 'excessive_thirst',
            'thirst': 'excessive_thirst',
            'sweating': 'sweating',
            'paseena': 'sweating'
        }
    
    def extract(self, request: SymptomExtractionRequest) -> SymptomExtractionResponse:
        text = request.text.lower()
        extracted = []
        found_symptoms = set()
        worsening_words = ['worse', 'worsening', 'increased', 'zyada', 'badhta', 'badh', 'kal se', 'badh gayi']
        improving_words = ['better', 'improving', 'kam', 'theek', 'araam', 'relief']
        severe_words = ['severe', 'very', 'bahut', 'bohot', 'zyada', 'tez']
        
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
