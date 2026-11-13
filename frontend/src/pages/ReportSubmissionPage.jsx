import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Building2, 
  Send, 
  CheckCircle2, 
  AlertCircle, 
  Binary, 
  Sparkles, 
  Layers, 
  ArrowRight,
  ShieldCheck,
  Zap,
  Info,
  Check,
  X
} from 'lucide-react';
import { reportService, validationService, classificationService } from '../services/api';
import { useAuth } from '../context/AuthContext';
import DfaVisualizationModal from '../components/DfaVisualizationModal';

const PRESET_CASES = [
  {
    name: 'Cash Dispenser Jam',
    reporter_name: 'David Miller',
    reporter_id: 'REP-1024',
    atm_id: 'ATM-NYC-1042',
    branch_code: 'BR-NY101',
    zone: 'North',
    error_code: 'ERR-CASH-101',
    urgency: 'High',
    error_description: 'Cassette 2 feeder mechanism jammed during customer cash dispense payout. Shutter cannot close.',
  },
  {
    name: 'Card Swallowed (Critical)',
    reporter_name: 'Carlos Mendes',
    reporter_id: 'REP-3108',
    atm_id: 'ATM-MUM-8821',
    branch_code: 'BR-FL302',
    zone: 'South',
    error_code: 'ERR-CARD-201',
    urgency: 'Critical',
    error_description: 'Motorized EMV reader swallowed customer debit card. Sensor reports trapped card obstruction and high alarm risk.',
  },
  {
    name: 'Network Switch Timeout',
    reporter_name: 'Emily Watson',
    reporter_id: 'REP-4209',
    atm_id: 'ATM-TOK-5510',
    branch_code: 'BR-IL405',
    zone: 'East',
    error_code: 'ERR-NETW-301',
    urgency: 'Medium',
    error_description: 'Socket connection to host core banking switch timed out after 30000ms. IP gateway unreachable.',
  },
  {
    name: 'Hardware Printer Fault',
    reporter_name: 'Elena Rostova',
    reporter_id: 'REP-5312',
    atm_id: 'ATM-PAR-9014',
    branch_code: 'BR-CA204',
    zone: 'West',
    error_code: 'ERR-HARD-401',
    urgency: 'Low',
    error_description: 'Receipt printer thermal paper roll exhausted. Cutter blade reset required.',
  },
  {
    name: 'Conflicting Keywords Demo',
    reporter_name: 'Victoria Sterling',
    reporter_id: 'REP-1024',
    atm_id: 'ATM-CHI-3301',
    branch_code: 'BR-TX501',
    zone: 'Central',
    error_code: 'ERR-TRAN-501',
    urgency: 'High',
    error_description: 'Double debit ledger sync failed while cash dispense mechanism purges and card reader reports disconnect.',
  }
];

const ReportSubmissionPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    reporter_name: user?.full_name || 'David Miller',
    reporter_id: 'REP-1024',
    atm_id: 'ATM-NYC-1042',
    branch_code: 'BR-NY101',
    zone: 'North',
    error_code: 'ERR-CASH-101',
    urgency: 'High',
    error_description: 'Cassette 2 feeder mechanism jammed during customer payout. Shutter stuck halfway open.',
    additional_details: 'Customer was standing at terminal #2. CCTV camera operational.',
  });

  // Inline Validation states
  const [validations, setValidations] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(null);

  // Live classification preview
  const [classificationPreview, setClassificationPreview] = useState(null);

  // DFA modal inspector state
  const [dfaModalOpen, setDfaModalOpen] = useState(false);
  const [inspectingField, setInspectingField] = useState('ATM_ID');

  // Trigger inline validation when structured fields change
  useEffect(() => {
    const validateFields = async () => {
      try {
        const [atmRes, brRes, repRes, errRes] = await Promise.all([
          validationService.validateField('ATM_ID', formData.atm_id),
          validationService.validateField('BRANCH_CODE', formData.branch_code),
          validationService.validateField('REPORTER_ID', formData.reporter_id),
          validationService.validateField('ERROR_CODE', formData.error_code),
        ]);

        setValidations({
          ATM_ID: atmRes,
          BRANCH_CODE: brRes,
          REPORTER_ID: repRes,
          ERROR_CODE: errRes,
        });
      } catch (err) {
        console.error('Validation check error:', err);
      }
    };

    validateFields();
  }, [formData.atm_id, formData.branch_code, formData.reporter_id, formData.error_code]);

  // Live Category and Priority Preview
  useEffect(() => {
    const fetchPreview = async () => {
      if (!formData.error_code && !formData.error_description) return;
      try {
        const preview = await classificationService.preview(
          formData.error_code,
          formData.error_description,
          formData.urgency
        );
        setClassificationPreview(preview);
      } catch (err) {
        console.error('Classification preview error:', err);
      }
    };

    const timer = setTimeout(fetchPreview, 250);
    return () => clearTimeout(timer);
  }, [formData.error_code, formData.error_description, formData.urgency]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: (name === 'atm_id' || name === 'branch_code' || name === 'reporter_id' || name === 'error_code')
        ? value.toUpperCase()
        : value
    }));
  };

  const handleApplyPreset = (preset) => {
    setFormData(prev => ({
      ...prev,
      ...preset
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const response = await reportService.create(formData);
      setSubmitSuccess(response);
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to submit report. Please verify all fields.');
    } finally {
      setSubmitting(false);
    }
  };

  const openInspector = (fieldType) => {
    setInspectingField(fieldType);
    setDfaModalOpen(true);
  };

  const renderValidationIndicator = (fieldType) => {
    const val = validations[fieldType];
    if (!val) return null;

    return (
      <div className="mt-1 flex items-center justify-between text-[11px]">
        <div className="flex items-center gap-1.5 font-mono">
          {val.dfa_accepted ? (
            <span className="text-emerald-400 flex items-center gap-1 font-semibold">
              <Check className="w-3.5 h-3.5" /> DFA: Accepted ({val.final_state})
            </span>
          ) : (
            <span className="text-rose-400 flex items-center gap-1 font-semibold">
              <X className="w-3.5 h-3.5" /> DFA: Rejected ({val.error_reason || 'Invalid Format'})
            </span>
          )}
          <span className="text-slate-500">•</span>
          <span className={val.regex_matched ? 'text-emerald-400' : 'text-rose-400'}>
            Regex: {val.regex_matched ? 'Match' : 'Mismatch'}
          </span>
        </div>

        <button
          type="button"
          onClick={() => openInspector(fieldType)}
          className="text-cyan-400 hover:text-cyan-300 hover:underline flex items-center gap-1 font-semibold"
        >
          <Binary className="w-3 h-3" /> Trace DFA
        </button>
      </div>
    );
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-6xl mx-auto space-y-8">
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight flex items-center gap-2.5">
            <Building2 className="w-7 h-7 text-cyan-400" />
            <span>Submit ATM Fault Incident</span>
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Real-time DFA identifier validation, automated 5-category detection, and deterministic routing dispatch.
          </p>
        </div>

        <button
          onClick={() => openInspector('ATM_ID')}
          className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-700 hover:bg-slate-800 text-xs text-cyan-400 font-semibold transition-colors"
        >
          <Binary className="w-4 h-4" />
          <span>Open DFA State Machine Inspector</span>
        </button>
      </div>

      {/* Demo Preset Buttons Bar */}
      <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-2">
        <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
          <Zap className="w-3.5 h-3.5 text-amber-400" /> Quick Demonstration Test Presets
        </div>
        <div className="flex flex-wrap gap-2">
          {PRESET_CASES.map((preset, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => handleApplyPreset(preset)}
              className="px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-800 hover:border-cyan-500/50 hover:bg-slate-900 text-xs font-medium text-slate-300 transition-all hover:text-white"
            >
              {preset.name}
            </button>
          ))}
        </div>
      </div>

      {/* Main Form + Live Preview Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Form Column */}
        <div className="lg:col-span-8 p-6 sm:p-8 rounded-2xl bg-slate-900/90 border border-slate-800 backdrop-blur-md">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Section 1: Reporter Information */}
            <div>
              <h2 className="text-xs font-bold uppercase tracking-wider text-cyan-400 mb-3 flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-cyan-500/20 flex items-center justify-center text-[10px]">1</span>
                Reporter Credentials
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Reporter Full Name *
                  </label>
                  <input
                    type="text"
                    name="reporter_name"
                    value={formData.reporter_name}
                    onChange={handleChange}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-sm text-slate-100 focus:outline-none focus:border-cyan-500 font-medium"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Reporter ID (Format: REP-####) *
                  </label>
                  <input
                    type="text"
                    name="reporter_id"
                    value={formData.reporter_id}
                    onChange={handleChange}
                    placeholder="e.g. REP-1024"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-sm font-mono text-cyan-300 focus:outline-none focus:border-cyan-500 font-medium"
                    required
                  />
                  {renderValidationIndicator('REPORTER_ID')}
                </div>
              </div>
            </div>

            {/* Section 2: ATM Terminal & Location */}
            <div className="pt-4 border-t border-slate-800">
              <h2 className="text-xs font-bold uppercase tracking-wider text-cyan-400 mb-3 flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-cyan-500/20 flex items-center justify-center text-[10px]">2</span>
                Terminal & Regional Topology
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    ATM ID (Format: ATM-XXX-####) *
                  </label>
                  <input
                    type="text"
                    name="atm_id"
                    value={formData.atm_id}
                    onChange={handleChange}
                    placeholder="e.g. ATM-NYC-1042"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-sm font-mono text-cyan-300 focus:outline-none focus:border-cyan-500 font-medium"
                    required
                  />
                  {renderValidationIndicator('ATM_ID')}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Branch Code (Format: BR-XX###) *
                  </label>
                  <input
                    type="text"
                    name="branch_code"
                    value={formData.branch_code}
                    onChange={handleChange}
                    placeholder="e.g. BR-NY101"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-sm font-mono text-cyan-300 focus:outline-none focus:border-cyan-500 font-medium"
                    required
                  />
                  {renderValidationIndicator('BRANCH_CODE')}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Operating Zone *
                  </label>
                  <select
                    name="zone"
                    value={formData.zone}
                    onChange={handleChange}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-sm text-slate-100 focus:outline-none focus:border-cyan-500 font-medium"
                  >
                    <option value="North">North Zone</option>
                    <option value="South">South Zone</option>
                    <option value="East">East Zone</option>
                    <option value="West">West Zone</option>
                    <option value="Central">Central Zone</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Section 3: Fault Details & Urgency */}
            <div className="pt-4 border-t border-slate-800">
              <h2 className="text-xs font-bold uppercase tracking-wider text-cyan-400 mb-3 flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-cyan-500/20 flex items-center justify-center text-[10px]">3</span>
                Fault Diagnostics & Error Specifications
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Structured Error Code (ERR-[CATEGORY]-###) *
                  </label>
                  <input
                    type="text"
                    name="error_code"
                    value={formData.error_code}
                    onChange={handleChange}
                    placeholder="e.g. ERR-CASH-101"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-sm font-mono text-cyan-300 focus:outline-none focus:border-cyan-500 font-medium"
                    required
                  />
                  {renderValidationIndicator('ERROR_CODE')}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Urgency Rating *
                  </label>
                  <select
                    name="urgency"
                    value={formData.urgency}
                    onChange={handleChange}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-sm text-slate-100 focus:outline-none focus:border-cyan-500 font-medium"
                  >
                    <option value="Low">Low - Cosmetic or non-blocking</option>
                    <option value="Medium">Medium - Degraded functionality</option>
                    <option value="High">High - Out of service / physical jam</option>
                    <option value="Critical">Critical - Vault alarm / card swallowed / emergency</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Incident Description (Analyzed for Keyword Weights & Conflicts) *
                </label>
                <textarea
                  name="error_description"
                  rows={3}
                  value={formData.error_description}
                  onChange={handleChange}
                  placeholder="Detail the exact sequence of events, customer impact, or error messages displayed..."
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-sm text-slate-100 focus:outline-none focus:border-cyan-500 leading-relaxed font-sans"
                  required
                />
              </div>

              <div className="mt-3">
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Additional Operations Notes (Optional)
                </label>
                <input
                  type="text"
                  name="additional_details"
                  value={formData.additional_details}
                  onChange={handleChange}
                  placeholder="e.g. Branch guard notified, ATM camera operational..."
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-300 focus:outline-none focus:border-slate-600"
                />
              </div>
            </div>

            {/* Submission Button */}
            <div className="pt-4 border-t border-slate-800 flex items-center justify-between">
              <div className="text-[11px] text-slate-400">
                All structured identifiers strictly validated using formal DFA simulation.
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 disabled:opacity-50 text-slate-950 font-bold text-xs tracking-wider uppercase shadow-xl shadow-cyan-500/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
              >
                {submitting ? (
                  <div className="w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    <span>Process & Dispatch Ticket</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>

        {/* Live Automatic Detection & Intelligence Column */}
        <div className="lg:col-span-4 space-y-6">
          {/* Live Classification & Priority Card */}
          <div className="p-6 rounded-2xl bg-slate-900/90 border border-slate-800 backdrop-blur-md space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-cyan-400" />
                AI / Rule-Based Classification
              </h3>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-950 text-cyan-400 border border-cyan-800 font-mono">
                Live Preview
              </span>
            </div>

            {classificationPreview ? (
              <div className="space-y-4">
                {/* Detected Category */}
                <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                    Detected Category (1 of 5)
                  </div>
                  <div className="text-sm font-bold text-white flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-cyan-400" />
                    {classificationPreview.category}
                  </div>
                  <div className="text-[11px] text-cyan-400 mt-1">
                    Confidence: {(classificationPreview.confidence * 100).toFixed(0)}%
                  </div>
                </div>

                {/* Calculated Priority */}
                <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                    Calculated Incident Priority
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`px-2.5 py-0.5 rounded-md text-xs font-bold border ${
                      classificationPreview.priority === 'Critical' ? 'bg-red-500/20 text-red-400 border-red-500/30' :
                      classificationPreview.priority === 'High' ? 'bg-amber-500/20 text-amber-400 border-amber-500/30' :
                      classificationPreview.priority === 'Medium' ? 'bg-blue-500/20 text-blue-400 border-blue-500/30' :
                      'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                    }`}>
                      {classificationPreview.priority} Priority
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-400 mt-1">
                    {classificationPreview.priority_reason}
                  </div>
                </div>

                {/* Applied Rule & Precedence */}
                <div className="p-3 rounded-xl bg-slate-950/50 border border-slate-800/80 text-xs space-y-1">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Decision Logic
                  </div>
                  <div className="text-slate-300 font-medium">
                    {classificationPreview.applied_rule}
                  </div>
                  <p className="text-[11px] text-slate-400 leading-relaxed">
                    {classificationPreview.precedence_reason}
                  </p>
                </div>
              </div>
            ) : (
              <div className="text-xs text-slate-500 italic py-6 text-center">
                Enter error code or description to see live classification...
              </div>
            )}
          </div>

          {/* Structured DFA Format Guide */}
          <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-3 text-xs">
            <h4 className="font-bold text-slate-300 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
              <Info className="w-3.5 h-3.5 text-cyan-400" />
              Automata Validation Formats
            </h4>
            <div className="space-y-2 text-slate-400 text-[11px] font-mono">
              <div className="p-2 rounded-lg bg-slate-950 border border-slate-800/80">
                <span className="text-cyan-400">ATM ID:</span> ATM-[A-Z]{'{3}'}-\d{'{4}'}
                <div className="text-[10px] text-slate-400">e.g. ATM-NYC-1042</div>
              </div>
              <div className="p-2 rounded-lg bg-slate-950 border border-slate-800/80">
                <span className="text-cyan-400">Branch Code:</span> BR-[A-Z]{'{2}'}\d{'{3}'}
                <div className="text-[10px] text-slate-400">e.g. BR-NY101</div>
              </div>
              <div className="p-2 rounded-lg bg-slate-950 border border-slate-800/80">
                <span className="text-cyan-400">Reporter ID:</span> REP-\d{'{4}'}
                <div className="text-[10px] text-slate-400">e.g. REP-1024</div>
              </div>
              <div className="p-2 rounded-lg bg-slate-950 border border-slate-800/80">
                <span className="text-cyan-400">Error Code:</span> ERR-(CASH|CARD|NETW|HARD|TRAN)-\d{'{3}'}
                <div className="text-[10px] text-slate-400">e.g. ERR-CASH-101</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Success Modal */}
      {submitSuccess && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
          <div className="relative w-full max-w-lg bg-slate-900 border border-cyan-500/40 rounded-2xl shadow-2xl p-6 sm:p-8 space-y-5 text-center">
            <div className="w-16 h-16 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 mx-auto flex items-center justify-center">
              <CheckCircle2 className="w-9 h-9" />
            </div>

            <div>
              <h3 className="text-xl font-black text-white tracking-tight">
                Report Logged & Dispatched Successfully!
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                Persistent database record created in SQLite.
              </p>
            </div>

            {/* Generated Report ID Highlight */}
            <div className="p-4 rounded-xl bg-slate-950 border border-cyan-500/30 space-y-1">
              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Assigned Report ID
              </div>
              <div className="text-2xl font-black text-cyan-400 font-mono tracking-wider">
                {submitSuccess.report_id}
              </div>
              <div className="text-xs text-slate-300">
                Category: <strong>{submitSuccess.report?.category}</strong> ({submitSuccess.report?.priority} Priority)
              </div>
            </div>

            {/* Dispatch Outcome Summary */}
            <div className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800 text-left text-xs space-y-2">
              <div className="flex items-center justify-between text-slate-300">
                <span className="text-slate-400">Routing Status:</span>
                <span className="font-bold text-cyan-400">{submitSuccess.dispatch?.status}</span>
              </div>
              <div className="flex items-center justify-between text-slate-300">
                <span className="text-slate-400">Assigned Technician:</span>
                <span className="font-bold text-white">
                  {submitSuccess.report?.assigned_handler_name || 'None (Queued/Escalated)'}
                </span>
              </div>
              <p className="text-[11px] text-slate-400 pt-1 border-t border-slate-800">
                {submitSuccess.dispatch?.decision_reason}
              </p>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                onClick={() => setSubmitSuccess(null)}
                className="flex-1 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold uppercase tracking-wider transition-colors"
              >
                Submit Another
              </button>
              <button
                onClick={() => navigate(`/reports/${submitSuccess.report_id}`)}
                className="flex-1 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-xs font-bold uppercase tracking-wider transition-colors flex items-center justify-center gap-1.5 shadow-lg shadow-cyan-500/20"
              >
                <span>View Full Details</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DFA Inspector Modal */}
      <DfaVisualizationModal
        isOpen={dfaModalOpen}
        onClose={() => setDfaModalOpen(false)}
        initialFieldType={inspectingField}
        validationResult={validations[inspectingField]}
      />
    </div>
  );
};

export default ReportSubmissionPage;
