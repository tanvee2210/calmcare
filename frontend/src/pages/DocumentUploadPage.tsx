import React, { useState, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../utils/api';
import {
  Upload,
  Camera,
  FileText,
  AlertCircle,
  CheckCircle2,
  Sparkles,
  ArrowRight,
  RefreshCw,
  Eye
} from 'lucide-react';

interface DocumentUploadPageProps {
  onUploadSuccess: (docData: any) => void;
  initialCaseId?: string | null;
}

export const DocumentUploadPage: React.FC<DocumentUploadPageProps> = ({ onUploadSuccess, initialCaseId }) => {
  const { setActivePlan } = useAuth();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [textInput, setTextInput] = useState('');
  const [useCamera, setUseCamera] = useState(false);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [capturedPhoto, setCapturedPhoto] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Synthetic cases dictionary
  const SYNTHETIC_SAMPLES: Record<string, { title: string; text: string }> = {
    'case-cardiac-001': {
      title: 'Cardiac: Ramesh Kumar (Stent & Antiplatelets)',
      text: `APOLLO HOSPITALS - DISCHARGE SUMMARY
PATIENT NAME: Ramesh Kumar Sharma | AGE: 58Y / MALE | IP NO: AP-884920
ADMISSION: 02/10/2026 | DISCHARGE: 06/10/2026
DEPARTMENT: Cardiology | CONSULTANT: Dr. V. Narayanan, MD, DM (Card)

DIAGNOSIS:
Acute Coronary Syndrome (NSTEMI) - S/P Primary PTCA with Drug-Eluting Stent (DES) to proximal LAD on 02/10/2026.
Essential Hypertension. Dyslipidemia.

DISCHARGE MEDICATIONS:
1. Tab. Ecosprin (Aspirin) 75 mg - 1 tablet - Once daily (OD) - After lunch - Duration: Lifelong
2. Tab. Clopilet (Clopidogrel) 75 mg - 1 tablet - Once daily (OD) - Morning after breakfast - Duration: 12 months
3. Tab. Atorva (Atorvastatin) 40 mg - 1 tablet - Once daily at bedtime (HS) - Duration: Ongoing
4. Tab. Telma (Telmisartan) 40 mg - 1 tablet - Once daily (OD) - Morning - Duration: Ongoing
5. Tab. Metolar XR (Metoprolol Succinate) 25 mg - 1 tablet - Once daily (OD) - Morning - Duration: 6 months
6. Tab. Pan 40 (Pantoprazole) 40 mg - 1 tablet - Once daily before breakfast (OD BBF) - Duration: 1 month
7. Tab. Sorbitrate 5 mg - 1 tablet Sublingual (SL) - SOS only if severe chest pain occurs

DIET & ACTIVITY INSTRUCTIONS:
- Strict low-salt diet (< 3 grams/day), strictly low-fat and low-cholesterol diet.
- No heavy weight lifting (> 5 kg) or strenuous exercise for 4 weeks.
- Light brisk walking for 20 minutes daily starting after 1 week.

WARNING SIGNS - RETURN TO EMERGENCY IMMEDIATELY IF:
- Recurrent severe chest pain, tightness or pressure radiating to jaw or left arm
- Shortness of breath at rest or profuse unexplained sweating
- Dizziness, blackouts or syncope

FOLLOW-UP APPOINTMENT:
- Visit Cardiology OPD on 20/10/2026 at 10:30 AM with Dr. V. Narayanan.`
    },
    'case-diabetes-002': {
      title: 'Diabetes: Lakshmi Narayanan (Insulin & Metformin)',
      text: `FORTIS HEALTHCARE - DISCHARGE SUMMARY
PATIENT: Lakshmi Narayanan | AGE: 52Y / F | IP: FH-49201
ADMITTED: 15/09/2026 | DISCHARGED: 18/09/2026
ENDOCRINOLOGY CLINIC | CONSULTANT: Dr. S. Rao, DM (Endo)

DIAGNOSIS:
Uncontrolled Type 2 Diabetes Mellitus with severe symptomatic hyperglycemia (BSL on admission 480 mg/dL, HbA1c 11.2%). Resolved without ketoacidosis.

DISCHARGE MEDICATIONS:
1. Inj. Human Mixtard (30/70) - 16 Units Subcutaneous (SC) before breakfast, and 10 Units Subcutaneous (SC) before dinner daily.
2. Tab. Glycomet (Metformin) 500 mg - 1 tablet - Twice daily (BD) - Taken with meals - Duration: Ongoing
3. Tab. Gabapin (Gabapentin) 100 mg - 1 tablet - Once daily at bedtime (HS) - Duration: 3 months

DIET & LIFESTYLE:
- Diabetic diet with strict carbohydrate counting: strictly avoid refined sugar, sweets, white bread.
- Foot care: inspect feet daily for cuts, blisters or cracks; do not walk barefoot.

WARNING SIGNS - SEEK IMMEDIATE CARE IF:
- Signs of hypoglycemia (sugar < 70 mg/dL): shakiness, sweating, palpitations, confusion (take 3 glucose biscuits immediately)
- Extreme drowsiness or persistent vomiting

FOLLOW-UP:
- Endocrinology clinic review on 02/10/2026 at 11:00 AM with home glucose log and repeat Fasting Blood Sugar.`
    },
    'case-postop-003': {
      title: 'Post-Op: Priya Ananth (Appendectomy)',
      text: `MANIPAL HOSPITAL - SURGICAL DISCHARGE SUMMARY
PATIENT: Priya Ananth | AGE: 29Y / F | MRN: MH-90213
ADMISSION: 10/10/2026 | DISCHARGE: 13/10/2026
GENERAL SURGERY | SURGEON: Dr. Anita Deshmukh, MS, FMAS

OPERATIVE PROCEDURE:
Laparoscopic Appendectomy on 10/10/2026 under General Anesthesia.

DISCHARGE MEDICATIONS:
1. Tab. Augmentin (Amoxicillin + Clavulanate) 625 mg - 1 tablet - Twice daily (BD) - After food - Duration: 5 days
2. Tab. Dolo 650 (Paracetamol) 650 mg - 1 tablet - Three times daily (TDS) - After food - Duration: 3 days, then SOS for pain
3. Tab. Pantocid (Pantoprazole) 40 mg - 1 tablet - Once daily (OD) - Before breakfast - Duration: 5 days
4. Syp. Cremaffin 15 mL - At bedtime (HS) - Duration: 5 days as needed for constipation

WOUND CARE & RECOVERY:
- Keep port site dressings dry and intact until post-op review. Sponge bath allowed.
- No lifting weights heavier than 3 kg for 3 weeks.
- Avoid driving for 7 days.

WARNING SIGNS - REPORT TO EMERGENCY IF:
- High fever (> 101 F) with chills
- Redness, severe tenderness, or foul-smelling pus oozing from surgical incisions

FOLLOW-UP APPOINTMENT:
- Surgical OPD on 20/10/2026 at 02:00 PM with Dr. Anita Deshmukh.`
    },
    'case-respiratory-004': {
      title: 'Respiratory: Mohammad Irfan (COPD Inhalers)',
      text: `MAX SUPER SPECIALITY HOSPITAL - DISCHARGE SUMMARY
PATIENT: Mohammad Irfan | AGE: 64Y / M | UHID: MX-10294
ADMITTED: 28/09/2026 | DISCHARGED: 03/10/2026
PULMONOLOGY | CONSULTANT: Dr. Rajiv Mehra, MD (Pulm)

DIAGNOSIS:
Acute Exacerbation of COPD triggered by lower respiratory tract infection.

DISCHARGE MEDICATIONS:
1. Foracort Inhaler (Formoterol 6 mcg + Budesonide 200 mcg) - 2 puffs - Twice daily (BD) - Duration: Ongoing
   *Note: Rinse mouth and gargle with water thoroughly after each use.*
2. Asthalin Inhaler (Salbutamol 100 mcg) - 2 puffs - SOS only when experiencing sudden breathlessness or wheeze.
3. Tab. Omnacortil (Prednisolone) 20 mg - 1 tablet - Once daily in morning after food - Duration: 5 days, then reduce to 10 mg once daily for 3 days, then stop.
4. Tab. Ceftum (Cefuroxime Axetil) 500 mg - 1 tablet - Twice daily (BD) - After meals - Duration: 5 days
5. Tab. Pan 40 40 mg - 1 tablet - OD before breakfast - Duration: 8 days

WARNING SIGNS - RUSH TO EMERGENCY IF:
- Severe breathlessness not relieved within 10 minutes of Asthalin inhaler
- SpO2 drops below 88% on pulse oximeter
- Blue discoloration of lips or fingertips

FOLLOW-UP APPOINTMENT:
- Pulmonary Medicine OPD on 12/10/2026 at 11:30 AM with Dr. Rajiv Mehra.`
    },
    'case-maternity-005': {
      title: 'Maternity: Sunita Devi (C-Section & Post-Partum)',
      text: `KEM HOSPITAL - MATERNITY DISCHARGE SUMMARY
PATIENT: Sunita Devi Sharma | AGE: 27Y / F | BED: MAT-12
ADMITTED: 08/10/2026 | DISCHARGED: 11/10/2026
OBSTETRICS & GYNAECOLOGY | UNIT HEAD: Dr. Meena Chawla, MD (OBG)

DELIVERY DETAILS:
Emergency Lower Segment Caesarean Section (LSCS) on 08/10/2026. Delivered live male baby (3.2 kg).

DISCHARGE MEDICATIONS:
1. Tab. Orofer-XT (Ferrous Ascorbate + Folic Acid) - 1 tablet - Once daily (OD) - Post lunch with lemon water - Duration: 3 months
2. Tab. Shelcal 500 (Calcium carbonate 500 mg + Vit D3) - 1 tablet - Twice daily (BD) - After meals - Duration: 6 months
3. Tab. Dolo 650 (Paracetamol) 650 mg - 1 tablet - TDS SOS only for incisional pain - Duration: 5 days
4. Tab. Augmentin 625 mg - 1 tablet - BD after food - Duration: 5 days

POST-PARTUM CARE:
- Exclusive breastfeeding on demand every 2 to 3 hours.
- Keep cesarean wound dressing clean and dry. Avoid lifting anything heavier than baby for 6 weeks.

WARNING SIGNS:
- Heavy vaginal bleeding (soaking >1 pad/hr)
- Fever > 100.4 F or foul lochia
- Severe headache with vision changes

FOLLOW-UP APPOINTMENT:
- OBG OPD on 19/10/2026 at 10:00 AM with Dr. Meena Chawla.`
    },
    'case-edge-conflict-006': {
      title: 'Contradiction Test: Amlodipine 5 mg vs 50 mg',
      text: `HOSPITAL DISCHARGE NOTE - CONFLICT TEST CASE
PATIENT: Kishore Gopal | AGE: 61Y / M

SECTION 1 - CLINICAL ORDERS:
Tab. Amlodipine 5 mg PO Once Daily in morning.

SECTION 4 - DISCHARGE PRESCRIPTION:
Tab. Amlodipine 50 mg PO Once Daily in morning.
Tab. Torsemide 10 mg OD.

FOLLOW-UP:
Cardio-Nephro clinic on 15/10/2026.`
    },
    'case-edge-unreadable-007': {
      title: 'Blurry / Unreadable Scan Test Case',
      text: `DISCHARGE NOTE - BLURRY / UNREADABLE SCAN
PATIENT: Anil Verma
Medications:
1. Tab. Amox??? [blurry / unreadable strength] mg - ?? times daily for ?? days.
2. Tab. [illegible analgesic] ??? mg SOS
Follow up: In ??? days.`
    }
  };

  React.useEffect(() => {
    if (initialCaseId && SYNTHETIC_SAMPLES[initialCaseId]) {
      setTextInput(SYNTHETIC_SAMPLES[initialCaseId].text);
    }
  }, [initialCaseId]);

  // Start Camera Capture (Feature 1)
  const startCamera = async () => {
    setError(null);
    setUseCamera(true);
    setCapturedPhoto(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1920 }, height: { ideal: 1080 } },
      });
      setCameraStream(stream);
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err: any) {
      setError("Camera permission denied or camera device unavailable. You can upload an image file instead.");
      setUseCamera(false);
    }
  };

  const stopCamera = () => {
    if (cameraStream) {
      cameraStream.getTracks().forEach(t => t.stop());
      setCameraStream(null);
    }
    setUseCamera(false);
  };

  const captureSnapshot = () => {
    if (!videoRef.current) return;
    const canvas = document.createElement('canvas');
    canvas.width = videoRef.current.videoWidth || 1280;
    canvas.height = videoRef.current.videoHeight || 720;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
      const dataUrl = canvas.toDataURL('image/jpeg', 0.92);
      setCapturedPhoto(dataUrl);
      stopCamera();
    }
  };

  const handleProcessDocument = async () => {
    setError(null);
    setLoading(true);
    setUploadProgress('Reading discharge summary and inspecting document quality...');

    try {
      const formData = new FormData();

      if (selectedFile) {
        formData.append('file', selectedFile);
        formData.append('filename_override', selectedFile.name);
      } else if (capturedPhoto) {
        // Convert base64 photo to Blob
        const res = await fetch(capturedPhoto);
        const blob = await res.blob();
        formData.append('file', blob, 'camera_capture_page1.jpg');
      } else if (textInput.trim()) {
        formData.append('raw_text_input', textInput);
        formData.append('filename_override', 'synthetic_summary.txt');
      } else {
        throw new Error('Please upload a PDF/Image, capture with camera, or select a synthetic test case.');
      }

      setUploadProgress('Running smart medical extraction and abbreviation normalization...');
      
      const uploadRes = await api.post<any>('/api/documents/upload', formData);
      
      setUploadProgress('Running independent medical verification engine against source passages...');
      setActivePlan(uploadRes.care_plan);
      onUploadSuccess(uploadRes);
    } catch (err: any) {
      setError(err.message || 'Failed to process document.');
    } finally {
      setLoading(false);
      setUploadProgress(null);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      
      <div className="mb-8 text-center sm:text-left">
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
          Upload or Photograph Discharge Summary
        </h1>
        <p className="text-sm text-slate-600 mt-1">
          Feature 1 & 2 • PDF, camera snapshot, or direct synthetic clinical cases.
        </p>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
          <div>
            <span className="font-bold block">Document Processing Notice:</span>
            {error}
          </div>
        </div>
      )}

      {/* Input Mode Selector */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        
        {/* Mode 1: File Upload */}
        <div
          onClick={() => fileInputRef.current?.click()}
          className={`p-6 rounded-2xl border-2 border-dashed text-center cursor-pointer transition-all ${
            selectedFile
              ? 'border-teal-500 bg-teal-50/50'
              : 'border-slate-300 hover:border-teal-400 bg-white hover:bg-slate-50'
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.png,.jpg,.jpeg"
            className="hidden"
            onChange={e => {
              if (e.target.files && e.target.files[0]) {
                setSelectedFile(e.target.files[0]);
                setCapturedPhoto(null);
                setTextInput('');
              }
            }}
          />
          <Upload className="w-8 h-8 text-teal-600 mx-auto mb-2" />
          <h3 className="text-sm font-bold text-slate-900">Choose PDF / Image</h3>
          <p className="text-[11px] text-slate-500 mt-1">
            {selectedFile ? selectedFile.name : 'PDF, JPG or PNG (Up to 25MB)'}
          </p>
        </div>

        {/* Mode 2: Camera Capture */}
        <div
          onClick={startCamera}
          className={`p-6 rounded-2xl border-2 border-dashed text-center cursor-pointer transition-all ${
            capturedPhoto
              ? 'border-teal-500 bg-teal-50/50'
              : 'border-slate-300 hover:border-teal-400 bg-white hover:bg-slate-50'
          }`}
        >
          <Camera className="w-8 h-8 text-teal-600 mx-auto mb-2" />
          <h3 className="text-sm font-bold text-slate-900">Photograph Paper</h3>
          <p className="text-[11px] text-slate-500 mt-1">
            {capturedPhoto ? '1 Page Photo Captured ✓' : 'Use phone or web camera'}
          </p>
        </div>

        {/* Mode 3: Synthetic Demonstrations */}
        <div
          onClick={() => {
            setTextInput(SYNTHETIC_SAMPLES['case-cardiac-001'].text);
            setSelectedFile(null);
            setCapturedPhoto(null);
          }}
          className={`p-6 rounded-2xl border-2 border-dashed text-center cursor-pointer transition-all ${
            textInput
              ? 'border-teal-500 bg-teal-50/50'
              : 'border-slate-300 hover:border-teal-400 bg-white hover:bg-slate-50'
          }`}
        >
          <Sparkles className="w-8 h-8 text-teal-600 mx-auto mb-2" />
          <h3 className="text-sm font-bold text-slate-900">Synthetic Cases</h3>
          <p className="text-[11px] text-slate-500 mt-1">
            5 clinical benchmark conditions
          </p>
        </div>
      </div>

      {/* Live Camera View Modal */}
      {useCamera && (
        <div className="mb-8 p-4 bg-slate-900 rounded-2xl text-white text-center">
          <video ref={videoRef} autoPlay playsInline className="w-full max-h-80 object-cover rounded-xl mx-auto mb-4" />
          <div className="flex justify-center gap-3">
            <button
              onClick={captureSnapshot}
              className="px-6 py-2.5 bg-teal-600 text-white rounded-xl text-xs font-bold hover:bg-teal-700 shadow-md flex items-center gap-2"
            >
              <Camera className="w-4 h-4" /> Take Snapshot
            </button>
            <button
              onClick={stopCamera}
              className="px-4 py-2.5 bg-slate-700 text-white rounded-xl text-xs font-semibold hover:bg-slate-600"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Captured Photo Preview */}
      {capturedPhoto && (
        <div className="mb-6 p-4 bg-white border border-slate-200 rounded-2xl flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src={capturedPhoto} alt="Captured summary" className="w-16 h-16 object-cover rounded-lg border border-slate-200" />
            <div>
              <span className="text-xs font-bold text-slate-900 block">Camera Page 1 Captured</span>
              <span className="text-[11px] text-teal-700 font-medium">Ready for OCR and verification</span>
            </div>
          </div>
          <button
            onClick={() => setCapturedPhoto(null)}
            className="text-xs text-rose-600 hover:underline font-semibold"
          >
            Retake Photo
          </button>
        </div>
      )}

      {/* Synthetic Case Selector Dropdown & Editor */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm mb-8">
        <div className="flex items-center justify-between mb-3">
          <label className="text-xs font-bold text-slate-800 uppercase tracking-wider">
            Discharge Summary Text / Synthetic Case
          </label>
          <select
            onChange={e => {
              const val = e.target.value;
              if (val && SYNTHETIC_SAMPLES[val]) {
                setTextInput(SYNTHETIC_SAMPLES[val].text);
                setSelectedFile(null);
                setCapturedPhoto(null);
              }
            }}
            className="text-xs border border-slate-200 rounded-lg px-2.5 py-1.5 bg-slate-50 font-medium text-slate-800"
          >
            <option value="">Load Grounded Case...</option>
            {Object.entries(SYNTHETIC_SAMPLES).map(([key, item]) => (
              <option key={key} value={key}>{item.title}</option>
            ))}
          </select>
        </div>

        <textarea
          rows={10}
          value={textInput}
          onChange={e => {
            setTextInput(e.target.value);
            setSelectedFile(null);
            setCapturedPhoto(null);
          }}
          placeholder="Paste or inspect discharge summary text here..."
          className="w-full p-4 rounded-xl border border-slate-200 text-xs font-mono text-slate-800 leading-relaxed focus:outline-none focus:ring-2 focus:ring-teal-500 bg-slate-50/50"
        />
      </div>

      {/* Primary Action Button */}
      <div className="flex flex-col items-center gap-3">
        {uploadProgress && (
          <div className="flex items-center gap-2 text-xs font-medium text-teal-700 animate-pulse">
            <RefreshCw className="w-4 h-4 animate-spin text-teal-600" />
            <span>{uploadProgress}</span>
          </div>
        )}

        <button
          onClick={handleProcessDocument}
          disabled={loading || (!selectedFile && !capturedPhoto && !textInput.trim())}
          className="w-full sm:w-auto px-8 py-3.5 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-base font-bold shadow-lg shadow-teal-600/20 flex items-center justify-center gap-2 active:scale-98 transition-all disabled:opacity-50"
        >
          {loading ? 'Processing Document & Verifying Facts...' : 'Generate Verified Patient Plan'}
          <ArrowRight className="w-5 h-5" />
        </button>
      </div>

    </div>
  );
};
