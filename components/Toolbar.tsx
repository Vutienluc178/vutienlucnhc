import React, { useState } from 'react';
import { 
  Pencil, 
  Feather,
  Minus, 
  Circle, 
  Square, 
  Triangle,
  Eraser, 
  Trash2, 
  MonitorUp, 
  VideoOff,
  Undo2,
  Move,
  Dices,
  Maximize,
  Minimize,
  Image as ImageIcon,
  Type,
  Grid3X3,
  Box,
  Cylinder,
  Cone,
  Pyramid,
  Cuboid,
  Network,
  CircleHelp
} from 'lucide-react';
import { ToolType, DrawingSettings } from '../types';

interface ToolbarProps {
  currentTool: ToolType;
  setTool: (tool: ToolType) => void;
  settings: DrawingSettings;
  setSettings: React.Dispatch<React.SetStateAction<DrawingSettings>>;
  onClear: () => void;
  onUndo: () => void;
  onScreenShare: () => void;
  isScreenSharing: boolean;
  onRandomPick: () => void;
  onToggleFullscreen: () => void;
  isFullscreen: boolean;
  onTriggerImageUpload: () => void;
  boardColor: string;
  setBoardColor: (color: string) => void;
  showGrid: boolean;
  setShowGrid: (show: boolean) => void;
  onShowHelp: () => void;
}

const COLORS = ['#FFFFFF', '#EF4444', '#F59E0B', '#10B981', '#3B82F6', '#8B5CF6', '#000000'];
const BOARD_COLORS = [
  { color: '#0f172a', title: 'Mặc định' },
  { color: '#ffffff', title: 'Trắng' },
  { color: '#14532d', title: 'Xanh' },
  { color: '#000000', title: 'Đen' },
];

