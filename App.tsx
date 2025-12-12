import React, { useState, useRef, useEffect } from 'react';
import { Sparkles, Upload, FileText, ArrowRight, BrainCircuit, Loader2 } from 'lucide-react';
import { startPlanningSession, continuePlanningSession } from './services/geminiService';
import PlanResult from './components/PlanResult';
import { AppState, PlanMode } from './types';
import { LOADING_MESSAGES } from './constants';
import { Chat } from '@google/genai';

const App: React.FC = () => {
  const [state, setState] = useState<AppState>({
    step: 'welcome',
    mode: null,
    userInput: '',
    planResult: '',
    error: null,
  });

  const [loadingMsgIndex, setLoadingMsgIndex] = useState(0);
  const [isRefining, setIsRefining] = useState(false);
  const [isParsingFile, setIsParsingFile] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Store the active chat session to maintain conversation context
  const chatSessionRef = useRef<Chat | null>(null);

  // Cycle loading messages
  useEffect(() => {
    let interval: any;
    if (state.step === 'processing' || isRefining) {
      interval = setInterval(() => {
        setLoadingMsgIndex((prev) => (prev + 1) % LOADING_MESSAGES.length);
      }, 3000);
    }
    return () => clearInterval(interval);
  }, [state.step, isRefining]);

  const handleModeSelect = (mode: PlanMode) => {
    setState((prev) => ({ ...prev, mode, step: 'input', error: null, userInput: '' }));
    chatSessionRef.current = null; // Reset chat session on new mode
  };

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setState((prev) => ({ ...prev, userInput: e.target.value }));
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setState((prev) => ({ ...prev, error: null }));
    setIsParsingFile(true);

    try {
      let extractedText = '';

      if (file.type === 'application/pdf' || file.name.endsWith('.pdf')) {
        // Dynamic import for PDF handling
        const pdfjsLib = await import('pdfjs-dist');
        // Set worker source to the same version from esm.sh
        pdfjsLib.GlobalWorkerOptions.workerSrc = `https://esm.sh/pdfjs-dist@3.11.174/build/pdf.worker.min.js`;

        const arrayBuffer = await file.arrayBuffer();
        const loadingTask = pdfjsLib.getDocument(arrayBuffer);
        const pdf = await loadingTask.promise;
        
        const pageTextPromises = [];
        for (let i = 1; i <= pdf.numPages; i++) {
          pageTextPromises.push(
            pdf.getPage(i).then(async (page: any) => {
              const textContent = await page.getTextContent();
              return textContent.items.map((item: any) => item.str).join(' ');
            })
          );
        }
        const pageTexts = await Promise.all(pageTextPromises);
        extractedText = pageTexts.join('\n\n');

      } else if (
        file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' || 
        file.name.endsWith('.docx')
      ) {
        // Dynamic import for DOCX handling
        const mammoth = await import('mammoth');
        const arrayBuffer = await file.arrayBuffer();
        const result = await mammoth.extractRawText({ arrayBuffer });
        extractedText = result.value;
        if (result.messages.length > 0) {
           console.warn("Mammoth messages:", result.messages);
        }

      } else {
        // Fallback for text-based files
        extractedText = await new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = (event) => resolve(event.target?.result as string);
          reader.onerror = (err) => reject(err);
          reader.readAsText(file);
        });
      }

      setState((prev) => ({ ...prev, userInput: extractedText }));
    } catch (err: any) {
      console.error("File parsing error:", err);
      setState((prev) => ({ 
        ...prev, 
        error: "Failed to read file. Please ensure it is a valid text, PDF, or DOCX file." 
      }));
    } finally {
      setIsParsingFile(false);
      // Reset file input value so the same file can be selected again if needed
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleSubmit = async () => {
    if (!state.userInput.trim()) {
      setState((prev) => ({ ...prev, error: "Please provide some input details first!" }));
      return;
    }

    setState((prev) => ({ ...prev, step: 'processing', error: null }));

    try {
      const { chat, text } = await startPlanningSession({
        mode: state.mode,
        inputData: state.userInput,
      });
      chatSessionRef.current = chat;
      setState((prev) => ({ ...prev, step: 'result', planResult: text }));
    } catch (err: any) {
      setState((prev) => ({ 
        ...prev, 
        step: 'input', 
        error: err.message || "An unexpected error occurred. Please try again." 
      }));
    }
  };

  const handleRefine = async (message: string) => {
    if (!chatSessionRef.current) return;
    
    setIsRefining(true);
    
    try {
      const newResult = await continuePlanningSession(chatSessionRef.current, message);
      setState((prev) => ({ ...prev, planResult: newResult }));
    } catch (err: any) {
       console.error("Refinement error", err);
       setState((prev) => ({ ...prev, error: "Failed to update plan. Please try again." }));
    } finally {
      setIsRefining(false);
    }
  };

  const handleReset = () => {
    setState({
      step: 'welcome',
      mode: null,
      userInput: '',
      planResult: '',
      error: null,
    });
    chatSessionRef.current = null;
    setIsRefining(false);
  };

  // --- RENDERERS ---

  const renderWelcome = () => (
    <div className="max-w-4xl mx-auto text-center space-y-12 animate-fade-in-up">
      <div className="space-y-4">
        <div className="inline-flex items-center justify-center p-3 bg-white/30 backdrop-blur-md rounded-full mb-4 shadow-lg ring-1 ring-white/50">
          <BrainCircuit className="w-8 h-8 text-white" />
        </div>
        <h1 className="text-5xl md:text-6xl font-extrabold text-white tracking-tight drop-shadow-sm">
          Metacognitive <br/>
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-yellow-200 to-pink-200">
            Study Planner
          </span>
        </h1>
        <p className="text-xl text-indigo-100 max-w-2xl mx-auto font-light">
          Unlock your brain's full potential. We use science-backed techniques like Spaced Repetition and Active Recall to build your perfect schedule.
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-8 px-4">
        {/* Option 1: Enhance */}
        <button
          onClick={() => handleModeSelect('enhance')}
          className="group relative bg-white/95 backdrop-blur-xl p-8 rounded-3xl shadow-xl hover:shadow-2xl hover:scale-[1.02] transition-all duration-300 text-left border-2 border-transparent hover:border-indigo-400"
        >
          <div className="bg-indigo-100 w-14 h-14 rounded-2xl flex items-center justify-center mb-6 group-hover:bg-indigo-600 transition-colors duration-300">
            <Upload className="w-7 h-7 text-indigo-600 group-hover:text-white transition-colors" />
          </div>
          <h3 className="text-2xl font-bold text-gray-800 mb-2">Enhance Existing Plan</h3>
          <p className="text-gray-500 mb-6">
            Upload or paste your current schedule. We'll analyze gaps and infuse it with metacognitive power.
          </p>
          <div className="flex items-center text-indigo-600 font-semibold group-hover:gap-2 transition-all">
            Upload & Optimize <ArrowRight className="w-4 h-4 ml-2" />
          </div>
        </button>

        {/* Option 2: Create */}
        <button
          onClick={() => handleModeSelect('create')}
          className="group relative bg-white/95 backdrop-blur-xl p-8 rounded-3xl shadow-xl hover:shadow-2xl hover:scale-[1.02] transition-all duration-300 text-left border-2 border-transparent hover:border-pink-400"
        >
          <div className="bg-pink-100 w-14 h-14 rounded-2xl flex items-center justify-center mb-6 group-hover:bg-pink-600 transition-colors duration-300">
            <Sparkles className="w-7 h-7 text-pink-600 group-hover:text-white transition-colors" />
          </div>
          <h3 className="text-2xl font-bold text-gray-800 mb-2">Create New Plan</h3>
          <p className="text-gray-500 mb-6">
            Starting from scratch? Tell us your goals and subjects. We'll build a scientifically optimized roadmap.
          </p>
          <div className="flex items-center text-pink-600 font-semibold group-hover:gap-2 transition-all">
            Design from Scratch <ArrowRight className="w-4 h-4 ml-2" />
          </div>
        </button>
      </div>
    </div>
  );

  const renderInput = () => (
    <div className="max-w-2xl mx-auto w-full bg-white/95 backdrop-blur-xl rounded-3xl shadow-2xl p-8 animate-fade-in-up">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-800">
          {state.mode === 'enhance' ? "Upload Your Schedule" : "Define Your Goals"}
        </h2>
        <button onClick={handleReset} className="text-sm text-gray-500 hover:text-indigo-600 underline">
          Back
        </button>
      </div>

      <div className="space-y-6">
        {state.mode === 'enhance' && (
          <div 
            className={`border-2 border-dashed rounded-xl p-6 text-center transition-colors cursor-pointer ${
              isParsingFile 
              ? 'border-indigo-300 bg-indigo-50 cursor-wait' 
              : 'border-indigo-200 hover:bg-indigo-50'
            }`}
            onClick={() => !isParsingFile && fileInputRef.current?.click()}
          >
            <input 
              type="file" 
              ref={fileInputRef} 
              className="hidden" 
              accept=".csv,.txt,.md,.json,.pdf,.docx" 
              onChange={handleFileUpload}
            />
            {isParsingFile ? (
              <div className="flex flex-col items-center">
                <Loader2 className="w-10 h-10 text-indigo-400 animate-spin mb-2" />
                <p className="text-sm font-medium text-indigo-700">Reading file...</p>
              </div>
            ) : (
              <>
                <FileText className="w-10 h-10 text-indigo-400 mx-auto mb-2" />
                <p className="text-sm font-medium text-gray-600">Click to upload .pdf, .docx, or text file</p>
                <p className="text-xs text-gray-400 mt-1">or paste the content below</p>
              </>
            )}
          </div>
        )}

        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            {state.mode === 'enhance' 
              ? "Or paste your schedule content here:" 
              : "What do you want to learn? (Be specific about subjects, timeline, and goals)"}
          </label>
          <textarea
            value={state.userInput}
            onChange={handleTextChange}
            className="w-full h-48 p-4 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none text-gray-700 placeholder-gray-400 transition-all"
            placeholder={state.mode === 'enhance' 
              ? "e.g., Monday: Math 9-10am, English 10-11am..." 
              : "e.g., I need to learn Quantum Physics basics in 4 weeks. I can study 2 hours a day. I'm a complete beginner."}
          />
        </div>

        {state.error && (
          <div className="p-4 bg-red-50 text-red-600 rounded-xl text-sm font-medium flex items-center">
             ⚠️ {state.error}
          </div>
        )}

        <button
          onClick={handleSubmit}
          disabled={!state.userInput.trim() || isParsingFile}
          className="w-full py-4 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl font-bold text-lg shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed transition-all transform active:scale-[0.98]"
        >
          {state.mode === 'enhance' ? "Optimize My Plan" : "Generate Plan"}
        </button>
      </div>
    </div>
  );

  const renderProcessing = () => (
    <div className="max-w-xl mx-auto text-center space-y-8 animate-fade-in-up pt-12">
      <div className="relative inline-block">
        <div className="absolute inset-0 bg-indigo-500 blur-2xl opacity-20 rounded-full animate-pulse"></div>
        <Loader2 className="w-20 h-20 text-white animate-spin relative z-10" />
      </div>
      <div className="space-y-2">
        <h2 className="text-3xl font-bold text-white">Designing Your Strategy</h2>
        <p className="text-xl text-indigo-200 min-h-[3rem] transition-all duration-500">
          {LOADING_MESSAGES[loadingMsgIndex]}
        </p>
      </div>
      <div className="w-64 h-2 bg-white/20 rounded-full mx-auto overflow-hidden">
        <div className="h-full bg-white/80 rounded-full animate-progress-indeterminate"></div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-purple-900 to-slate-900 flex flex-col items-center justify-center p-6 md:p-12 font-sans selection:bg-pink-500 selection:text-white">
      {state.step === 'welcome' && renderWelcome()}
      {state.step === 'input' && renderInput()}
      {state.step === 'processing' && renderProcessing()}
      {state.step === 'result' && (
        <PlanResult 
          result={state.planResult} 
          onReset={handleReset} 
          onRefine={handleRefine}
          isRefining={isRefining}
        />
      )}
    </div>
  );
};

export default App;