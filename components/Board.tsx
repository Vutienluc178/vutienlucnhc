import React, { useRef, useEffect, useState, useCallback } from 'react';
import { ToolType, DrawingSettings, Point } from '../types';
import { Check, X, Maximize2 } from 'lucide-react';

interface BoardProps {
  tool: ToolType;
  settings: DrawingSettings;
  clearTrigger: number;
  undoTrigger: number;
  onScreenShareReady: (isActive: boolean) => void;
  getCanvasRef: (ref: HTMLCanvasElement | null) => void;
  getVideoRef: (ref: HTMLVideoElement | null) => void;
  backgroundImage: string | null;
  boardColor: string;
  showGrid: boolean;
}

interface PastedImageState {
  element: HTMLImageElement;
  x: number;
  y: number;
  width: number;
  height: number;
  aspectRatio: number;
}

interface InteractionState {
  mode: 'move' | 'resize' | null;
  startX: number;
  startY: number;
  initialX: number; // x position or width
  initialY: number; // y position or height
}

const Board: React.FC<BoardProps> = ({ 
  tool, 
  settings, 
  clearTrigger,
  undoTrigger,
  onScreenShareReady,
  getCanvasRef,
  getVideoRef,
  backgroundImage,
  boardColor,
  showGrid
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null); 
  
  const [isDrawing, setIsDrawing] = useState(false);
  const [startPos, setStartPos] = useState<Point | null>(null);
  const lastPosRef = useRef<Point | null>(null);
  const lastTimeRef = useRef<number>(0);
  const lastWidthRef = useRef<number>(settings.width);

  const [snapshot, setSnapshot] = useState<ImageData | null>(null);
  const [history, setHistory] = useState<ImageData[]>([]);
  const [typingPos, setTypingPos] = useState<Point | null>(null);

  // --- Paste Image State ---
  const [pastedImage, setPastedImage] = useState<PastedImageState | null>(null);
  const [interaction, setInteraction] = useState<InteractionState>({ 
    mode: null, startX: 0, startY: 0, initialX: 0, initialY: 0 
  });

  // Initialize refs for parent
  useEffect(() => {
    getCanvasRef(canvasRef.current);
    getVideoRef(videoRef.current);
  }, [getCanvasRef, getVideoRef]);

  // Reset typing if tool changes
  useEffect(() => {
    setTypingPos(null);
  }, [tool]);

  // Auto-focus input when it appears
  useEffect(() => {
    if (typingPos && inputRef.current) {
      inputRef.current.focus();
    }
  }, [typingPos]);

  // Setup Canvas Size with ResizeObserver
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const resizeObserver = new ResizeObserver(() => {
      if (containerRef.current && canvasRef.current) {
        const { width, height } = containerRef.current.getBoundingClientRect();
        
        let content: ImageData | null = null;
        if (canvasRef.current.width > 0 && canvasRef.current.height > 0) {
           const ctx = canvasRef.current.getContext('2d');
           content = ctx?.getImageData(0,0, canvasRef.current.width, canvasRef.current.height) || null;
        }
        
        canvasRef.current.width = width;
        canvasRef.current.height = height;

        if (content) {
          const ctx = canvasRef.current.getContext('2d');
          ctx?.putImageData(content, 0, 0);
        }
      }
    });

    resizeObserver.observe(container);

    return () => resizeObserver.disconnect();
  }, []);

  // Handle Clear
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    const currentData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    setHistory(prev => [...prev.slice(-19), currentData]);
    
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setPastedImage(null);
  }, [clearTrigger]);

  // Handle Undo
  useEffect(() => {
    if (history.length === 0 || !canvasRef.current) return;
    
    const ctx = canvasRef.current.getContext('2d');
    if (!ctx) return;

    const previousState = history[history.length - 1];
    ctx.putImageData(previousState, 0, 0);
    setHistory(prev => prev.slice(0, -1));
  }, [undoTrigger]);

  // --- PASTE HANDLING ---
  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;

      for (let i = 0; i < items.length; i++) {
        if (items[i].type.indexOf('image') !== -1) {
          const blob = items[i].getAsFile();
          if (blob) {
            const reader = new FileReader();
            reader.onload = (event) => {
              const img = new Image();
              img.onload = () => {
                const maxWidth = window.innerWidth * 0.5;
                const scale = img.width > maxWidth ? maxWidth / img.width : 1;
                const width = img.width * scale;
                const height = img.height * scale;
                
                setPastedImage({
                  element: img,
                  x: (window.innerWidth - width) / 2,
                  y: (window.innerHeight - height) / 2,
                  width,
                  height,
                  aspectRatio: img.width / img.height
                });
              };
              img.src = event.target?.result as string;
            };
            reader.readAsDataURL(blob);
          }
        }
      }
    };

    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, []);

  // --- INTERACTION LOGIC (Paste) ---
  useEffect(() => {
    const handleMove = (e: MouseEvent | TouchEvent) => {
      if (!interaction.mode || !pastedImage) return;

      const clientX = 'touches' in e ? e.touches[0].clientX : (e as MouseEvent).clientX;
      const clientY = 'touches' in e ? e.touches[0].clientY : (e as MouseEvent).clientY;

      const deltaX = clientX - interaction.startX;
      const deltaY = clientY - interaction.startY;

      if (interaction.mode === 'move') {
        setPastedImage(prev => prev ? ({
          ...prev,
          x: interaction.initialX + deltaX,
          y: interaction.initialY + deltaY
        }) : null);
      } else if (interaction.mode === 'resize') {
        let newWidth = interaction.initialX + deltaX;
        let newHeight = newWidth / pastedImage.aspectRatio;
        if (newWidth < 50) {
           newWidth = 50;
           newHeight = 50 / pastedImage.aspectRatio;
        }
        setPastedImage(prev => prev ? ({
          ...prev,
          width: newWidth,
          height: newHeight
        }) : null);
      }
    };

    const handleUp = () => {
      setInteraction({ mode: null, startX: 0, startY: 0, initialX: 0, initialY: 0 });
    };

    if (interaction.mode) {
      window.addEventListener('mousemove', handleMove);
      window.addEventListener('mouseup', handleUp);
      window.addEventListener('touchmove', handleMove);
      window.addEventListener('touchend', handleUp);
    }

    return () => {
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('mouseup', handleUp);
      window.removeEventListener('touchmove', handleMove);
      window.removeEventListener('touchend', handleUp);
    };
  }, [interaction, pastedImage]);

  const confirmPaste = () => {
    if (!pastedImage || !canvasRef.current) return;
    const ctx = canvasRef.current.getContext('2d');
    if (!ctx) return;
    const currentData = ctx.getImageData(0, 0, canvasRef.current.width, canvasRef.current.height);
    setHistory(prev => [...prev.slice(-19), currentData]);
    ctx.drawImage(pastedImage.element, pastedImage.x, pastedImage.y, pastedImage.width, pastedImage.height);
    setPastedImage(null);
  };

  const cancelPaste = () => setPastedImage(null);

  const getMousePos = (e: React.MouseEvent | React.TouchEvent): Point => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    let clientX, clientY;
    if ('touches' in e) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = (e as React.MouseEvent).clientX;
      clientY = (e as React.MouseEvent).clientY;
    }
    return { x: clientX - rect.left, y: clientY - rect.top };
  };

  const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
    if (pastedImage) return;

    const pos = getMousePos(e);

    if (tool === 'text') {
      setTimeout(() => setTypingPos(pos), 0);
      return;
    }

    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx || !canvasRef.current) return;

    const currentData = ctx.getImageData(0, 0, canvasRef.current.width, canvasRef.current.height);
    setHistory(prev => [...prev.slice(-19), currentData]);

    setIsDrawing(true);
    setStartPos(pos);
    lastPosRef.current = pos;
    lastTimeRef.current = Date.now();
    lastWidthRef.current = settings.width;
    setSnapshot(currentData);

    ctx.beginPath();
    ctx.moveTo(pos.x, pos.y);
    ctx.strokeStyle = settings.color;
    ctx.lineWidth = settings.width;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.shadowBlur = 0.5;
    ctx.shadowColor = settings.color;
    ctx.setLineDash([]); 

    if (tool === 'eraser') {
      ctx.globalCompositeOperation = 'destination-out';
      ctx.shadowBlur = 0;
    } else {
      ctx.globalCompositeOperation = 'source-over';
    }

    if (tool === 'dashed') {
      ctx.setLineDash([settings.width * 3, settings.width * 2]);
      ctx.shadowBlur = 0;
    }
  };

  const drawArrowHead = (ctx: CanvasRenderingContext2D, from: Point, to: Point, color?: string) => {
    const headLength = 15;
    const dx = to.x - from.x;
    const dy = to.y - from.y;
    const angle = Math.atan2(dy, dx);
    const prevStroke = ctx.strokeStyle;
    
    if (color) ctx.strokeStyle = color;
    ctx.beginPath();
    ctx.moveTo(to.x, to.y);
    ctx.lineTo(to.x - headLength * Math.cos(angle - Math.PI / 6), to.y - headLength * Math.sin(angle - Math.PI / 6));
    ctx.moveTo(to.x, to.y);
    ctx.lineTo(to.x - headLength * Math.cos(angle + Math.PI / 6), to.y - headLength * Math.sin(angle + Math.PI / 6));
    ctx.stroke();
    if (color) ctx.strokeStyle = prevStroke;
  };

  const draw3DCoord = (ctx: CanvasRenderingContext2D, origin: Point, end: Point) => {
    const length = Math.max(Math.abs(end.x - origin.x), Math.abs(end.y - origin.y));
    const zEnd = { x: origin.x, y: origin.y - length }; // Z up
    const xEnd = { x: origin.x - length * 0.866, y: origin.y + length * 0.5 }; // X bottom-left (approx 120deg)
    const yEnd = { x: origin.x + length * 0.866, y: origin.y + length * 0.5 }; // Y bottom-right

    // Z Axis - Blue
    ctx.beginPath(); ctx.strokeStyle = '#3b82f6'; 
    ctx.moveTo(origin.x, origin.y); ctx.lineTo(zEnd.x, zEnd.y); ctx.stroke();
    drawArrowHead(ctx, origin, zEnd, '#3b82f6');
    ctx.fillText('z', zEnd.x + 5, zEnd.y);

    // X Axis - Red
    ctx.beginPath(); ctx.strokeStyle = '#ef4444';
    ctx.moveTo(origin.x, origin.y); ctx.lineTo(xEnd.x, xEnd.y); ctx.stroke();
    drawArrowHead(ctx, origin, xEnd, '#ef4444');
    ctx.fillText('x', xEnd.x - 10, xEnd.y);

    // Y Axis - Green
    ctx.beginPath(); ctx.strokeStyle = '#22c55e';
    ctx.moveTo(origin.x, origin.y); ctx.lineTo(yEnd.x, yEnd.y); ctx.stroke();
    drawArrowHead(ctx, origin, yEnd, '#22c55e');
    ctx.fillText('y', yEnd.x + 10, yEnd.y);

    // Center O
    ctx.fillStyle = '#9ca3af';
    ctx.fillText('O', origin.x + 5, origin.y + 15);
  };

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing || !startPos) return;
    
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;

    const currentPos = getMousePos(e);

    // --- CALLIGRAPHY / AUTO BEAUTIFUL PEN ---
    if (tool === 'calligraphy') {
      if (lastPosRef.current) {
        const dist = Math.sqrt(Math.pow(currentPos.x - lastPosRef.current.x, 2) + Math.pow(currentPos.y - lastPosRef.current.y, 2));
        const time = Date.now() - lastTimeRef.current;
        const velocity = dist / (time || 1); // Avoid div by zero
        
        // Dynamic width based on velocity (slower = thicker, faster = thinner)
        const baseWidth = settings.width * 1.5;
        const newWidth = Math.max(settings.width * 0.5, Math.min(baseWidth, baseWidth - (velocity * 2)));
        
        // Smooth transition of width
        const width = lastWidthRef.current * 0.7 + newWidth * 0.3;
        
        ctx.beginPath();
        ctx.lineWidth = width;
        ctx.strokeStyle = settings.color;
        
        // Use quadratic curve for smoothness
        const midPoint = {
          x: (lastPosRef.current.x + currentPos.x) / 2,
          y: (lastPosRef.current.y + currentPos.y) / 2
        };
        ctx.moveTo(lastPosRef.current.x, lastPosRef.current.y);
        ctx.quadraticCurveTo(lastPosRef.current.x, lastPosRef.current.y, midPoint.x, midPoint.y);
        ctx.stroke();

        lastPosRef.current = midPoint; // Important: continue from midpoint
        lastTimeRef.current = Date.now();
        lastWidthRef.current = width;
      }
      return;
    }

    if (tool === 'pen' || tool === 'eraser') {
      if (lastPosRef.current) {
        const curveMidPoint = {
           x: (lastPosRef.current.x + currentPos.x) / 2,
           y: (lastPosRef.current.y + currentPos.y) / 2
        };
        ctx.quadraticCurveTo(lastPosRef.current.x, lastPosRef.current.y, curveMidPoint.x, curveMidPoint.y);
        ctx.stroke();
        lastPosRef.current = currentPos;
      }
    } else if (snapshot) {
      // --- SHAPE PREVIEWS ---
      ctx.putImageData(snapshot, 0, 0);
      ctx.beginPath();
      ctx.shadowBlur = 0;
      ctx.globalCompositeOperation = 'source-over';
      ctx.strokeStyle = settings.color;
      ctx.lineWidth = settings.width;
      ctx.setLineDash([]); 

      const w = currentPos.x - startPos.x;
      const h = currentPos.y - startPos.y;

      if (tool === 'line') {
        ctx.moveTo(startPos.x, startPos.y);
        ctx.lineTo(currentPos.x, currentPos.y);
        ctx.stroke();
      } else if (tool === 'dashed') {
        ctx.setLineDash([settings.width * 3, settings.width * 2]);
        ctx.moveTo(startPos.x, startPos.y);
        ctx.lineTo(currentPos.x, currentPos.y);
        ctx.stroke();
      } else if (tool === 'circle') {
        const radius = Math.sqrt(Math.pow(w, 2) + Math.pow(h, 2));
        ctx.arc(startPos.x, startPos.y, radius, 0, 2 * Math.PI);
        ctx.stroke();
      } else if (tool === 'rect') {
        ctx.strokeRect(startPos.x, startPos.y, w, h);
      } else if (tool === 'ellipse') {
        ctx.ellipse(startPos.x, startPos.y, Math.abs(w), Math.abs(h), 0, 0, 2 * Math.PI);
        ctx.stroke();
      } else if (tool === 'axis') {
         drawArrowHead(ctx, startPos, currentPos, settings.color);
         ctx.moveTo(startPos.x, startPos.y);
         ctx.lineTo(currentPos.x, currentPos.y);
         ctx.stroke();
      } else if (tool === 'coord_3d') {
         draw3DCoord(ctx, startPos, currentPos);
      } else if (tool === 'cube' || tool === 'cuboid') {
         ctx.strokeRect(startPos.x, startPos.y, w, h);
         
         const depthX = w * 0.5;
         const depthY = -h * 0.5;
         
         const bx = startPos.x + depthX;
         const by = startPos.y + depthY;
         
         // Hidden (Dashed)
         ctx.setLineDash([5, 5]);
         ctx.beginPath(); ctx.moveTo(startPos.x, startPos.y + h); ctx.lineTo(bx, by + h); ctx.stroke();
         ctx.beginPath(); ctx.moveTo(bx, by + h); ctx.lineTo(bx + w, by + h); ctx.stroke();
         ctx.beginPath(); ctx.moveTo(bx, by); ctx.lineTo(bx, by + h); ctx.stroke();
         
         ctx.setLineDash([]);
         // Visible
         ctx.beginPath(); ctx.moveTo(startPos.x, startPos.y); ctx.lineTo(bx, by); ctx.stroke(); 
         ctx.beginPath(); ctx.moveTo(startPos.x + w, startPos.y); ctx.lineTo(bx + w, by); ctx.stroke();
         ctx.beginPath(); ctx.moveTo(startPos.x + w, startPos.y + h); ctx.lineTo(bx + w, by + h); ctx.stroke();
         
         ctx.beginPath(); ctx.moveTo(bx, by); ctx.lineTo(bx + w, by); ctx.stroke();
         ctx.beginPath(); ctx.moveTo(bx + w, by); ctx.lineTo(bx + w, by + h); ctx.stroke();

      } else if (tool === 'cylinder') {
         const rx = Math.abs(w / 2);
         const ry = Math.abs(w / 8); 
         const cx = startPos.x + w/2;
         
         ctx.beginPath();
         ctx.ellipse(cx, startPos.y, rx, ry, 0, 0, 2 * Math.PI);
         ctx.stroke();
         
         ctx.beginPath();
         ctx.ellipse(cx, startPos.y + h, rx, ry, 0, 0, Math.PI);
         ctx.stroke();
         
         ctx.beginPath();
         ctx.setLineDash([5, 5]);
         ctx.ellipse(cx, startPos.y + h, rx, ry, 0, Math.PI, 2 * Math.PI);
         ctx.stroke();
         ctx.setLineDash([]);
         
         ctx.beginPath();
         ctx.moveTo(cx - rx, startPos.y); ctx.lineTo(cx - rx, startPos.y + h);
         ctx.moveTo(cx + rx, startPos.y); ctx.lineTo(cx + rx, startPos.y + h);
         ctx.stroke();

      } else if (tool === 'cone') {
         const rx = Math.abs(w / 2);
         const ry = Math.abs(w / 8);
         const cx = startPos.x + w/2;
         
         ctx.beginPath();
         ctx.ellipse(cx, startPos.y + h, rx, ry, 0, 0, Math.PI);
         ctx.stroke();
         
         ctx.beginPath();
         ctx.setLineDash([5, 5]);
         ctx.ellipse(cx, startPos.y + h, rx, ry, 0, Math.PI, 2 * Math.PI);
         ctx.stroke();
         ctx.setLineDash([]);
         
         ctx.beginPath();
         ctx.moveTo(cx - rx, startPos.y + h); ctx.lineTo(cx, startPos.y);
         ctx.moveTo(cx + rx, startPos.y + h); ctx.lineTo(cx, startPos.y);
         ctx.stroke();

      } else if (tool === 'pyramid_quad') { // Chóp tứ giác đều
         const cx = startPos.x + w/2;
         const topY = startPos.y;
         const botY = startPos.y + h;
         const baseY = botY;
         const halfW = w/2;
         const depth = h * 0.25;
         
         const pTop = { x: cx, y: topY };
         const pFL = { x: cx - halfW, y: baseY + depth };
         const pFR = { x: cx + halfW, y: baseY + depth };
         const pBL = { x: cx - halfW * 0.7, y: baseY - depth }; 
         const pBR = { x: cx + halfW * 0.7, y: baseY - depth }; 
         
         ctx.beginPath();
         ctx.moveTo(pTop.x, pTop.y); ctx.lineTo(pFL.x, pFL.y);
         ctx.moveTo(pTop.x, pTop.y); ctx.lineTo(pFR.x, pFR.y);
         ctx.moveTo(pFL.x, pFL.y); ctx.lineTo(pFR.x, pFR.y);
         ctx.moveTo(pFR.x, pFR.y); ctx.lineTo(pBR.x, pBR.y); 
         ctx.moveTo(pTop.x, pTop.y); ctx.lineTo(pBR.x, pBR.y); 
         ctx.stroke();
         
         ctx.beginPath();
         ctx.setLineDash([5, 5]);
         ctx.moveTo(pTop.x, pTop.y); ctx.lineTo(pBL.x, pBL.y); 
         ctx.moveTo(pBL.x, pBL.y); ctx.lineTo(pFL.x, pFL.y);
         ctx.moveTo(pBL.x, pBL.y); ctx.lineTo(pBR.x, pBR.y);
         ctx.stroke();

      } else if (tool === 'pyramid_tri') { // Tứ diện
         const top = { x: startPos.x + w/2, y: startPos.y };
         const b1 = { x: startPos.x, y: startPos.y + h };
         const b2 = { x: startPos.x + w, y: startPos.y + h * 0.8 };
         const b3 = { x: startPos.x + w * 0.3, y: startPos.y + h * 0.7 }; // Inner hidden
         
         ctx.beginPath();
         ctx.moveTo(top.x, top.y); ctx.lineTo(b1.x, b1.y);
         ctx.lineTo(b2.x, b2.y); ctx.lineTo(top.x, top.y);
         ctx.moveTo(b1.x, b1.y); ctx.lineTo(b2.x, b2.y);
         ctx.stroke();
         
         ctx.beginPath();
         ctx.setLineDash([5, 5]);
         ctx.moveTo(top.x, top.y); ctx.lineTo(b3.x, b3.y);
         ctx.moveTo(b1.x, b1.y); ctx.lineTo(b3.x, b3.y);
         ctx.moveTo(b2.x, b2.y); ctx.lineTo(b3.x, b3.y);
         ctx.stroke();

      } else if (tool === 'pyramid_tri_right') { // Chóp tam giác vuông góc (SA perp Base)
         // S (Top Left), A (Bottom Left) -> SA vertical
         const S = { x: startPos.x, y: startPos.y };
         const A = { x: startPos.x, y: startPos.y + h };
         const B = { x: startPos.x + w, y: startPos.y + h }; // Front Right
         const C = { x: startPos.x + w * 0.4, y: startPos.y + h * 0.7 }; // Back Right (Offset)

         // Visible: SA, AB, BC, SB, SC
         ctx.beginPath();
         ctx.moveTo(S.x, S.y); ctx.lineTo(A.x, A.y); // SA
         ctx.lineTo(B.x, B.y); // AB
         ctx.lineTo(S.x, S.y); // SB
         ctx.moveTo(S.x, S.y); ctx.lineTo(C.x, C.y); // SC
         ctx.moveTo(B.x, B.y); ctx.lineTo(C.x, C.y); // BC
         ctx.stroke();

         // Hidden: AC
         ctx.beginPath();
         ctx.setLineDash([5, 5]);
         ctx.moveTo(A.x, A.y); ctx.lineTo(C.x, C.y);
         ctx.stroke();

      } else if (tool === 'pyramid_quad_right') { // Chóp tứ giác vuông góc (SA perp Base)
         // S (Top Left), A (Bottom Left) -> SA vertical
         const S = { x: startPos.x, y: startPos.y };
         const A = { x: startPos.x, y: startPos.y + h };
         
         // Base Trapezoid/Rect like shape
         const B = { x: startPos.x + w, y: startPos.y + h + 20 }; // Front Right (lower)
         const C = { x: startPos.x + w + 20, y: startPos.y + h - 30 }; // Back Right
         // D would be back-left hidden behind A? No, let's make A the corner.
         // Let's create a perspective where A is Front-Left corner for solid SA
         // OR A is Back-Left corner for Dashed SA.
         // Standard visual: Vertical line on left is Solid.
         
         // Let's use points:
         // S (Top Left)
         // A (Bottom Left)
         // B (Front Right - shifted down)
         // C (Back Right)
         // D (Back Left - behind A) - Let's assume A is Front-Left corner of base.
         // Actually, most readable:
         // S = Top Left. A = Bottom Left.
         // Base extends right.
         // Front edge AB. Right edge BC. Back edge CD. Left edge DA.
         
         const pB = { x: startPos.x + w, y: startPos.y + h }; // Front Right
         const pC = { x: startPos.x + w * 0.8, y: startPos.y + h * 0.6 }; // Back Right
         const pD = { x: startPos.x + w * 0.2, y: startPos.y + h * 0.6 }; // Back Left (Behind)

         // SA is solid vertical edge
         ctx.beginPath();
         ctx.moveTo(S.x, S.y); ctx.lineTo(A.x, A.y); // SA
         ctx.lineTo(pB.x, pB.y); // AB
         ctx.lineTo(S.x, S.y); // SB
         ctx.moveTo(pB.x, pB.y); ctx.lineTo(pC.x, pC.y); // BC
         ctx.moveTo(S.x, S.y); ctx.lineTo(pC.x, pC.y); // SC
         ctx.stroke();

         // Hidden lines: AD, CD, SD
         ctx.beginPath();
         ctx.setLineDash([5, 5]);
         ctx.moveTo(A.x, A.y); ctx.lineTo(pD.x, pD.y); // AD
         ctx.lineTo(pC.x, pC.y); // CD
         ctx.moveTo(S.x, S.y); ctx.lineTo(pD.x, pD.y); // SD
         ctx.stroke();

      } else if (tool === 'prism_tri') { // Lăng trụ tam giác
         const offset = h * 0.6; // Height of prism
         
         // Top Triangle
         const t1 = { x: startPos.x + w/2, y: startPos.y };
         const t2 = { x: startPos.x, y: startPos.y + h*0.4 };
         const t3 = { x: startPos.x + w, y: startPos.y + h*0.4 };
         
         // Bottom Triangle
         const b1 = { x: t1.x, y: t1.y + offset };
         const b2 = { x: t2.x, y: t2.y + offset };
         const b3 = { x: t3.x, y: t3.y + offset };
         
         // Draw Top (Solid)
         ctx.beginPath();
         ctx.moveTo(t1.x, t1.y); ctx.lineTo(t2.x, t2.y); ctx.lineTo(t3.x, t3.y); ctx.closePath();
         ctx.stroke();
         
         // Vertical Edges (Solid)
         ctx.beginPath();
         ctx.moveTo(t1.x, t1.y); ctx.lineTo(b1.x, b1.y);
         ctx.moveTo(t2.x, t2.y); ctx.lineTo(b2.x, b2.y);
         ctx.moveTo(t3.x, t3.y); ctx.lineTo(b3.x, b3.y);
         ctx.stroke();
         
         // Bottom Edges (Front 2 Solid, Back 1 Dashed)
         ctx.beginPath();
         ctx.moveTo(b2.x, b2.y); ctx.lineTo(b3.x, b3.y); // Front bottom
         ctx.stroke();
         
         ctx.beginPath();
         ctx.setLineDash([5, 5]);
         ctx.moveTo(b1.x, b1.y); ctx.lineTo(b2.x, b2.y);
         ctx.moveTo(b1.x, b1.y); ctx.lineTo(b3.x, b3.y);
         ctx.stroke();
      }
    }
  };

  const stopDrawing = (e: React.MouseEvent | React.TouchEvent) => {
    if (isDrawing) {
      const ctx = canvasRef.current?.getContext('2d');
      
      // Finish stroke for pen/eraser
      if ((tool === 'pen' || tool === 'eraser') && ctx && lastPosRef.current) {
         ctx.lineTo(lastPosRef.current.x, lastPosRef.current.y);
         ctx.stroke();
         ctx.shadowBlur = 0; 
      }
      
      // Finish Calligraphy stroke
      if (tool === 'calligraphy' && ctx && lastPosRef.current) {
        const pos = getMousePos(e);
        ctx.quadraticCurveTo(lastPosRef.current.x, lastPosRef.current.y, pos.x, pos.y);
        ctx.stroke();
      }

      setIsDrawing(false);
      setSnapshot(null);
      lastPosRef.current = null;
    }
  };

  const handleTextComplete = (e: React.FocusEvent<HTMLInputElement> | React.KeyboardEvent<HTMLInputElement>) => {
      const text = (e.target as HTMLInputElement).value;
      setTypingPos(null);
      if (!text.trim() || !typingPos) return;
      
      const ctx = canvasRef.current?.getContext('2d');
      if (ctx && canvasRef.current) {
          const currentData = ctx.getImageData(0, 0, canvasRef.current.width, canvasRef.current.height);
          setHistory(prev => [...prev.slice(-19), currentData]);
          
          ctx.font = `bold ${settings.fontSize}px sans-serif`;
          ctx.fillStyle = settings.color;
          ctx.textBaseline = 'top';
          ctx.globalCompositeOperation = 'source-over';
          ctx.shadowBlur = 0;
          ctx.fillText(text, typingPos.x, typingPos.y);
      }
  };

  // Screen Sharing Logic
  const startScreenShare = async () => {
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: { cursor: "always" } as any,
        audio: false
      });
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.onloadedmetadata = () => {
          videoRef.current?.play();
          onScreenShareReady(true);
        };
      }

      stream.getVideoTracks()[0].onended = () => {
        stopScreenShare();
      };
    } catch (err) {
      console.error("Error sharing screen:", err);
      onScreenShareReady(false);
    }
  };

  const stopScreenShare = useCallback(() => {
    if (videoRef.current && videoRef.current.srcObject) {
      const tracks = (videoRef.current.srcObject as MediaStream).getTracks();
      tracks.forEach(track => track.stop());
      videoRef.current.srcObject = null;
      onScreenShareReady(false);
    }
  }, [onScreenShareReady]);

  useEffect(() => {
    const handleShareToggle = () => {
      if (videoRef.current?.srcObject) {
        stopScreenShare();
      } else {
        startScreenShare();
      }
    };
    
    window.addEventListener('TOGGLE_SCREEN_SHARE', handleShareToggle);
    return () => window.removeEventListener('TOGGLE_SCREEN_SHARE', handleShareToggle);
  }, [stopScreenShare]);

  return (
    <div ref={containerRef} className="relative w-full h-full overflow-hidden select-none transition-colors duration-300" style={{ backgroundColor: boardColor }}>
      {/* Background Video (Screen Share) - Z-index 0 */}
      <video
        ref={videoRef}
        className="absolute top-0 left-0 w-full h-full object-contain pointer-events-none"
        style={{ zIndex: 0 }}
      />
      
      {/* Background Image - Z-index 5 */}
      {backgroundImage && (
        <img 
          src={backgroundImage} 
          alt="Board Background" 
          className="absolute inset-0 w-full h-full object-contain pointer-events-none"
          style={{ zIndex: 5 }}
        />
      )}

      {/* Grid Overlay - Z-index 8 */}
      {showGrid && (
        <div 
          className="absolute inset-0 pointer-events-none w-full h-full opacity-30"
          style={{ 
            zIndex: 8,
            backgroundImage: `
              linear-gradient(to right, rgba(255,255,255,0.5) 1px, transparent 1px),
              linear-gradient(to bottom, rgba(255,255,255,0.5) 1px, transparent 1px)
            `,
            backgroundSize: '40px 40px'
          }}
        />
      )}

      {/* Drawing Canvas - Z-index 10 */}
      <canvas
        ref={canvasRef}
        className={`absolute top-0 left-0 w-full h-full touch-none ${pastedImage ? 'cursor-default' : tool === 'text' ? 'cursor-text' : 'cursor-pen'}`}
        style={{ zIndex: 10 }}
        onMouseDown={startDrawing}
        onMouseMove={draw}
        onMouseUp={stopDrawing}
        onMouseLeave={stopDrawing}
        onTouchStart={startDrawing}
        onTouchMove={draw}
        onTouchEnd={stopDrawing}
      />

      {/* Text Input Overlay */}
      {typingPos && (
        <input
          ref={inputRef}
          className="absolute bg-white/10 border border-white/30 rounded px-2 py-1 outline-none shadow-lg select-text backdrop-blur-sm"
          style={{
            left: typingPos.x,
            top: typingPos.y,
            color: settings.color,
            font: `bold ${settings.fontSize}px sans-serif`,
            zIndex: 20,
            lineHeight: 1,
            minWidth: '200px', 
            pointerEvents: 'auto'
          }}
          placeholder="Nhập văn bản..."
          onBlur={handleTextComplete}
          onKeyDown={(e) => {
             if(e.key === 'Enter') e.currentTarget.blur();
          }}
        />
      )}

      {/* Floating Pasted Image Overlay - Z-index 30 */}
      {pastedImage && (
        <div 
          className="absolute group border-2 border-blue-500 border-dashed"
          style={{
            left: pastedImage.x,
            top: pastedImage.y,
            width: pastedImage.width,
            height: pastedImage.height,
            zIndex: 30,
            cursor: 'move'
          }}
          onMouseDown={(e) => {
             e.preventDefault();
             setInteraction({
                mode: 'move',
                startX: e.clientX,
                startY: e.clientY,
                initialX: pastedImage.x,
                initialY: pastedImage.y
             });
          }}
          onTouchStart={(e) => {
            setInteraction({
               mode: 'move',
               startX: e.touches[0].clientX,
               startY: e.touches[0].clientY,
               initialX: pastedImage.x,
               initialY: pastedImage.y
            });
         }}
        >
           <img 
              src={pastedImage.element.src} 
              className="w-full h-full object-contain pointer-events-none"
              alt="Pasted"
           />

           <div className="absolute -top-12 left-0 flex gap-2 bg-black/60 backdrop-blur rounded-lg p-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <button onClick={confirmPaste} className="p-1 hover:bg-green-600 rounded text-white" title="Chốt ảnh (Vẽ lên bảng)">
                <Check size={20} />
              </button>
              <button onClick={cancelPaste} className="p-1 hover:bg-red-600 rounded text-white" title="Hủy bỏ">
                <X size={20} />
              </button>
           </div>

           <div 
              className="absolute -bottom-3 -right-3 bg-blue-600 rounded-full p-1.5 cursor-nwse-resize shadow-lg hover:scale-125 transition-transform"
              onMouseDown={(e) => {
                e.stopPropagation();
                setInteraction({
                   mode: 'resize',
                   startX: e.clientX,
                   startY: e.clientY,
                   initialX: pastedImage.width,
                   initialY: pastedImage.height
                });
             }}
             onTouchStart={(e) => {
              e.stopPropagation();
              setInteraction({
                 mode: 'resize',
                 startX: e.touches[0].clientX,
                 startY: e.touches[0].clientY,
                 initialX: pastedImage.width,
                 initialY: pastedImage.height
              });
           }}
           >
              <Maximize2 size={12} className="text-white" />
           </div>
        </div>
      )}
    </div>
  );
};

export default Board;