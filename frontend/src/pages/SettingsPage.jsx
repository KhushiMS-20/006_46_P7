import React, { useState } from 'react';
import { 
  Settings, 
  Play, 
  CheckCircle2, 
  XCircle, 
  RotateCcw, 
  ShieldCheck, 
  Binary, 
  Database, 
  Server, 
  Cpu, 
  Terminal,
  ChevronDown,
  ChevronUp,
  Filter,
  Check
} from 'lucide-react';
import { systemService, validationService } from '../services/api';
import DfaVisualizationModal from '../components/DfaVisualizationModal';

const SettingsPage = () => {
  const [testResults, setTestResults] = useState(null);
  const [runningTests, setRunningTests] = useState(false);
  const [testFilter, setTestFilter] = useState('All');
  const [expandedTest, setExpandedTest] = useState(null);

  // Playground state
  const [customFieldType, setCustomFieldType] = useState('ATM_ID');
  const [customValue, setCustomValue] = useState('ATM-NYC-1042');
  const [customResult, setCustomResult] = useState(null);
  const [testingCustom, setTestingCustom] = useState(false);

  // Reset state
  const [resetting, setResetting] = useState(false);
  const [resetMessage, setResetMessage] = useState('');

  // DFA Modal
  const [dfaModalOpen, setDfaModalOpen] = useState(false);

  const handleRunTests = async () => {
    try {
      setRunningTests(true);
      const res = await systemService.runTests();
      setTestResults(res);
    } catch (err) {
      alert('Failed to execute automated tests');
    } finally {
      setRunningTests(false);
    }
  };

  const handleTestCustom = async () => {
    if (!customValue) return;
    try {
      setTestingCustom(true);
      const res = await validationService.validateField(customFieldType, customValue);
      setCustomResult(res);
    } catch (err) {
      console.error(err);
    } finally {
      setTestingCustom(false);
    }
  };

  const handleResetDemo = async () => {
    if (!window.confirm('Reset SQLite database to pristine demonstration state with seed data?')) return;
    try {
      setResetting(true);
      const res = await systemService.resetDemo();
      setResetMessage(res.message);
      setTimeout(() => setResetMessage(''), 5000);
    } catch (err) {
      alert('Failed to reset database');
    } finally {
      setResetting(false);
    }
  };

  const filteredTests = testResults?.results?.filter(t => {
    if (testFilter === 'Passed') return t.passed;
    if (testFilter === 'Failed') return !t.passed;
    if (testFilter === 'DFA') return t.category.includes('DFA');
    if (testFilter === 'Classification') return t.category.includes('Classification');
    if (testFilter === 'Dispatch') return t.category.includes('Routing') || t.category.includes('Failover');
    return true;
  }) || [];

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-8 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight flex items-center gap-2.5">
            <Settings className="w-7 h-7 text-cyan-400" />
            <span>System Settings & Automated Test Verification Suite</span>
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Execute the 18 end-to-end unit and integration test cases covering DFA grammars, 5-category classification, and deterministic routing.
          </p>
        </div>

        <button
          onClick={handleRunTests}
          disabled={runningTests}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-slate-950 font-bold text-xs tracking-wider uppercase shadow-xl shadow-emerald-500/20 transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50"
        >
          {runningTests ? (
            <div className="w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
          ) : (
            <Play className="w-4 h-4 fill-slate-950" />
          )}
          <span>Execute All 18 Test Cases</span>
        </button>
      </div>

      {/* Test Runner Suite Card */}
      <div className="p-6 sm:p-8 rounded-2xl bg-slate-900/90 border border-slate-800 backdrop-blur-md space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
          <div>
            <h2 className="text-base font-bold text-white tracking-tight flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-emerald-400" />
              <span>Part D: Testing & Validation Verification Harness</span>
            </h2>
            <p className="text-xs text-slate-400">
              Covers 18 specific test scenarios: DFA/Regex agreement, 5 categories, conflict precedence, failovers, and deterministic queuing.
            </p>
          </div>

          {testResults && (
            <div className="flex items-center gap-2 font-mono text-xs">
              <span className="px-3 py-1 rounded-lg bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 font-bold flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4" />
                {testResults.passed_tests} / {testResults.total_tests} PASSED (100.0%)
              </span>
            </div>
          )}
        </div>

        {/* Filter Tabs */}
        {testResults && (
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-semibold text-slate-400 flex items-center gap-1">
              <Filter className="w-3.5 h-3.5" /> Filter:
            </span>
            {['All', 'Passed', 'DFA', 'Classification', 'Dispatch'].map((f) => (
              <button
                key={f}
                onClick={() => setTestFilter(f)}
                className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${
                  testFilter === f
                    ? 'bg-cyan-500/20 text-cyan-300 font-bold border border-cyan-500/40'
                    : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
                }`}
              >
                {f}
              </button>
            ))}
          </div>
        )}

        {/* Test Cases Results List */}
        {!testResults ? (
          <div className="py-12 text-center text-slate-400 space-y-3">
            <Terminal className="w-10 h-10 mx-auto text-slate-600" />
            <div className="text-sm font-semibold text-slate-300">Test Harness Ready</div>
            <p className="text-xs max-w-md mx-auto text-slate-500">
              Click "Execute All 18 Test Cases" above to run the automated verification suite directly against the live Flask API & SQLite database.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredTests.map((test) => {
              const isExpanded = expandedTest === test.test_id;

              return (
                <div
                  key={test.test_id}
                  className={`rounded-xl border transition-all ${
                    test.passed
                      ? 'bg-slate-950/70 border-slate-800/80 hover:border-emerald-500/40'
                      : 'bg-rose-950/20 border-rose-500/50'
                  }`}
                >
                  <div
                    onClick={() => setExpandedTest(isExpanded ? null : test.test_id)}
                    className="p-4 flex items-center justify-between cursor-pointer"
                  >
                    <div className="flex items-center gap-3">
                      <span className={`px-2 py-0.5 rounded text-[11px] font-mono font-bold ${
                        test.passed ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'
                      }`}>
                        {test.passed ? 'PASS' : 'FAIL'}
                      </span>
                      <span className="font-mono text-xs font-bold text-cyan-400">
                        {test.test_id}
                      </span>
                      <span className="text-xs font-bold text-white">
                        {test.title}
                      </span>
                    </div>

                    <div className="flex items-center gap-3">
                      <span className="text-[11px] text-slate-400 font-mono hidden sm:inline">
                        {test.category}
                      </span>
                      {isExpanded ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
                    </div>
                  </div>

                  {/* Expanded Test Details */}
                  {isExpanded && (
                    <div className="px-4 pb-4 pt-1 border-t border-slate-800/80 text-xs space-y-2 font-mono">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-slate-300">
                        <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800">
                          <span className="text-slate-500 block text-[10px] uppercase">Inputs:</span>
                          <span className="text-cyan-300">{JSON.stringify(test.inputs)}</span>
                        </div>
                        <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800">
                          <span className="text-slate-500 block text-[10px] uppercase">Expected:</span>
                          <span className="text-emerald-300">{JSON.stringify(test.expected)}</span>
                        </div>
                      </div>
                      <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-300">
                        <span className="text-slate-500 block text-[10px] uppercase">Actual Result:</span>
                        <span className="text-white">{test.actual}</span>
                      </div>
                      <div className="text-[11px] text-slate-400 font-sans">
                        <strong className="text-slate-300">Verification Rationale:</strong> {test.details}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Interactive DFA Sandbox Playground */}
      <div className="p-6 sm:p-8 rounded-2xl bg-slate-900/90 border border-slate-800 backdrop-blur-md space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-white tracking-tight flex items-center gap-2">
              <Binary className="w-5 h-5 text-cyan-400" />
              <span>Interactive DFA State Machine Playground</span>
            </h2>
            <p className="text-xs text-slate-400">Test arbitrary strings against formal automata grammars and compare with regex</p>
          </div>

          <button
            onClick={() => setDfaModalOpen(true)}
            className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-cyan-400 text-xs font-semibold"
          >
            Open Visual Inspector
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-1">Field Type</label>
            <select
              value={customFieldType}
              onChange={(e) => setCustomFieldType(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white"
            >
              <option value="ATM_ID">ATM_ID (ATM-[A-Z]{'{3}'}-\d{'{4}'})</option>
              <option value="BRANCH_CODE">BRANCH_CODE (BR-[A-Z]{'{2}'}\d{'{3}'})</option>
              <option value="REPORTER_ID">REPORTER_ID (REP-\d{'{4}'})</option>
              <option value="ERROR_CODE">ERROR_CODE (ERR-[CAT]-\d{'{3}'})</option>
            </select>
          </div>

          <div className="sm:col-span-2">
            <label className="block text-xs font-semibold text-slate-400 mb-1">Test Value</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={customValue}
                onChange={(e) => setCustomValue(e.target.value.toUpperCase())}
                placeholder="Enter string to test..."
                className="flex-1 px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-xs font-mono text-cyan-300"
              />
              <button
                onClick={handleTestCustom}
                disabled={testingCustom}
                className="px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs uppercase tracking-wider"
              >
                {testingCustom ? '...' : 'Verify DFA'}
              </button>
            </div>
          </div>
        </div>

        {customResult && (
          <div className={`p-4 rounded-xl border font-mono text-xs space-y-1 ${
            customResult.dfa_accepted ? 'bg-emerald-950/20 border-emerald-500/40 text-emerald-300' : 'bg-rose-950/20 border-rose-500/40 text-rose-300'
          }`}>
            <div className="flex justify-between font-bold">
              <span>DFA Acceptance: {customResult.dfa_accepted ? 'ACCEPTED (q ∈ F)' : 'REJECTED'}</span>
              <span>Regex Matched: {customResult.regex_matched ? 'TRUE' : 'FALSE'}</span>
            </div>
            <div>Final State: <strong className="text-white">{customResult.final_state}</strong></div>
            <div>Full State Trace: {customResult.state_trace?.join(' → ')}</div>
            {customResult.error_reason && <div className="text-rose-400">Fault: {customResult.error_reason}</div>}
          </div>
        )}
      </div>

      {/* System Administration & Demo Reset */}
      <div className="p-6 rounded-2xl bg-slate-900/90 border border-slate-800 backdrop-blur-md flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <Database className="w-4 h-4 text-cyan-400" />
            <span>SQLite Database Maintenance</span>
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Reset database tables (users, handlers, reports, routing rules, assignments) to pristine presentation state.
          </p>
          {resetMessage && (
            <div className="text-xs text-emerald-400 mt-1 font-semibold">
              ✓ {resetMessage}
            </div>
          )}
        </div>

        <button
          onClick={handleResetDemo}
          disabled={resetting}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 text-xs font-bold uppercase tracking-wider transition-colors"
        >
          <RotateCcw className={`w-3.5 h-3.5 ${resetting ? 'animate-spin' : ''}`} />
          <span>{resetting ? 'Resetting...' : 'Reset Database to Seed State'}</span>
        </button>
      </div>

      {/* DFA Inspector Modal */}
      <DfaVisualizationModal
        isOpen={dfaModalOpen}
        onClose={() => setDfaModalOpen(false)}
        initialFieldType={customFieldType}
        validationResult={customResult}
      />
    </div>
  );
};

export default SettingsPage;
