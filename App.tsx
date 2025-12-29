import React, { useState, useRef, useEffect } from 'react';
import Board from './components/Board';
import Toolbar from './components/Toolbar';
import { ToolType, DrawingSettings } from './types';
import { X, Dices, Loader2, List, Hash, Trophy, Save, Keyboard, Command, Feather, Box, MonitorUp } from 'lucide-react';
// @ts-ignore
import confetti from 'canvas-confetti';

interface SavedClass {
  name: string;
  students: string[];
}

function App() {
  const [currentTool, setCurrentTool] = useState<ToolType>('pen');
  const [settings, setSettings] = useState<DrawingSettings>({
    color: '#FFFFFF',
    width: 4,
    opacity: 1,
    fontSize: 32 // Default 1x size
  });
  const [clearTrigger, setClearTrigger] = useState(0);
  const [undoTrigger, setUndoTrigger] = useState(0);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [backgroundImage, setBackgroundImage] = useState<string | null>(null);
  const [boardColor, setBoardColor] = useState('#0f172a'); // Default Slate-900
  const [showGrid, setShowGrid] = useState(false); // Grid State
  
  // Loading Intro State
  const [isLoading, setIsLoading] = useState(true);
  
  // --- RANDOM PICKER STATE ---
  const [showRandomPicker, setShowRandomPicker] = useState(false);
  const [pickerMode, setPickerMode] = useState<'number' | 'list'>('list'); // 'number' or 'list'
  
  // --- HELP MODAL STATE ---
  const [showHelp, setShowHelp] = useState(false);

  // Number Mode
  const [classSize, setClassSize] = useState(40);
  
  // List Mode & Saved Classes
  const [rawListInput, setRawListInput] = useState('');
  const [studentList, setStudentList] = useState<string[]>([]);
  const [savedClasses, setSavedClasses] = useState<SavedClass[]>([]);
  const [isSavingClass, setIsSavingClass] = useState(false);
  const [newClassName, setNewClassName] = useState('');
  
  // Animation State
  const [pickedResult, setPickedResult] = useState<string | number | null>(null);
  const [displayResult, setDisplayResult] = useState<string | number>('?');
  const [isSpinning, setIsSpinning] = useState(false);

  // Refs needed for capturing the composed image
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null); // Moved ref here for shortcut access

  // Intro Effect
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 2000); // 2 seconds
    return () => clearTimeout(timer);
  }, []);

  // Load Saved Classes from LocalStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem('GB_SAVED_CLASSES');
    if (saved) {
      try {
        setSavedClasses(JSON.parse(saved));
      } catch (e) {
        console.error("Failed to parse saved classes");
      }
    }
  }, []);

  // Keyboard Shortcuts Handler
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Basic keys
      if (e.key === 'Escape') {
        setShowRandomPicker(false);
        setIsSavingClass(false);
        setShowHelp(false);
      }
      // F for Fullscreen
      if (e.key.toLowerCase() === 'f' && !e.altKey && !e.ctrlKey && !e.metaKey) {
        toggleFullscreen();
      }

      // Alt + Key Combination Shortcuts
      if (e.altKey) {
         switch(e.key.toLowerCase()) {
            case 'p': // Alt + P: Pen
               setCurrentTool('pen');
               break;
            case 'r': // Alt + R: Random Picker
               setShowRandomPicker(prev => !prev);
               break;
            case 's': // Alt + S: Screen Share
               toggleScreenShare();
               break;
            case 'i': // Alt + I: Image Upload
               if (fileInputRef.current) fileInputRef.current.click();
               break;
            default:
               break;
         }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isFullscreen]);

  // Parse raw input into list whenever it changes
  useEffect(() => {
    if (rawListInput.trim()) {
      // Split by new line, comma, or semicolon
      const list = rawListInput.split(/[\n,;]+/).map(s => s.trim()).filter(s => s.length > 0);
      setStudentList(list);
    } else {
      setStudentList([]);
    }
  }, [rawListInput]);

  const toggleScreenShare = () => {
    window.dispatchEvent(new Event('TOGGLE_SCREEN_SHARE'));
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
      setIsFullscreen(true);
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
        setIsFullscreen(false);
      }
    }
  };

  const handleClear = () => {
    setClearTrigger(prev => prev + 1);
    setBackgroundImage(null);
    setBoardColor('#0f172a');
  };
  
  const handleUndo = () => {
    setUndoTrigger(prev => prev + 1);
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          setBackgroundImage(event.target.result as string);
        }
      };
      reader.readAsDataURL(file);
    }
    // Reset value to allow re-uploading same file if needed
    e.target.value = '';
  };

  // --- SAVE/LOAD CLASS LOGIC ---
  const handleSaveClass = () => {
    if (!newClassName.trim()) {
      alert("Vui lòng nhập tên lớp!");
      return;
    }
    if (studentList.length === 0) {
      alert("Danh sách trống, không thể lưu!");
      return;
    }

    const newClass: SavedClass = {
      name: newClassName.trim(),
      students: studentList
    };

    // Check if exists, update or add
    const updatedClasses = [...savedClasses.filter(c => c.name !== newClass.name), newClass];
    
    setSavedClasses(updatedClasses);
    localStorage.setItem('GB_SAVED_CLASSES', JSON.stringify(updatedClasses));
    
    setIsSavingClass(false);
    setNewClassName('');
    alert(`Đã lưu lớp ${newClass.name} thành công!`);
  };

  const handleLoadClass = (cls: SavedClass) => {
    setRawListInput(cls.students.join('\n'));
  };

  const handleDeleteClass = (e: React.MouseEvent, className: string) => {
    e.stopPropagation();
    if (window.confirm(`Bạn có chắc muốn xóa lớp ${className}?`)) {
      const updatedClasses = savedClasses.filter(c => c.name !== className);
      setSavedClasses(updatedClasses);
      localStorage.setItem('GB_SAVED_CLASSES', JSON.stringify(updatedClasses));
    }
  };

  // --- SOUND EFFECTS ENGINE ---
  const playSound = (type: 'tick' | 'win') => {
    const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContext) return;
    
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    
    osc.connect(gain);
    gain.connect(ctx.destination);
    
    if (type === 'tick') {
      // High pitch short beep
      osc.type = 'sine';
      osc.frequency.setValueAtTime(800, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(400, ctx.currentTime + 0.05);
      gain.gain.setValueAtTime(0.1, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.05);
      
      osc.start();
      osc.stop(ctx.currentTime + 0.06);
    } else if (type === 'win') {
      // Victory Chord (Major Triad)
      const now = ctx.currentTime;
      const notes = [523.25, 659.25, 783.99, 1046.50]; // C Major
      
      notes.forEach((freq, i) => {
        const oscN = ctx.createOscillator();
        const gainN = ctx.createGain();
        oscN.connect(gainN);
        gainN.connect(ctx.destination);
        
        oscN.type = 'triangle';
        oscN.frequency.value = freq;
        
        gainN.gain.setValueAtTime(0, now);
        gainN.gain.linearRampToValueAtTime(0.1, now + 0.1);
        gainN.gain.exponentialRampToValueAtTime(0.001, now + 2);
        
        oscN.start(now);
        oscN.stop(now + 2);
      });
    }
  };

  // --- RANDOM PICK LOGIC ---
  const handleRandomPick = () => {
    if (isSpinning) return;
    
    // Validation
    if (pickerMode === 'list' && studentList.length === 0) {
      alert("Vui lòng nhập danh sách học sinh!");
      return;
    }
    
    setIsSpinning(true);
    setPickedResult(null); // Clear previous result
    
    let duration = 6000; // 6 seconds
    const fps = 20; // updates per second
    const totalFrames = (duration / 1000) * fps;
    let frame = 0;
    
    const interval = setInterval(() => {
      frame++;
      
      // Determine potential pool
      let currentVal: string | number;
      if (pickerMode === 'number') {
        currentVal = Math.floor(Math.random() * classSize) + 1;
      } else {
        const randomIndex = Math.floor(Math.random() * studentList.length);
        currentVal = studentList[randomIndex];
      }
      
      setDisplayResult(currentVal);
      playSound('tick');
      
      // Stop condition
      if (frame >= totalFrames) {
        clearInterval(interval);
        setIsSpinning(false);
        setPickedResult(currentVal);
        playSound('win');
        
        // Fireworks effect
        const count = 200;
        const defaults = { origin: { y: 0.7 } };
        function fire(particleRatio: number, opts: any) {
          confetti({
            ...defaults,
            ...opts,
            particleCount: Math.floor(count * particleRatio)
          });
        }
        fire(0.25, { spread: 26, startVelocity: 55 });
        fire(0.2, { spread: 60 });
        fire(0.35, { spread: 100, decay: 0.91, scalar: 0.8 });
        fire(0.1, { spread: 120, startVelocity: 25, decay: 0.92, scalar: 1.2 });
        fire(0.1, { spread: 120, startVelocity: 45 });
      }
    }, 1000 / fps);
  };

  if (isLoading) {
    return (
      <div className="fixed inset-0 z-[100] bg-slate-950 flex flex-col items-center justify-center text-white overflow-hidden font-sans">
        <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_50%_50%,_rgba(59,130,246,0.1),transparent_70%)] animate-pulse" />
        <div className="z-10 flex flex-col items-center animate-[fadeIn_0.5s_ease-out]">
          <h1 className="text-6xl md:text-7xl font-black mb-6 bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-transparent drop-shadow-[0_0_15px_rgba(59,130,246,0.5)]">
            GlassBoard AI
          </h1>
          <div className="h-1 w-64 bg-white/10 rounded-full mb-10 overflow-hidden relative">
            <div className="absolute top-0 left-0 h-full bg-gradient-to-r from-blue-500 to-purple-500 w-full animate-[width_2s_ease-in-out]" style={{width: '0%', animationFillMode: 'forwards'}}></div>
          </div>
          <div className="text-center space-y-3 opacity-0 animate-[slideUp_0.8s_ease-out_0.5s_forwards] transform translate-y-4">
            <p className="text-blue-300 text-sm tracking-[0.2em] uppercase font-semibold">Tác giả</p>
            <h2 className="text-3xl md:text-4xl font-bold text-white drop-shadow-md">Thầy Vũ Tiến Lực</h2>
            <div className="text-gray-400 font-light text-xl mt-2">
              <p>Trường THPT Nguyễn Hữu Cảnh</p>
              <p className="text-base text-gray-500 mt-1">Tp. Hồ Chí Minh</p>
            </div>
          </div>
        </div>
        <style>{`
          @keyframes width { 0% { width: 0%; } 100% { width: 100%; } }
          @keyframes slideUp { 0% { opacity: 0; transform: translateY(20px); } 100% { opacity: 1; transform: translateY(0); } }
          @keyframes fadeIn { 0% { opacity: 0; } 100% { opacity: 1; } }
        `}</style>
      </div>
    );
  }

  return (
    <div className="w-screen h-screen relative overflow-hidden bg-slate-900 animate-[fadeIn_0.5s_ease-out]">
      
      {/* Main Board Area */}
      <div className="absolute inset-0 z-0">
        <Board 
          tool={currentTool} 
          settings={settings}
          clearTrigger={clearTrigger}
          undoTrigger={undoTrigger}
          onScreenShareReady={setIsScreenSharing}
          getCanvasRef={(ref) => canvasRef.current = ref}
          getVideoRef={(ref) => videoRef.current = ref}
          backgroundImage={backgroundImage}
          boardColor={boardColor}
          showGrid={showGrid}
        />
      </div>

      {/* Toolbar Area (Bottom Center) */}
      <Toolbar 
        currentTool={currentTool}
        setTool={setCurrentTool}
        settings={settings}
        setSettings={setSettings}
        onClear={handleClear}
        onUndo={handleUndo}
        onScreenShare={toggleScreenShare}
        isScreenSharing={isScreenSharing}
        onRandomPick={() => setShowRandomPicker(true)}
        onToggleFullscreen={toggleFullscreen}
        isFullscreen={isFullscreen}
        onTriggerImageUpload={() => fileInputRef.current?.click()}
        boardColor={boardColor}
        setBoardColor={setBoardColor}
        showGrid={showGrid}
        setShowGrid={setShowGrid}
        onShowHelp={() => setShowHelp(true)}
      />

      {/* Hidden File Input for Image Upload */}
      <input 
          type="file" 
          ref={fileInputRef} 
          className="hidden" 
          accept="image/*" 
          onChange={handleImageUpload} 
      />
      
      {/* Help & Shortcuts Modal */}
      {showHelp && (
         <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[80] flex items-center justify-center p-4">
           <div className="bg-slate-900 border border-white/20 rounded-2xl p-6 w-full max-w-2xl shadow-2xl relative animate-[fadeIn_0.3s_ease-out]">
             <button onClick={() => setShowHelp(false)} className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors">
               <X size={24} />
             </button>
             
             <div className="flex items-center gap-3 mb-6">
                <Keyboard size={32} className="text-blue-400" />
                <h2 className="text-2xl font-bold text-white">Hướng dẫn & Phím tắt</h2>
             </div>
             
             <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
               
               {/* Shortcuts Column */}
               <div>
                  <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-4 border-b border-white/10 pb-2 flex items-center gap-2">
                    <Command size={14} /> Phím tắt (Shortcuts)
                  </h3>
                  <ul className="space-y-3">
                    <li className="flex justify-between items-center text-gray-300">
                      <span>Bút vẽ (Pen)</span>
                      <code className="bg-white/10 px-2 py-0.5 rounded text-sm font-mono text-yellow-400">Alt + P</code>
                    </li>
                    <li className="flex justify-between items-center text-gray-300">
                      <span>Quay số (Random)</span>
                      <code className="bg-white/10 px-2 py-0.5 rounded text-sm font-mono text-yellow-400">Alt + R</code>
                    </li>
                    <li className="flex justify-between items-center text-gray-300">
                      <span>Chia sẻ màn hình</span>
                      <code className="bg-white/10 px-2 py-0.5 rounded text-sm font-mono text-yellow-400">Alt + S</code>
                    </li>
                    <li className="flex justify-between items-center text-gray-300">
                      <span>Chèn ảnh (Upload)</span>
                      <code className="bg-white/10 px-2 py-0.5 rounded text-sm font-mono text-yellow-400">Alt + I</code>
                    </li>
                    <li className="flex justify-between items-center text-gray-300">
                      <span>Toàn màn hình</span>
                      <code className="bg-white/10 px-2 py-0.5 rounded text-sm font-mono text-yellow-400">F</code>
                    </li>
                    <li className="flex justify-between items-center text-gray-300">
                      <span>Đóng cửa sổ</span>
                      <code className="bg-white/10 px-2 py-0.5 rounded text-sm font-mono text-yellow-400">Esc</code>
                    </li>
                  </ul>
               </div>

               {/* Features Column */}
               <div>
                  <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-4 border-b border-white/10 pb-2 flex items-center gap-2">
                     <Trophy size={14} /> Tính năng nổi bật
                  </h3>
                  <ul className="space-y-4">
                    <li className="flex gap-3">
                      <div className="bg-blue-500/20 p-2 rounded text-blue-400 h-fit"><Feather size={16}/></div>
                      <div>
                        <div className="font-semibold text-white">Bút cọ (Chữ đẹp)</div>
                        <p className="text-xs text-gray-400">Tự động điều chỉnh nét thanh nét đậm theo tốc độ viết.</p>
                      </div>
                    </li>
                    <li className="flex gap-3">
                       <div className="bg-purple-500/20 p-2 rounded text-purple-400 h-fit"><Box size={16}/></div>
                       <div>
                         <div className="font-semibold text-white">Hình không gian 3D</div>
                         <p className="text-xs text-gray-400">Hỗ trợ vẽ hình chóp, lăng trụ, nón, trụ với nét đứt tự động.</p>
                       </div>
                    </li>
                    <li className="flex gap-3">
                       <div className="bg-green-500/20 p-2 rounded text-green-400 h-fit"><MonitorUp size={16}/></div>
                       <div>
                         <div className="font-semibold text-white">Bảng trong suốt</div>
                         <p className="text-xs text-gray-400">Viết vẽ trực tiếp lên nội dung bài giảng Powerpoint/Web.</p>
                       </div>
                    </li>
                  </ul>
               </div>

             </div>
             
             {/* Author Info Section */}
             <div className="mt-8 pt-6 border-t border-white/10 flex flex-col items-center justify-center text-center">
                <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-1">Thông tin tác giả</p>
                <h3 className="text-xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-400 mb-1">Thầy Vũ Tiến Lực</h3>
                <p className="text-gray-300 font-mono text-sm mb-1">0969 068 849</p>
                <p className="text-gray-400 text-sm">Trường THPT Nguyễn Hữu Cảnh - Tp. Hồ Chí Minh</p>
             </div>
             
             <div className="mt-6 text-center">
                <button onClick={() => setShowHelp(false)} className="px-6 py-2 bg-white/10 hover:bg-white/20 rounded-full text-white transition-colors">
                  Đã hiểu
                </button>
             </div>

           </div>
         </div>
      )}
      
      {/* Random Number/Name Modal */}
      {showRandomPicker && (
         <div className="absolute inset-0 bg-black/80 backdrop-blur-md z-[70] flex items-center justify-center p-4">
           <div className="bg-slate-900 border border-white/20 rounded-3xl p-6 w-full max-w-5xl shadow-2xl flex flex-col md:flex-row gap-6 max-h-[90vh] overflow-hidden">
             
             {/* Left Panel: Settings */}
             <div className="w-full md:w-1/3 flex flex-col gap-4 border-r border-white/10 pr-0 md:pr-6 overflow-y-auto no-scrollbar">
               <div className="flex justify-between items-center mb-2">
                 <div className="flex items-center gap-2 text-purple-400 font-bold text-xl">
                   <Dices size={28} />
                   <span>Quay Ngẫu Nhiên</span>
                 </div>
               </div>

               {/* Mode Switcher */}
               <div className="flex bg-slate-800 p-1 rounded-lg shrink-0">
                 <button 
                    onClick={() => setPickerMode('list')}
                    className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-md transition-all ${pickerMode === 'list' ? 'bg-purple-600 text-white shadow' : 'text-gray-400 hover:text-white'}`}
                 >
                   <List size={16} /> Danh sách
                 </button>
                 <button 
                    onClick={() => setPickerMode('number')}
                    className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-md transition-all ${pickerMode === 'number' ? 'bg-blue-600 text-white shadow' : 'text-gray-400 hover:text-white'}`}
                 >
                   <Hash size={16} /> Số thứ tự
                 </button>
               </div>

               {/* Input Area */}
               <div className="flex-1 flex flex-col min-h-[200px]">
                  {pickerMode === 'list' ? (
                    <div className="flex-1 flex flex-col gap-3">
                      <div className="flex justify-between items-center">
                         <label className="text-gray-300 text-sm font-medium">Danh sách (Excel/Word):</label>
                         {!isSavingClass ? (
                            <button 
                              onClick={() => setIsSavingClass(true)} 
                              disabled={studentList.length === 0}
                              className="text-xs flex items-center gap-1 bg-green-700 hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed px-2 py-1 rounded text-white transition-colors"
                            >
                              <Save size={12} /> Lưu lớp
                            </button>
                         ) : (
                            <div className="flex items-center gap-1">
                               <input 
                                  autoFocus
                                  className="w-24 bg-black/40 border border-white/20 rounded px-1 py-0.5 text-xs text-white"
                                  placeholder="Tên lớp..."
                                  value={newClassName}
                                  onChange={(e) => setNewClassName(e.target.value)}
                                  onKeyDown={(e) => e.key === 'Enter' && handleSaveClass()}
                               />
                               <button onClick={handleSaveClass} className="bg-green-600 p-1 rounded hover:bg-green-500"><Save size={12}/></button>
                               <button onClick={() => setIsSavingClass(false)} className="bg-red-600 p-1 rounded hover:bg-red-500"><X size={12}/></button>
                            </div>
                         )}
                      </div>
                      
                      <textarea
                        value={rawListInput}
                        onChange={(e) => setRawListInput(e.target.value)}
                        placeholder="Dán danh sách tên học sinh vào đây...&#10;Nguyễn Văn A&#10;Trần Thị B&#10;..."
                        className="w-full h-40 bg-black/30 border border-white/20 rounded-xl p-3 text-white text-sm focus:outline-none focus:border-purple-500 resize-none font-mono"
                      />
                      
                      {/* Saved Classes List */}
                      {savedClasses.length > 0 && (
                        <div className="flex flex-col gap-2 mt-2">
                           <div className="text-xs text-gray-400 font-semibold uppercase tracking-wider">Lớp đã lưu</div>
                           <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto">
                              {savedClasses.map((cls, idx) => (
                                <div key={idx} className="group flex items-center gap-1 bg-slate-700/50 hover:bg-purple-600/30 border border-white/10 rounded-full pl-3 pr-1 py-1 transition-all cursor-pointer" onClick={() => handleLoadClass(cls)}>
                                   <span className="text-xs text-white truncate max-w-[100px]">{cls.name}</span>
                                   <span className="text-[10px] text-gray-400">({cls.students.length})</span>
                                   <button 
                                      onClick={(e) => handleDeleteClass(e, cls.name)}
                                      className="p-1 rounded-full hover:bg-red-500/80 hover:text-white text-gray-500 opacity-0 group-hover:opacity-100 transition-all"
                                   >
                                      <X size={10} />
                                   </button>
                                </div>
                              ))}
                           </div>
                        </div>
                      )}

                      <div className="text-xs text-gray-500 text-right mt-auto">
                        Đã nhận: {studentList.length} học sinh
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col gap-4 py-4">
                       <label className="text-gray-300 text-sm">Nhập sĩ số lớp:</label>
                       <input 
                          type="number" 
                          min="1" 
                          max="999" 
                          value={classSize}
                          onChange={(e) => setClassSize(Number(e.target.value))}
                          className="w-full bg-black/30 border border-white/20 rounded-xl p-3 text-white text-2xl text-center focus:outline-none focus:border-blue-500"
                       />
                       <p className="text-sm text-gray-500 italic mt-2">
                         Hệ thống sẽ chọn ngẫu nhiên một số từ 1 đến {classSize}.
                       </p>
                    </div>
                  )}
               </div>

               <div className="flex gap-3 mt-auto shrink-0 pt-4">
                 <button onClick={() => setShowRandomPicker(false)} className="flex-1 py-3 border border-white/10 hover:bg-white/5 text-gray-300 rounded-xl transition-colors">
                    Đóng
                 </button>
                 <button 
                    onClick={handleRandomPick}
                    disabled={isSpinning || (pickerMode === 'list' && studentList.length === 0)}
                    className="flex-[2] py-3 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 disabled:opacity-50 text-white font-bold rounded-xl shadow-lg transition-all transform hover:scale-[1.02] flex items-center justify-center gap-2"
                  >
                    {isSpinning ? <Loader2 className="animate-spin" /> : <Dices />}
                    {isSpinning ? "Đang quay..." : "QUAY NGAY"}
                  </button>
               </div>
             </div>

             {/* Right Panel: Display */}
             <div className="w-full md:w-2/3 bg-black/50 rounded-2xl border border-white/10 flex flex-col relative overflow-hidden min-h-[400px]">
               {/* Background Glow */}
               <div className={`absolute inset-0 transition-opacity duration-1000 ${isSpinning ? 'opacity-100' : 'opacity-20'}`}>
                 <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-purple-500/20 rounded-full blur-[100px] animate-pulse"></div>
               </div>

               <div className="relative z-10 flex-1 flex flex-col items-center justify-center p-8 text-center">
                 {isSpinning && (
                   <div className="text-xl text-blue-300 mb-8 animate-bounce font-medium tracking-widest uppercase">
                     Đang tìm người may mắn...
                   </div>
                 )}
                 
                 {!isSpinning && pickedResult && (
                    <div className="flex items-center gap-3 text-yellow-400 mb-6 animate-[bounce_1s_infinite]">
                      <Trophy size={40} />
                      <span className="text-2xl font-bold uppercase tracking-widest">Chúc mừng</span>
                      <Trophy size={40} />
                    </div>
                 )}

                 <div className={`font-black break-words w-full transition-all duration-100 leading-tight
                    ${isSpinning ? 'text-7xl md:text-8xl animate-rainbow opacity-80 scale-95 blur-[1px]' : ''}
                    ${!isSpinning && pickedResult ? 'text-8xl md:text-[150px] text-transparent bg-clip-text bg-gradient-to-b from-yellow-300 to-yellow-600 drop-shadow-[0_0_30px_rgba(234,179,8,0.6)] scale-110' : ''}
                    ${!isSpinning && !pickedResult ? 'text-8xl text-gray-700' : ''}
                 `}>
                   {displayResult}
                 </div>
               </div>
             </div>

           </div>
         </div>
      )}

      {/* Watermark (Only visible when clean slate) */}
      {!isScreenSharing && !currentTool && !backgroundImage && boardColor === '#0f172a' && (
        <div className="absolute top-10 left-10 text-white/5 pointer-events-none select-none">
          <h1 className="text-4xl font-bold">GlassBoard</h1>
        </div>
      )}
    </div>
  );
}

export default App;