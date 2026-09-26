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

        # Combined clinical deterioration rule:
        # SpO2 drop >= 4 points AND (HR rise >= 10 bpm OR HR >= 95 bpm) AND worsening breathlessness => HIGH risk
        spo2_dev = next((d for d in deviations if getattr(d, 'parameter', '') == 'spo2'), None)
        hr_dev = next((d for d in deviations if getattr(d, 'parameter', '') == 'heartRate'), None)
        has_worsening_breathlessness = any(s in symptoms for s in [
            'increased_breathlessness', 'worsening_breathlessness', 'breathlessness_worsening', 'shortness_of_breath_worsening'
        ])
        
        spo2_drop = abs(spo2_dev.change) if (spo2_dev and spo2_dev.change < 0) else 0
        hr_rise = hr_dev.change if (hr_dev and hr_dev.change > 0) else 0
        curr_spo2 = vitals_dict.get('spo2')
        curr_hr = vitals_dict.get('heartRate')

        if (spo2_drop >= 4 or (curr_spo2 is not None and curr_spo2 <= 92)) and has_worsening_breathlessness and (hr_rise >= 10 or (curr_hr is not None and curr_hr >= 95)):
            reasons.append('Significant clinical deterioration: SpO₂ decrease with elevated heart rate and worsening breathlessness')
            highest_level = "HIGH"
                    
        return {'risk_level': highest_level, 'reasons': reasons}