const Toolbar: React.FC<ToolbarProps> = ({
  currentTool,
  setTool,
  settings,
  setSettings,
  onClear,
  onUndo,
  onScreenShare,
  isScreenSharing,
  onRandomPick,
  onToggleFullscreen,
  isFullscreen,
  onTriggerImageUpload,
  boardColor,
  setBoardColor,
  showGrid,
  setShowGrid,
  onShowHelp
}) => {
  const [show3DMenu, setShow3DMenu] = useState(false);

  const handleColorChange = (color: string) => {
    setSettings(prev => ({ ...prev, color }));
  };

  const handleWidthChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSettings(prev => ({ ...prev, width: parseInt(e.target.value) }));
  };

  const handleFontSizeChange = (size: number) => {
    setSettings(prev => ({ ...prev, fontSize: size }));
  };

  const is3DToolActive = [
    'coord_3d', 'cube', 'cuboid', 'pyramid_tri', 'pyramid_tri_right', 'pyramid_quad', 'pyramid_quad_right', 'prism_tri', 'cylinder', 'cone'
  ].includes(currentTool);

  return (
    <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 z-50 max-w-[95vw]">
      
      {/* 3D Menu Popover (conditionally rendered above the main toolbar) */}
      {show3DMenu && (
        <div className="bg-black/80 backdrop-blur-md border border-white/10 rounded-2xl px-3 py-2 shadow-xl flex gap-1 animate-[fadeIn_0.2s_ease-out] mb-2 overflow-x-auto no-scrollbar max-w-[90vw]">
           <ToolButton active={currentTool === 'coord_3d'} onClick={() => setTool('coord_3d')} icon={<Move className="text-red-400" size={20} />} title="Hệ trục Oxyz" />
           <div className="w-px h-6 bg-white/20 mx-1"></div>
           <ToolButton active={currentTool === 'cube'} onClick={() => setTool('cube')} icon={<Box size={20} />} title="Hình lập phương" />
           <ToolButton active={currentTool === 'cuboid'} onClick={() => setTool('cuboid')} icon={<Cuboid size={20} />} title="Hình hộp CN" />
           <ToolButton active={currentTool === 'prism_tri'} onClick={() => setTool('prism_tri')} icon={<Triangle className="rotate-90" size={20} />} title="Lăng trụ tam giác" />
           <div className="w-px h-6 bg-white/20 mx-1"></div>
           <ToolButton active={currentTool === 'pyramid_tri'} onClick={() => setTool('pyramid_tri')} icon={<Pyramid size={20} />} title="Chóp tam giác đều" />
           <ToolButton active={currentTool === 'pyramid_tri_right'} onClick={() => setTool('pyramid_tri_right')} icon={<Triangle className="stroke-[3]" size={20} />} title="Chóp tam giác (SA ⊥ đáy)" />
           <ToolButton active={currentTool === 'pyramid_quad'} onClick={() => setTool('pyramid_quad')} icon={<Pyramid className="stroke-[3]" size={20} />} title="Chóp tứ giác đều" />
           <ToolButton active={currentTool === 'pyramid_quad_right'} onClick={() => setTool('pyramid_quad_right')} icon={<Network size={20} />} title="Chóp tứ giác (SA ⊥ đáy)" />
           <div className="w-px h-6 bg-white/20 mx-1"></div>
           <ToolButton active={currentTool === 'cylinder'} onClick={() => setTool('cylinder')} icon={<Cylinder size={20} />} title="Hình trụ" />
           <ToolButton active={currentTool === 'cone'} onClick={() => setTool('cone')} icon={<Cone size={20} />} title="Hình nón" />
        </div>
      )}

      {/* Main Toolbar */}
      <div className="bg-black/80 backdrop-blur-md border border-white/10 rounded-full px-4 py-2 shadow-2xl flex flex-row items-center gap-4 overflow-x-auto no-scrollbar w-full md:w-auto">
        
        {/* Group 1: Pens */}
        <div className="flex items-center gap-1">
           <ToolButton active={currentTool === 'pen'} onClick={() => setTool('pen')} icon={<Pencil size={20} />} title="Bút thường (Alt+P)" />
           <ToolButton active={currentTool === 'calligraphy'} onClick={() => setTool('calligraphy')} icon={<Feather size={20} />} title="Bút cọ (Chữ đẹp)" />
           <ToolButton active={currentTool === 'text'} onClick={() => setTool('text')} icon={<Type size={20} />} title="Văn bản" />
           <ToolButton active={currentTool === 'eraser'} onClick={() => setTool('eraser')} icon={<Eraser size={20} />} title="Tẩy" />
        </div>

        <div className="w-px h-8 bg-white/20"></div>

        {/* Group 2: 2D Shapes & Grid */}
        <div className="flex items-center gap-1">
          <ToolButton active={showGrid} onClick={() => setShowGrid(!showGrid)} icon={<Grid3X3 size={20} />} title="Bật/Tắt Lưới" />
          <ToolButton active={currentTool === 'line'} onClick={() => setTool('line')} icon={<Minus size={20} />} title="Đường liền" />
          <ToolButton active={currentTool === 'dashed'} onClick={() => setTool('dashed')} icon={<Minus className="stroke-dashed" strokeDasharray="4 4" size={20} />} title="Đường nét đứt" />
          <ToolButton active={currentTool === 'rect'} onClick={() => setTool('rect')} icon={<Square size={20} />} title="Hình vuông" />
          <ToolButton active={currentTool === 'circle'} onClick={() => setTool('circle')} icon={<Circle size={20} />} title="Hình tròn" />
          <ToolButton active={currentTool === 'ellipse'} onClick={() => setTool('ellipse')} icon={<Circle className="scale-y-50" size={20} />} title="Elip" />
          <ToolButton active={currentTool === 'axis'} onClick={() => setTool('axis')} icon={<Move size={20} />} title="Trục số 2D" />
        </div>

        <div className="w-px h-8 bg-white/20"></div>

        {/* Group 3: 3D Menu Trigger */}
        <div className="flex items-center">
           <ToolButton 
              active={is3DToolActive || show3DMenu} 
              onClick={() => setShow3DMenu(!show3DMenu)} 
              icon={<Box size={20} className="text-yellow-400" />} 
              title="Hình Không Gian 3D" 
           />
        </div>

        <div className="w-px h-8 bg-white/20"></div>

        {/* Group 4: Settings */}
        <div className="flex items-center gap-3 px-2">
           <div className="flex -space-x-1 hover:space-x-1 transition-all">
             {COLORS.map(c => (
                <button
                  key={c}
                  onClick={() => handleColorChange(c)}
                  className={`w-5 h-5 rounded-full border border-white/20 transition-transform hover:scale-125 ${settings.color === c ? 'ring-2 ring-white z-10 scale-110' : ''}`}
                  style={{ backgroundColor: c }}
                  title={c}
                />
              ))}
           </div>
           
           {/* Conditional Size Control: Text vs Stroke Width */}
           {currentTool === 'text' ? (
             <div className="flex bg-white/10 rounded-lg p-0.5 gap-1">
               <button 
                 onClick={() => handleFontSizeChange(32)}
                 className={`px-2 py-0.5 text-xs font-bold rounded ${settings.fontSize === 32 ? 'bg-blue-600 text-white' : 'text-gray-300 hover:text-white hover:bg-white/10'}`}
                 title="Kích thước 1x (32px)"
               >
                 1x
               </button>
               <button 
                 onClick={() => handleFontSizeChange(64)}
                 className={`px-2 py-0.5 text-xs font-bold rounded ${settings.fontSize === 64 ? 'bg-blue-600 text-white' : 'text-gray-300 hover:text-white hover:bg-white/10'}`}
                 title="Kích thước 2x (64px)"
               >
                 2x
               </button>
               <button 
                 onClick={() => handleFontSizeChange(96)}
                 className={`px-2 py-0.5 text-xs font-bold rounded ${settings.fontSize === 96 ? 'bg-blue-600 text-white' : 'text-gray-300 hover:text-white hover:bg-white/10'}`}
                 title="Kích thước 3x (96px)"
               >
                 3x
               </button>
             </div>
           ) : (
             <div className="w-20">
                 <input
                  type="range"
                  min="1"
                  max="20"
                  value={settings.width}
                  onChange={handleWidthChange}
                  className="w-full h-1 bg-gray-600 rounded-lg appearance-none cursor-pointer accent-blue-500"
                  title={`Độ dày: ${settings.width}px`}
                />
             </div>
           )}

           <div className="flex gap-1 ml-2">
              {BOARD_COLORS.map(b => (
                <button
                    key={b.color}
                    onClick={() => setBoardColor(b.color)}
                    className={`w-4 h-4 rounded-full border border-gray-500 ${boardColor === b.color ? 'ring-2 ring-white' : ''}`}
                    style={{ backgroundColor: b.color }}
                    title={b.title}
                />
              ))}
           </div>
        </div>

        <div className="w-px h-8 bg-white/20"></div>

        {/* Group 5: Actions */}
        <div className="flex items-center gap-1">
          <ActionButton onClick={onUndo} icon={<Undo2 size={20} />} title="Hoàn tác" />
          <ActionButton onClick={onClear} icon={<Trash2 size={20} />} title="Xóa hết" variant="danger" />
          <ActionButton onClick={onTriggerImageUpload} icon={<ImageIcon size={20} />} title="Chèn ảnh (Alt+I)" variant="purple" />
          <ActionButton onClick={onRandomPick} icon={<Dices size={20} />} title="Quay số (Alt+R)" variant="purple" />
          <ActionButton onClick={onScreenShare} active={isScreenSharing} icon={isScreenSharing ? <VideoOff size={20} /> : <MonitorUp size={20} />} title="Chia sẻ (Alt+S)" variant="blue" />
          <ActionButton onClick={onToggleFullscreen} icon={isFullscreen ? <Minimize size={20} /> : <Maximize size={20} />} title="Full màn hình (F)" />
          <ActionButton onClick={onShowHelp} icon={<CircleHelp size={20} />} title="Hướng dẫn" />
        </div>
      </div>
    </div>
  );
};

