from typing import Dict, Any, List

class ClinicalSafetyRules:
    CRITICAL_RULES = [
        ('spo2', lambda v: v is not None and v < 90, 'SpO₂ critically low (<90%)', 'HIGH'),
        ('spo2', lambda v: v is not None and v < 92, 'SpO₂ below safe clinical threshold (<92%)', 'HIGH'),
        ('heartRate', lambda v: v is not None and v > 120, 'Heart rate dangerously elevated (>120 bpm)', 'HIGH'),
        ('heartRate', lambda v: v is not None and v < 50, 'Heart rate dangerously low (<50 bpm)', 'HIGH'),
        ('temperature', lambda v: v is not None and v > 103, 'High fever (>103°F)', 'HIGH'),
        ('temperature', lambda v: v is not None and v > 101, 'Fever detected (>101°F)', 'MEDIUM'),
        ('systolic', lambda v: v is not None and v > 180, 'Severely elevated blood pressure (>180 mmHg)', 'HIGH'),
        ('systolic', lambda v: v is not None and v < 90, 'Dangerously low blood pressure (<90 mmHg)', 'HIGH'),
        ('respiratoryRate', lambda v: v is not None and v > 30, 'Respiratory rate critically elevated (>30/min)', 'HIGH'),
    ]
    
    SYMPTOM_RULES = [
        (['severe_breathlessness', 'chest_pain', 'confusion', 'unresponsive'], 'HIGH', 'Critical cardiopulmonary symptom reported'),
        (['wound_discharge'], 'HIGH', 'Surgical wound discharge / suspected infection reported'),
        (['increased_breathlessness', 'worsening_breathlessness', 'breathlessness_worsening', 'shortness_of_breath_worsening'], 'MEDIUM', 'Breathlessness worsening reported'),
        (['pedal_edema', 'orthopnea'], 'MEDIUM', 'Cardiovascular fluid overload / pedal edema reported'),
        (['palpitation'], 'MEDIUM', 'Cardiac palpitations / tachycardia reported'),
        (['surgical_wound_pain'], 'MEDIUM', 'Persistent surgical site discomfort reported'),
    ]
    
    def evaluate(self, current_vitals: Any, deviations: List[Any], symptoms: List[str]) -> Dict[str, Any]:
        highest_level = "LOW"
        reasons = []
        
        vitals_dict = {
            'spo2': current_vitals.spo2,
            'heartRate': current_vitals.heartRate,
            'temperature': current_vitals.temperature,
            'systolic': current_vitals.bloodPressure.systolic if current_vitals.bloodPressure else None,
            'respiratoryRate': current_vitals.respiratoryRate
        }
        
        for param, condition, msg, level in self.CRITICAL_RULES:
            if condition(vitals_dict.get(param)):
                reasons.append(msg)
                if level == "HIGH":
                    highest_level = "HIGH"
                elif level == "MEDIUM" and highest_level == "LOW":
                    highest_level = "MEDIUM"
                    
        for symptom_list, level, msg in self.SYMPTOM_RULES:
            if any(s in symptoms for s in symptom_list):
                reasons.append(msg)
                if level == "HIGH":
                    highest_level = "HIGH"
                elif level == "MEDIUM" and highest_level == "LOW":
                    highest_level = "MEDIUM"
                    
        return {'risk_level': highest_level, 'reasons': reasons}
