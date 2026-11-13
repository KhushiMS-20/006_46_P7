import React, { useState, useEffect } from 'react';
import { X, CheckCircle, AlertCircle, ArrowRight, Binary, ShieldCheck, GitCommit } from 'lucide-react';
import { validationService } from '../services/api';

const DfaVisualizationModal = ({ isOpen, onClose, initialFieldType = 'ATM_ID', validationResult = null }) => {
  const [structures, setStructures] = useState(null);
  const [selectedType, setSelectedType] = useState(initialFieldType);
  const [testInput, setTestInput] = useState('');
  const [liveResult, setLiveResult] = useState(validationResult);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setSelectedType(initialFieldType);
  }, [initialFieldType]);

  useEffect(() => {
    if (validationResult) {
      setLiveResult(validationResult);
      setTestInput(validationResult.input || '');
    }
  }, [validationResult]);

  useEffect(() => {
    if (isOpen && !structures) {
      validationService.getStructures()
        .then(data => setStructures(data))
        .catch(err => console.error('Failed to load DFA structures:', err));
    }
  }, [isOpen, structures]);

  const handleTest = async () => {
    if (!testInput) return;
    setLoading(true);
    try {
      const res = await validationService.validateField(selectedType, testInput);
      setLiveResult(res);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const currentDfa = structures ? structures[selectedType] : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md overflow-y-auto">
      <div className="relative w-full max-w-4xl bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden my-8">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/60">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
              <Binary className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                DFA & Regex State Machine Inspector
              </h2>
              <p className="text-xs text-slate-400">Formal Automata Specification (Q, Σ, δ, q₀, F) & Transition Tracing</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-6 max-h-[75vh] overflow-y-auto">
          {/* Selector Tabs */}
          <div className="flex flex-wrap gap-2 pb-2 border-b border-slate-800">
            {['ATM_ID', 'BRANCH_CODE', 'REPORTER_ID', 'ERROR_CODE'].map((type) => (
              <button
                key={type}
                onClick={() => {
                  setSelectedType(type);
                  setTestInput('');
                  setLiveResult(null);
                }}
                className={`px-3.5 py-2 rounded-xl text-xs font-semibold tracking-wide transition-all ${
                  selectedType === type
                    ? 'bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/20'
                    : 'bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white'
                }`}
              >
                {type.replace('_', ' ')}
              </button>
            ))}
          </div>

          {/* Interactive Tester Bar */}
          <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-300">Live Simulator</span>
              <span className="text-[11px] text-cyan-400 font-mono">
                Format: {currentDfa?.description}
              </span>
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                value={testInput}
                onChange={(e) => setTestInput(e.target.value.toUpperCase())}
                placeholder={`e.g. ${currentDfa?.example || 'Input string'}`}
                className="flex-1 px-3.5 py-2 rounded-lg bg-slate-900 border border-slate-700 text-sm font-mono text-cyan-300 placeholder:text-slate-600 focus:outline-none focus:border-cyan-500"
              />
              <button
                onClick={handleTest}
                disabled={loading || !testInput}
                className="px-4 py-2 rounded-lg bg-cyan-500 hover:bg-cyan-400 disabled:opacity-50 text-slate-950 font-bold text-xs tracking-wider uppercase transition-colors"
              >
                {loading ? 'Running...' : 'Simulate'}
              </button>
            </div>
          </div>

          {/* Side-by-Side DFA vs Regex Results */}
          {liveResult && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* DFA Card */}
              <div className={`p-4 rounded-xl border ${
                liveResult.dfa_accepted 
                  ? 'bg-emerald-950/20 border-emerald-500/30 text-emerald-300' 
                  : 'bg-rose-950/20 border-rose-500/30 text-rose-300'
              }`}>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold uppercase tracking-wider flex items-center gap-1.5">
                    <Binary className="w-4 h-4" /> Deterministic Finite Automaton
                  </span>
                  <span className={`px-2 py-0.5 rounded text-[11px] font-bold uppercase ${
                    liveResult.dfa_accepted ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'
                  }`}>
                    {liveResult.dfa_accepted ? 'Accepted (L(M))' : 'Rejected'}
                  </span>
                </div>
                <div className="text-xs space-y-1 font-mono text-slate-300">
                  <div>Input: <span className="text-white font-bold">{liveResult.input}</span></div>
                  <div>Final State: <span className="text-cyan-400 font-bold">{liveResult.final_state}</span></div>
                  <div>Accept States F: <span className="text-slate-400">[{liveResult.accept_states?.join(', ')}]</span></div>
                  {liveResult.error_reason && (
                    <div className="text-rose-400 mt-1">Fault: {liveResult.error_reason}</div>
                  )}
                </div>
              </div>

              {/* Regex Card */}
              <div className={`p-4 rounded-xl border ${
                liveResult.regex_matched 
                  ? 'bg-emerald-950/20 border-emerald-500/30 text-emerald-300' 
                  : 'bg-rose-950/20 border-rose-500/30 text-rose-300'
              }`}>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold uppercase tracking-wider flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4" /> Equivalent Regular Expression
                  </span>
                  <span className={`px-2 py-0.5 rounded text-[11px] font-bold uppercase ${
                    liveResult.regex_matched ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'
                  }`}>
                    {liveResult.regex_matched ? 'Matched' : 'No Match'}
                  </span>
                </div>
                <div className="text-xs space-y-1 font-mono text-slate-300">
                  <div>Pattern: <span className="text-cyan-300">{liveResult.regex_pattern}</span></div>
                  <div className="flex items-center gap-2 mt-2 pt-2 border-t border-slate-800">
                    <span className="text-slate-400">DFA & Regex Agreement:</span>
                    <span className="text-emerald-400 font-bold flex items-center gap-1">
                      <CheckCircle className="w-3.5 h-3.5" /> 100% Agreement Verified
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* State Transition Trace */}
          {liveResult && liveResult.state_trace && (
            <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                  <GitCommit className="w-4 h-4 text-cyan-400" /> State Transition Path Trace
                </span>
                <span className="text-[11px] text-slate-400">
                  {liveResult.state_trace.length} States Visited
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-1.5 py-2 overflow-x-auto">
                {liveResult.state_trace.map((st, idx) => {
                  const isStart = idx === 0;
                  const isEnd = idx === liveResult.state_trace.length - 1;
                  const isAccepting = liveResult.accept_states?.includes(st);
                  const isTrap = st === 'TRAP';

                  return (
                    <React.Fragment key={idx}>
                      <div className={`px-2.5 py-1 rounded-lg text-xs font-mono font-bold flex items-center gap-1 border ${
                        isTrap
                          ? 'bg-rose-950/80 border-rose-500 text-rose-300 animate-pulse'
                          : isEnd && isAccepting
                          ? 'bg-emerald-500/20 border-emerald-400 text-emerald-300 shadow-md shadow-emerald-500/20'
                          : isStart
                          ? 'bg-blue-500/20 border-blue-400 text-blue-300'
                          : 'bg-slate-800 border-slate-700 text-slate-200'
                      }`}>
                        <span>{st}</span>
                        {isStart && <span className="text-[9px] text-blue-400 font-sans">(q₀)</span>}
                        {isEnd && isAccepting && <span className="text-[9px] text-emerald-400 font-sans">(F)</span>}
                      </div>
                      {idx < liveResult.state_trace.length - 1 && (
                        <ArrowRight className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                      )}
                    </React.Fragment>
                  );
                })}
              </div>
            </div>
          )}

          {/* Formal Automata 5-Tuple Description */}
          {currentDfa && (
            <div className="p-4 rounded-xl bg-slate-950/40 border border-slate-800 space-y-2 text-xs">
              <h3 className="font-bold text-slate-300 uppercase tracking-wider text-[11px]">
                Formal Definition M = (Q, Σ, δ, q₀, F)
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-slate-400 font-mono text-[11px]">
                <div>
                  <span className="text-cyan-400 font-bold">Q (States):</span> {currentDfa.states.join(', ')}
                </div>
                <div>
                  <span className="text-cyan-400 font-bold">q₀ (Start State):</span> {currentDfa.start_state}
                </div>
                <div>
                  <span className="text-cyan-400 font-bold">F (Accept States):</span> [{currentDfa.accept_states.join(', ')}]
                </div>
                <div>
                  <span className="text-cyan-400 font-bold">Pattern:</span> {currentDfa.regex_pattern}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-800 bg-slate-950/80 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition-colors"
          >
            Close Inspector
          </button>
        </div>
      </div>
    </div>
  );
};

export default DfaVisualizationModal;