const ToolButton: React.FC<{ active: boolean; onClick: () => void; icon: React.ReactNode; title: string }> = ({ active, onClick, icon, title }) => (
  <div className="relative group">
    <button
      onClick={onClick}
      className={`p-2 rounded-full transition-all flex items-center justify-center ${
        active ? 'bg-blue-600 text-white shadow shadow-blue-500/50 scale-110' : 'text-gray-400 hover:bg-white/10 hover:text-white'
      }`}
    >
      {icon}
    </button>
    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-black/90 text-white text-xs rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none border border-white/10 z-[60]">
      {title}
    </div>
  </div>
);

const ActionButton: React.FC<{ onClick: () => void; icon: React.ReactNode; title: string; active?: boolean; variant?: 'default' | 'danger' | 'blue' | 'purple'; loading?: boolean }> = ({ 
  onClick, icon, title, active, variant = 'default', loading 
}) => {
  let variantClass = "text-gray-400 hover:bg-white/10 hover:text-white";
  
  if (variant === 'danger') variantClass = "text-red-400 hover:bg-red-500/20 hover:text-red-200";
  if (variant === 'blue' || active) variantClass = "bg-blue-600/80 text-white hover:bg-blue-500";
  if (variant === 'purple') variantClass = "bg-purple-600/80 text-white hover:bg-purple-500";

  return (
    <div className="relative group">
      <button onClick={onClick} className={`p-2 rounded-full transition-all ${variantClass}`} disabled={loading}>
        {loading ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : icon}
      </button>
       <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-black/90 text-white text-xs rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none border border-white/10 z-[60]">
        {title}
      </div>
    </div>
  );
};

export default Toolbar;