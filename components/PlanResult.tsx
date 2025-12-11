import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Download, RefreshCw, CheckCircle, Send, MessageSquarePlus } from 'lucide-react';

interface PlanResultProps {
  result: string;
  onReset: () => void;
  onRefine: (message: string) => void;
  isRefining: boolean;
}

const PlanResult: React.FC<PlanResultProps> = ({ result, onReset, onRefine, isRefining }) => {
  const [refineInput, setRefineInput] = useState('');

  const handleDownload = () => {
    const blob = new Blob([result], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'metacognitive_study_plan.md';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleRefineSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (refineInput.trim() && !isRefining) {
      onRefine(refineInput);
      setRefineInput('');
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto bg-slate-900/95 backdrop-blur-sm rounded-2xl shadow-2xl overflow-hidden flex flex-col h-[85vh] border border-white/10 relative">
      {/* Header */}
      <div className="bg-gradient-to-r from-indigo-600 to-purple-600 p-6 text-white shrink-0">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <CheckCircle className="w-6 h-6" />
            Your Optimized Plan
          </h2>
          <div className="flex gap-3">
             <button
              onClick={onReset}
              className="flex items-center gap-2 px-4 py-2 bg-white/20 hover:bg-white/30 rounded-lg text-sm font-medium transition-colors border border-white/10"
            >
              <RefreshCw className="w-4 h-4" />
              New Plan
            </button>
            <button
              onClick={handleDownload}
              className="flex items-center gap-2 px-4 py-2 bg-white text-indigo-700 hover:bg-indigo-50 rounded-lg text-sm font-bold shadow-sm transition-colors"
            >
              <Download className="w-4 h-4" />
              Download
            </button>
          </div>
        </div>
      </div>

      {/* Content Scroll Area */}
      <div className="flex-1 overflow-y-auto p-8 bg-slate-900 scrollbar-thin scrollbar-thumb-indigo-600 scrollbar-track-slate-800 pb-24">
        <div className="prose prose-invert prose-indigo max-w-none 
          prose-headings:font-bold prose-h1:text-indigo-300 prose-h2:text-indigo-200 
          prose-p:text-slate-300 prose-li:text-slate-300
          prose-strong:text-white
          prose-table:shadow-lg prose-table:rounded-lg prose-table:overflow-hidden
          prose-th:bg-slate-800 prose-th:text-indigo-200 prose-th:p-4
          prose-td:p-4 prose-td:bg-slate-800/50 prose-td:text-slate-200
          prose-tr:border-b prose-tr:border-slate-700">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>
            {result}
          </ReactMarkdown>
        </div>
      </div>
      
      {/* Footer Reply Area */}
      <div className="absolute bottom-0 left-0 right-0 bg-slate-950 border-t border-white/10 p-4">
        <form onSubmit={handleRefineSubmit} className="max-w-4xl mx-auto flex gap-3">
            <div className="relative flex-1">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <MessageSquarePlus className="h-5 w-5 text-indigo-400" />
                </div>
                <input
                    type="text"
                    value={refineInput}
                    onChange={(e) => setRefineInput(e.target.value)}
                    placeholder={isRefining ? "Optimizing..." : "Reply to the planner or refine your plan (e.g., 'Make it a weekly plan', 'Add more breaks')..."}
                    disabled={isRefining}
                    className="block w-full pl-10 pr-3 py-3 bg-slate-900 border border-slate-700 rounded-xl text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                />
            </div>
            <button
                type="submit"
                disabled={!refineInput.trim() || isRefining}
                className="bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-800 disabled:text-slate-500 text-white px-6 py-2 rounded-xl font-semibold flex items-center gap-2 transition-all shadow-lg"
            >
                {isRefining ? (
                    <span className="animate-pulse">Thinking...</span>
                ) : (
                    <>
                        Send <Send className="w-4 h-4" />
                    </>
                )}
            </button>
        </form>
      </div>
    </div>
  );
};

export default PlanResult;
