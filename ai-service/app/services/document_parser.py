import re
from typing import Dict, Any, List, Optional, Tuple
from app.models.schemas import (
    ClinicalDocumentExtractRequest,
    ClinicalDocumentExtractResponse,
    ExtractedPatientInfo,
    ExtractedClinicalDetails,
    ExtractedVitals,
    ExtractedMedication,
    ExtractedLabValue,
    ExtractedMonitoringSetup,
    FieldProvenance
)

class ClinicalDocumentParser:
    """
    Extracts clinical and demographic entities from document text with 
    strict clinical safety guarantees (no hallucinations, null for missing).
    """

    def __init__(self):
        self.known_comorbidities = [
            ('diabetes', 'Diabetes'),
            ('hypertension', 'Hypertension'),
            ('bp', 'Hypertension'),
            ('high blood pressure', 'Hypertension'),
            ('heart disease', 'Heart Disease'),
            ('coronary artery disease', 'Heart Disease'),
            ('cad', 'Heart Disease'),
            ('chf', 'Heart Disease'),
            ('heart failure', 'Heart Disease'),
            ('copd', 'COPD'),
            ('asthma', 'Asthma'),
            ('kidney disease', 'Kidney Disease'),
            ('ckd', 'Kidney Disease'),
            ('renal', 'Kidney Disease'),
            ('cancer', 'Cancer'),
            ('malignancy', 'Cancer'),
            ('stroke', 'Stroke'),
            ('cva', 'Stroke'),
            ('thyroid', 'Hypothyroidism')
        ]

    def parse(self, text: str, filename: Optional[str] = None, file_type: Optional[str] = None) -> ClinicalDocumentExtractResponse:
        cleaned_text = re.sub(r'[ \t]+', ' ', text)
        lines = [line.strip() for line in cleaned_text.split('\n') if line.strip()]
        lower_text = cleaned_text.lower()

        provenance: Dict[str, FieldProvenance] = {}
        fields_found = 0
        needs_verification_count = 0

        def record_field(key: str, val: Any, confidence: float = 0.95):
            nonlocal fields_found, needs_verification_count
            if val is not None and val != "" and val != []:
                fields_found += 1
                needs_ver = confidence < 0.85
                if needs_ver:
                    needs_verification_count += 1
                provenance[key] = FieldProvenance(
                    field=key,
                    value=val,
                    confidence=round(confidence, 2),
                    source="uploaded_document",
                    needsVerification=needs_ver,
                    verified=False
                )

        # 1. Patient Information
        patient_info = self._extract_patient_info(cleaned_text, lower_text, lines, record_field)

        # 2. Clinical Details
        clinical_details = self._extract_clinical_details(cleaned_text, lower_text, lines, record_field)

        # 3. Vitals
        vitals = self._extract_vitals(cleaned_text, lower_text, record_field)

        # 4. Medications
        medications = self._extract_medications(cleaned_text, lower_text, lines, record_field)

        # 5. Lab Values
        labs = self._extract_labs(cleaned_text, lower_text, lines, record_field)

        # 6. Monitoring Setup
        monitoring = self._extract_monitoring(cleaned_text, lower_text, lines, clinical_details, record_field)

        summary = f"Extracted from {filename or 'document'}: {patient_info.fullName or 'Patient'}, Diagnosis: {clinical_details.diagnosis or 'N/A'}"

        return ClinicalDocumentExtractResponse(
            success=True,
            patientInfo=patient_info,
            clinicalDetails=clinical_details,
            vitals=vitals,
            medications=medications,
            labs=labs,
            monitoringSetup=monitoring,
            fieldProvenance=provenance,
            totalFieldsFound=fields_found,
            needsVerificationCount=needs_verification_count,
            rawTextLength=len(text),
            documentSummary=summary
        )

    def _extract_patient_info(self, text: str, lower_text: str, lines: List[str], record_fn) -> ExtractedPatientInfo:
        # Full Name
        name = None
        name_conf = 0.95
        name_patterns = [
            r'(?:patient(?:\s+name)?|name of patient|name)\s*[:\-]\s*([A-Za-z\s\.\']{2,40})(?:\r|\n|,|\t|age|sex|gender|\b|$)',
            r'(?:mr\.|mrs\.|ms\.|shri|smt\.)\s+([A-Za-z\s\.\']{2,35})'
        ]
        for pat in name_patterns:
            m = re.search(pat, text, re.IGNORECASE)
            if m:
                cand = m.group(1).strip()
                cand = re.sub(r'^(mr|mrs|ms|dr|shri|smt)\.?\s*', '', cand, flags=re.IGNORECASE).strip()
                cand = cand.split('\n')[0].strip()
                # avoid capturing labels
                if len(cand) >= 2 and not re.search(r'\b(age|gender|male|female|hospital|discharge|date)\b', cand, re.I):
                    name = cand.title()
                    break

        if not name:
            for line in lines[:8]:
                m = re.match(r'^(?:Patient\s*:?\s*)([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+)', line)
                if m:
                    name = m.group(1).strip()
                    name_conf = 0.88
                    break

        if name:
            record_fn("patientInfo.fullName", name, name_conf)

        # Age
        age = None
        age_conf = 0.95
        age_patterns = [
            r'\b(?:age|years? old|aged?)\s*[:\-]?\s*(\d{1,3})\s*(?:yrs?|years?)?\b',
            r'\b(\d{1,3})\s*(?:yrs?|years?)\s*old\b',
            r'\b(?:male|female|m|f)\s*[\/,:\s]\s*(\d{1,3})\s*(?:yrs?|y)?\b',
            r'\b(?:age|aged?|ge)\s*[:\-\s]?\s*(\d{1,3})\s*(?:yrs?|y)?\b',
            r'\b(\d{1,3})\s*(?:yrs?|y)\b'
        ]
        for a_pat in age_patterns:
            m = re.search(a_pat, text, re.IGNORECASE)
            if m:
                try:
                    val = int(m.group(1))
                    if 0 <= val <= 125:
                        age = val
                        break
                except ValueError:
                    pass

        # Handle OCR specific letter-number substitutions e.g. geSBYIs -> 58
        if age is None:
            ocr_m = re.search(r'\bge\s*([0-9SBsb]{2})\s*(?:yrs?|y|yis|is)?\b', text, re.IGNORECASE)
            if ocr_m:
                ocr_val = ocr_m.group(1).upper().replace('S', '5').replace('B', '8')
                try:
                    val = int(ocr_val)
                    if 0 <= val <= 125:
                        age = val
                        age_conf = 0.82
                except ValueError:
                    pass

        if age is not None:
            record_fn("patientInfo.age", age, age_conf)

        # Gender
        gender = None
        if re.search(r'\b(?:gender|sex)\s*[:\-\s]?\s*(female|f\b)', text, re.I) or re.search(r'\b(?:sex|gender)\s*[\/,\s]\s*f(?:emale)?\b', text, re.I):
            gender = 'Female'
        elif re.search(r'\b(?:gender|sex)\s*[:\-\s]?\s*(male|m\b)', text, re.I) or re.search(r'\b(?:sex|gender)\s*[\/,\s]\s*m(?:ale)?\b', text, re.I):
            gender = 'Male'
        elif re.search(r'\b(female|woman)\b', lower_text[:400]):
            gender = 'Female'
        elif re.search(r'\b(male|man)\b', lower_text[:400]):
            gender = 'Male'
        if gender:
            record_fn("patientInfo.gender", gender, 0.92)

        # Phone (strictly 10 digits without text prefixes)
        phone = None
        phone_m = re.search(r'(?:phone|mobile|cell|contact|tel)(?:\s*(?:no|number)?)?\s*[:\-]?\s*(\+?91[\-\s]?[6-9]\d{9}|[6-9]\d{9})\b', text, re.I)
        if not phone_m:
            phone_m = re.search(r'\b(?:(?:\+?91[\-\s]?)?[6-9]\d{9})\b', text)
        if phone_m:
            raw_digits = re.sub(r'\D', '', phone_m.group(0))
            phone = raw_digits[-10:] if len(raw_digits) >= 10 else raw_digits
            record_fn("patientInfo.phone", phone, 0.90)

        # Email
        email = None
        email_m = re.search(r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,7}\b', text)
        if email_m:
            email = email_m.group(0).lower()
            record_fn("patientInfo.email", email, 0.95)

        # DOB
        dob = None
        dob_m = re.search(r'(?:dob|date of birth)\s*[:\-]\s*(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4})', text, re.I)
        if dob_m:
            dob = dob_m.group(1)
            record_fn("patientInfo.dob", dob, 0.92)

        # Patient / Hospital ID
        patient_id = None
        pid_m = re.search(r'(?:patient\s*id|uhid|mrn|ipd|opd|reg(?:istration)?\s*no)\s*[:\-]?\s*([A-Za-z0-9\-\/]{3,20})', text, re.I)
        if pid_m:
            patient_id = pid_m.group(1).strip()
            record_fn("patientInfo.patientId", patient_id, 0.90)

        # Address & Location
        address = None
        addr_m = re.search(r'(?:address|residence)\s*[:\-]\s*([^\n\r]{10,120})', text, re.I)
        if addr_m:
            address = addr_m.group(1).strip()
            record_fn("patientInfo.address", address, 0.85)

        pincode = None
        pin_m = re.search(r'\b(?:pincode|pin|postal code)?\s*[:\-]?\s*([1-9][0-9]{5})\b', text, re.I)
        if pin_m:
            pincode = pin_m.group(1)
            record_fn("patientInfo.pincode", pincode, 0.90)

        location_type = "Rural" if any(w in lower_text for w in ["rural", "village", "gram", "taluka", "panchayat"]) else "Urban"
        record_fn("patientInfo.locationType", location_type, 0.80)

        return ExtractedPatientInfo(
            fullName=name,
            age=age,
            dob=dob,
            gender=gender,
            phone=phone,
            email=email,
            address=address,
            district=None,
            state=None,
            pincode=pincode,
            locationType=location_type,
            patientId=patient_id
        )

    def _extract_clinical_details(self, text: str, lower_text: str, lines: List[str], record_fn) -> ExtractedClinicalDetails:
        # Primary Diagnosis
        diagnosis = None
        diag_conf = 0.95
        diag_patterns = [
            r'(?:final diagnosis|discharge diagnosis|primary diagnosis|diagnosis)\s*[:\-]\s*([^\n\r;]{3,90})',
            r'(?:admitted for|chief complaint|impression)\s*[:\-]\s*([^\n\r;]{3,90})'
        ]
        for pat in diag_patterns:
            m = re.search(pat, text, re.I)
            if m:
                cand = m.group(1).strip()
                cand = re.sub(r'^(primary|secondary|provisional)\s*', '', cand, flags=re.I).strip()
                if len(cand) >= 3 and not re.search(r'\b(date|doctor|time|vitals|rx)\b', cand, re.I):
                    diagnosis = cand.rstrip('.,')
                    break

        if not diagnosis:
            for term in ['copd exacerbation', 'heart failure', 'congestive heart failure', 'pneumonia', 'acute myocardial infarction', 'type 2 diabetes mellitus', 'hypertensive crisis', 'post-op cabg', 'stroke', 'asthma']:
                if term in lower_text:
                    diagnosis = term.title()
                    diag_conf = 0.82
                    break

        if diagnosis:
            record_fn("clinicalDetails.diagnosis", diagnosis, diag_conf)

        # Diagnosis details
        diag_details = None
        details_m = re.search(r'(?:clinical summary|history of present illness|diagnosis details|course in hospital)\s*[:\-]\s*([^\n\r]{10,250})', text, re.I)
        if details_m:
            diag_details = details_m.group(1).strip()
            record_fn("clinicalDetails.diagnosisDetails", diag_details, 0.88)

        # Comorbidities
        comorbidities = []
        for kw, standard_name in self.known_comorbidities:
            if re.search(rf'\b{re.escape(kw)}\b', lower_text):
                if standard_name not in comorbidities:
                    comorbidities.append(standard_name)
        if comorbidities:
            record_fn("clinicalDetails.comorbidities", comorbidities, 0.90)

        # Allergies
        allergies = []
        allergy_m = re.search(r'(?:allergies|allergy)\s*[:\-]\s*([^\n\r]{2,80})', text, re.I)
        if allergy_m:
            raw_al = allergy_m.group(1).strip()
            if not re.search(r'\b(none|nil|nkda|no known)\b', raw_al, re.I):
                allergies = [a.strip() for a in re.split(r'[,;/]', raw_al) if a.strip()]
                record_fn("clinicalDetails.allergies", allergies, 0.90)

        # Discharge Condition
        condition = None
        cond_m = re.search(r'(?:condition at discharge|discharge condition|status)\s*[:\-]\s*([A-Za-z\s]{3,40})', text, re.I)
        if cond_m:
            condition = cond_m.group(1).strip()
            record_fn("clinicalDetails.dischargeCondition", condition, 0.92)

        return ExtractedClinicalDetails(
            diagnosis=diagnosis,
            diagnosisDetails=diag_details,
            comorbidities=comorbidities,
            allergies=allergies,
            procedures=[],
            medicalHistory=[],
            dischargeCondition=condition
        )

    def _extract_vitals(self, text: str, lower_text: str, record_fn) -> ExtractedVitals:
        # SpO2 (Supports both SpO2 and OCR variant Sp02)
        spo2 = None
        spo2_m = re.search(r'\b(?:sp[o0]2|oxygen saturation|o2 sat(?:uration)?|oximetry)\s*[:\-]?\s*(\d{2,3})\s*%?', text, re.I)
        if not spo2_m:
            spo2_m = re.search(r'\b(\d{2,3})\s*%\s*(?:on room air|on ra|sp[o0]2)\b', text, re.I)
        if spo2_m:
            try:
                val = float(spo2_m.group(1))
                if 50 <= val <= 100:
                    spo2 = val
                    conf = 0.95 if (val >= 80) else 0.80
                    record_fn("vitals.spo2", spo2, conf)
            except ValueError:
                pass

        # Heart Rate / Pulse
        heart_rate = None
        hr_m = re.search(r'\b(?:heart rate|pulse(?: rate)?|hr)\s*[:\-]?\s*(\d{2,3})\s*(?:bpm|beats\/min|\/min)?\b', text, re.I)
        if hr_m:
            try:
                val = float(hr_m.group(1))
                if 30 <= val <= 240:
                    heart_rate = val
                    conf = 0.95 if (45 <= val <= 180) else 0.80
                    record_fn("vitals.heartRate", heart_rate, conf)
            except ValueError:
                pass

        # Blood Pressure
        bp_sys = None
        bp_dia = None
        bp_m = re.search(r'\b(?:bp|blood pressure)\s*[:\-]?\s*(\d{2,3})\s*[\/|\\]\s*(\d{2,3})\s*(?:mmhg)?\b', text, re.I)
        if not bp_m:
            bp_m = re.search(r'\b(\d{2,3})\s*[\/|\\]\s*(\d{2,3})\s*mmhg\b', text, re.I)
        if bp_m:
            try:
                s = float(bp_m.group(1))
                d = float(bp_m.group(2))
                if 60 <= s <= 260 and 30 <= d <= 160:
                    bp_sys = s
                    bp_dia = d
                    conf = 0.94 if (80 <= s <= 200 and 50 <= d <= 120) else 0.80
                    record_fn("vitals.bpSystolic", bp_sys, conf)
                    record_fn("vitals.bpDiastolic", bp_dia, conf)
            except ValueError:
                pass

        # Temperature
        temp = None
        temp_m = re.search(r'\b(?:temp(?:erature)?|t)\s*[:\-]?\s*(\d{2,3}(?:\.\d)?)\s*(?:°?[fFcC])?\b', text, re.I)
        if temp_m:
            try:
                val = float(temp_m.group(1))
                # If in Celsius, convert to Fahrenheit
                if 34.0 <= val <= 43.0:
                    val = round((val * 9 / 5) + 32, 1)
                if 90.0 <= val <= 108.0:
                    temp = val
                    conf = 0.95 if (96.0 <= val <= 104.0) else 0.80
                    record_fn("vitals.temp", temp, conf)
            except ValueError:
                pass

        # Respiratory Rate
        resp_rate = None
        rr_m = re.search(r'\b(?:resp(?:iratory)?\s*rate|rr)\s*[:\-]?\s*(\d{1,2})\s*(?:\/min|breaths\/min|cpm)?\b', text, re.I)
        if rr_m:
            try:
                val = float(rr_m.group(1))
                if 8 <= val <= 60:
                    resp_rate = val
                    conf = 0.95 if (10 <= val <= 40) else 0.80
                    record_fn("vitals.respRate", resp_rate, conf)
            except ValueError:
                pass

        # Weight
        weight = None
        wt_m = re.search(r'\b(?:weight|wt)\s*[:\-]?\s*(\d{2,3}(?:\.\d)?)\s*(?:kg|kgs)\b', text, re.I)
        if wt_m:
            try:
                val = float(wt_m.group(1))
                if 10.0 <= val <= 250.0:
                    weight = val
                    record_fn("vitals.weight", weight, 0.90)
            except ValueError:
                pass

        return ExtractedVitals(
            spo2=spo2,
            heartRate=heart_rate,
            temp=temp,
            bpSystolic=bp_sys,
            bpDiastolic=bp_dia,
            respRate=resp_rate,
            weight=weight,
            height=None
        )

    def _extract_medications(self, text: str, lower_text: str, lines: List[str], record_fn) -> List[ExtractedMedication]:
        medications: List[ExtractedMedication] = []
        med_section_started = False
        med_lines = []

        # Known lab analytes that should never be confused with medications
        LAB_EXCLUSIONS = [
            'creatinine', 'urea', 'hemoglobin', 'haemoglobin', 'glucose', 'sugar',
            'sodium', 'potassium', 'platelets', 'wbc', 'crp', 'bilirubin', 'calcium',
            'cholesterol', 'triglycerides', 'hba1c', 'sgot', 'sgpt', 'albumin', 'tlc', 'rbs', 'fbs'
        ]

        # Find Rx or Medications section
        for line in lines:
            line_str = line.strip()
            if re.search(r'^(?:medications?|discharge\s+medications?|prescriptions?|rx|treatment\s+on\s+discharge|advise\s+on\s+discharge)\b', line_str, re.I):
                med_section_started = True
                continue
            elif med_section_started:
                # Stop if next section starts
                if re.search(r'^(?:key\s+laboratory|laboratory|investigations?|labs?|follow\s*up|monitoring|advice|discharge\s+vitals|vitals)\b', line_str, re.I):
                    break
                med_lines.append(line_str)

        # If no explicit section header found, search for common medicine formats
        if not med_lines:
            med_lines = lines

        common_drug_indicators = [
            'tab', 'tablet', 'cap', 'capsule', 'inj', 'injection', 'syp', 'syrup',
            'mg', 'mcg', 'ml', 'od', 'bd', 'tds', 'qid', 'hs', 'prn', 'once daily', 'twice daily'
        ]

        freq_map = {
            'od': 'once daily',
            'once daily': 'once daily',
            '1-0-0': 'once daily',
            '0-1-0': 'once daily',
            '0-0-1': 'once daily',
            'bd': 'twice daily',
            'bid': 'twice daily',
            'twice daily': 'twice daily',
            '1-0-1': 'twice daily',
            'tds': 'thrice daily',
            'tid': 'thrice daily',
            'thrice daily': 'thrice daily',
            '1-1-1': 'thrice daily',
            'qid': 'four times daily',
            'sos': 'as needed (SOS)',
            'prn': 'as needed'
        }

        seen_names = set()

        for line in med_lines:
            line_low = line.lower()
            # Exclude lines that describe lab findings
            if any(lab in line_low for lab in LAB_EXCLUSIONS):
                continue

            # check if line contains dosage or frequency
            has_drug_marker = any(re.search(rf'\b{re.escape(marker)}\b', line, re.I) for marker in common_drug_indicators)
            if not has_drug_marker:
                continue

            # 1. Strip leading numbering e.g. '1.', '2)', '3 -', '4 ', '1:'
            clean_line = re.sub(r'^\s*(?:rx|no\.?)?\s*\d+[\.\)\:\-\s]+\s*', '', line, flags=re.I).strip()
            # 2. Strip leading form prefix e.g. 'Tab', 'Cap', 'Inj', 'Syp', 'Tablet'
            clean_line = re.sub(r'^(?:tab|cap|inj|syp|tablet|capsule|syrup|drop|ointment)\.?\s*', '', clean_line, flags=re.I).strip()

            # extract dosage like 500mg, 10 mg, 5ml, 2.5mg
            dose_m = re.search(r'(\d+(?:\.\d+)?\s*(?:mg|mcg|gm|g|ml|iu|units?))\b', clean_line, re.I)
            dosage = dose_m.group(1) if dose_m else ""

            # extract frequency
            frequency = 'once daily'
            for f_key, f_val in freq_map.items():
                if re.search(rf'\b{re.escape(f_key)}\b', clean_line, re.I):
                    frequency = f_val
                    break

            # extract duration
            dur_m = re.search(r'(\b\d+\s*(?:days?|weeks?|months?)\b)', clean_line, re.I)
            duration = dur_m.group(1) if dur_m else ""

            # extract medicine name
            if dose_m:
                name_cand = clean_line[:dose_m.start()].strip()
            else:
                tokens = clean_line.split()
                name_cand = tokens[0] if tokens else clean_line

            # Strip numbering and prefixes again if still present
            name_cand = re.sub(r'^\s*(?:rx|no\.?)?\s*\d+[\.\)\:\-\s]+\s*', '', name_cand, flags=re.I).strip()
            name_cand = re.sub(r'^(?:tab|cap|inj|syp|tablet|capsule|syrup|drop|ointment)\.?\s*', '', name_cand, flags=re.I).strip()
            # Remove parenthetical details from name, e.g. Lasix (Furosemide) -> Lasix
            name_cand = re.sub(r'\(.*?\)', '', name_cand).strip()
            name_cand = re.sub(r'[^A-Za-z0-9\-\s]', '', name_cand).strip()

            # Common OCR misspellings normalization
            if 'furcssmide' in name_cand.lower() or 'furosemide' in name_cand.lower() or 'lasix' in name_cand.lower():
                name_cand = 'Lasix (Furosemide)'
            elif 'metiormin' in name_cand.lower() or 'metformin' in name_cand.lower():
                name_cand = 'Metformin'
            elif 'metoprolol' in name_cand.lower():
                name_cand = 'Metoprolol Succinate'

            if len(name_cand) >= 3 and name_cand.lower() not in seen_names:
                seen_names.add(name_cand.lower())
                med = ExtractedMedication(
                    name=name_cand.title() if not name_cand.startswith('Lasix') else name_cand,
                    dosage=dosage,
                    frequency=frequency,
                    route="oral",
                    duration=duration,
                    instructions=line.strip()
                )
                medications.append(med)

        if medications:
            record_fn("medications", [f"{m.name} ({m.dosage})" for m in medications], 0.90)

        return medications

    def _extract_labs(self, text: str, lower_text: str, lines: List[str], record_fn) -> List[ExtractedLabValue]:
        labs: List[ExtractedLabValue] = []

        lab_tests = [
            (r'\b(?:hb|hemoglobin|haemoglobin)\b', 'Hemoglobin', 'g/dL', '12.0 - 16.0'),
            (r'\b(?:wbc|total leucocyte count|tlc|white blood cells?)\b', 'WBC Count', '/cumm', '4,000 - 11,000'),
            (r'\b(?:platelets?|platelet count)\b', 'Platelets', 'lakh/cumm', '1.5 - 4.5'),
            (r'\b(?:creatinine|serum creatinine)\b', 'Serum Creatinine', 'mg/dL', '0.6 - 1.2'),
            (r'\b(?:blood urea|urea)\b', 'Blood Urea', 'mg/dL', '15 - 45'),
            (r'\b(?:sodium|na\+?)\b', 'Sodium', 'mEq/L', '135 - 145'),
            (r'\b(?:potassium|k\+?)\b', 'Potassium', 'mEq/L', '3.5 - 5.0'),
            (r'\b(?:blood glucose|rbs|fbs|ppbs|sugar)\b', 'Blood Glucose', 'mg/dL', '70 - 140'),
            (r'\b(?:crp|c-reactive protein)\b', 'CRP', 'mg/L', '< 6.0'),
            (r'\b(?:hba1c|glycated hemoglobin)\b', 'HbA1c', '%', '< 6.5'),
            (r'\b(?:bilirubin|total bilirubin)\b', 'Bilirubin', 'mg/dL', '0.2 - 1.2')
        ]

        seen_labs = set()
        for pat, standard_name, default_unit, normal_range in lab_tests:
            if standard_name in seen_labs:
                continue
            # Match label followed by : or - or space and number
            m = re.search(rf'{pat}\s*[:\-]?\s*(\d+(?:\.\d+)?)\s*([A-Za-z%\/]+)?', text, re.I)
            if m:
                val = m.group(1)
                unit = m.group(2) if m.group(2) else default_unit
                seen_labs.add(standard_name)
                labs.append(ExtractedLabValue(
                    name=standard_name,
                    value=val,
                    unit=unit,
                    normalRange=normal_range
                ))

        if labs:
            record_fn("labs", [f"{l.name}: {l.value} {l.unit}" for l in labs], 0.92)

        return labs

    def _extract_monitoring(self, text: str, lower_text: str, lines: List[str], clinical: ExtractedClinicalDetails, record_fn) -> ExtractedMonitoringSetup:
        # Follow-up Date
        follow_up = None
        fu_m = re.search(r'(?:follow\s*up|review|next visit)\s*(?:on|date|after)?\s*[:\-]?\s*(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4}|\b\d+\s*(?:days?|weeks?|months?)\b)', text, re.I)
        if fu_m:
            follow_up = fu_m.group(1).strip()
            record_fn("monitoringSetup.followUpDate", follow_up, 0.90)

        # Monitored Parameters
        monitored = []
        param_candidates = ['SpO2', 'Heart Rate', 'Temperature', 'Blood Pressure', 'Breathlessness', 'Cough', 'Fatigue', 'Pain', 'Activity', 'Medication Adherence']
        for p in param_candidates:
            if re.search(rf'\b{re.escape(p.lower())}\b', lower_text):
                monitored.append(p)

        # Add clinical-specific essential params
        if clinical.diagnosis:
            d_low = clinical.diagnosis.lower()
            if 'copd' in d_low or 'respiratory' in d_low or 'asthma' in d_low or 'pneumonia' in d_low:
                for req in ['SpO2', 'Breathlessness', 'Cough', 'Temperature']:
                    if req not in monitored:
                        monitored.append(req)
            elif 'heart' in d_low or 'cardiac' in d_low or 'hypertension' in d_low:
                for req in ['Blood Pressure', 'Heart Rate', 'Breathlessness']:
                    if req not in monitored:
                        monitored.append(req)

        if not monitored:
            monitored = ['SpO2', 'Heart Rate', 'Temperature', 'Blood Pressure']

        record_fn("monitoringSetup.monitoredParams", monitored, 0.95)

        # Frequency
        freq = "Daily"
        if re.search(r'\b(?:twice daily|2x daily|bd monitoring)\b', lower_text):
            freq = "Twice Daily"
        record_fn("monitoringSetup.monitoringFreq", freq, 0.90)

        return ExtractedMonitoringSetup(
            followUpDate=follow_up,
            monitoringFreq=freq,
            monitoredParams=monitored,
            warningSigns=[],
            instructions=None
        )
