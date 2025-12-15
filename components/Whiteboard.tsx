import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Eraser, Pen, Trash2, ScanSearch, Send, X, Upload, Highlighter, PenTool, Undo, Redo, Square, Circle as CircleIcon, Minus, Type } from 'lucide-react';

interface WhiteboardProps {
    onCapture: (imageData: string) => void;
    onContextQuery?: (query: string, imageData: string) => void;
    isAIEnabled: boolean;
    canDraw: boolean; // Permission prop
}

type ToolType = 'pen' | 'marker' | 'highlighter' | 'eraser' | 'rect' | 'circle' | 'line' | 'text' | 'context';

const COLORS = [
    '#000000', // Black
    '#ea4335', // Red
    '#34a853', // Green
    '#4285f4', // Blue
    '#fbbc04', // Yellow
    '#9333ea', // Purple
    '#ff6d01', // Orange
    '#ffffff', // White
];

export const Whiteboard: React.FC<WhiteboardProps> = ({ onCapture, onContextQuery, isAIEnabled, canDraw }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [isDrawing, setIsDrawing] = useState(false);
  const [color, setColor] = useState('#000000');
  const [lineWidth, setLineWidth] = useState(2);
  const [tool, setTool] = useState<ToolType>('pen');

  // History for Undo/Redo
  const [history, setHistory] = useState<ImageData[]>([]);
  const [historyStep, setHistoryStep] = useState(-1);

  // Shape & Context Selection State
  const [startPos, setStartPos] = useState<{x: number, y: number} | null>(null);
  const [snapshot, setSnapshot] = useState<ImageData | null>(null);
  const [selection, setSelection] = useState<{start: {x:number, y:number} | null, current: {x:number, y:number} | null}>({ start: null, current: null });
  
  // AI Popup State
  const [showQueryPopup, setShowQueryPopup] = useState(false);
  const [queryText, setQueryText] = useState('');
  const [popupPos, setPopupPos] = useState({ x: 0, y: 0 });

  // Text Input State
  const [textInput, setTextInput] = useState<{x: number, y: number, text: string} | null>(null);

  // Initialize canvas with ResizeObserver
  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return;

    const initCanvas = () => {
        // Only resize if dimensions change to avoid clearing content unnecessarily
        if (canvas.width !== container.offsetWidth || canvas.height !== container.offsetHeight) {
             const tempImage = historyStep >= 0 ? ctx.getImageData(0,0, canvas.width, canvas.height) : null;
             
             canvas.width = container.offsetWidth;
             canvas.height = container.offsetHeight;
             
             // Fill white
             ctx.fillStyle = '#ffffff';
             ctx.fillRect(0, 0, canvas.width, canvas.height);
             
             // Restore if we had content
             if (tempImage) ctx.putImageData(tempImage, 0, 0);
             else if (historyStep === -1) saveHistory(); // Initial save
        }
    };

    const resizeObserver = new ResizeObserver(() => initCanvas());
    resizeObserver.observe(container);
    
    // Initial call
    initCanvas();

    return () => resizeObserver.disconnect();
  }, []);

  const saveHistory = useCallback(() => {
      const canvas = canvasRef.current;
      const ctx = canvas?.getContext('2d');
      if (!canvas || !ctx) return;

      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      setHistory(prev => {
          const newHistory = prev.slice(0, historyStep + 1);
          newHistory.push(imageData);
          if (newHistory.length > 20) newHistory.shift();
          return newHistory;
      });
      setHistoryStep(prev => Math.min(prev + 1, 19));
  }, [historyStep]);

  const handleUndo = () => {
      if (historyStep > 0) {
          const newStep = historyStep - 1;
          restoreHistory(newStep);
          setHistoryStep(newStep);
      }
  };

  const handleRedo = () => {
      if (historyStep < history.length - 1) {
          const newStep = historyStep + 1;
          restoreHistory(newStep);
          setHistoryStep(newStep);
      }
  };

  const restoreHistory = (step: number) => {
      const canvas = canvasRef.current;
      const ctx = canvas?.getContext('2d');
      if (!canvas || !ctx || !history[step]) return;
      ctx.putImageData(history[step], 0, 0);
  };

  // Keyboard Shortcuts for Undo/Redo
  useEffect(() => {
      const handleKeyDown = (e: KeyboardEvent) => {
          if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
              if (e.shiftKey) handleRedo();
              else handleUndo();
          }
      };
      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
  }, [historyStep, history]);

  // Handle Paste Events
  useEffect(() => {
      const handlePaste = (e: ClipboardEvent) => {
          if (!canDraw) return;
          const items = e.clipboardData?.items;
          if (!items) return;

          for (let i = 0; i < items.length; i++) {
              if (items[i].type.indexOf('image') !== -1) {
                  const blob = items[i].getAsFile();
                  if (blob) drawImageOnCanvas(blob);
              }
          }
      };

      window.addEventListener('paste', handlePaste);
      return () => window.removeEventListener('paste', handlePaste);
  }, [canDraw]);

  // Periodic capture for AI
  useEffect(() => {
     if (showQueryPopup || !isAIEnabled) return; 

     const interval = setInterval(() => {
         if (canvasRef.current) {
             const dataUrl = canvasRef.current.toDataURL('image/jpeg', 0.5);
             const base64 = dataUrl.split(',')[1];
             if (base64) onCapture(base64);
         }
     }, 2000); 
     return () => clearInterval(interval);
  }, [onCapture, showQueryPopup, isAIEnabled]);
  
  useEffect(() => {
      if (!canDraw && tool !== 'context') setTool('pen'); 
  }, [canDraw, tool]);

  const drawImageOnCanvas = (file: File) => {
      const reader = new FileReader();
      reader.onload = (event) => {
          const img = new Image();
          img.onload = () => {
              const canvas = canvasRef.current;
              const ctx = canvas?.getContext('2d');
              if (canvas && ctx) {
                  let w = img.width;
                  let h = img.height;
                  const maxWidth = canvas.width * 0.8;
                  const maxHeight = canvas.height * 0.8;
                  
                  if (w > maxWidth) { h = h * (maxWidth / w); w = maxWidth; }
                  if (h > maxHeight) { w = w * (maxHeight / h); h = maxHeight; }

                  const x = (canvas.width - w) / 2;
                  const y = (canvas.height - h) / 2;
                  
                  ctx.drawImage(img, x, y, w, h);
                  saveHistory();
              }
          };
          img.src = event.target?.result as string;
      };
      reader.readAsDataURL(file);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files[0]) {
          drawImageOnCanvas(e.target.files[0]);
      }
      if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const startAction = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!canDraw && tool !== 'context') return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    const { x, y } = getPos(e, canvas);

    if (tool === 'text') {
        setTextInput({ x, y, text: '' });
        return;
    }

    // Save snapshot for shapes/context
    setSnapshot(ctx.getImageData(0, 0, canvas.width, canvas.height));
    setStartPos({ x, y });
    setIsDrawing(true);

    if (tool === 'context') {
        if (showQueryPopup) {
            setShowQueryPopup(false); 
            setSelection({ start: null, current: null });
        }
        setSelection({ start: { x, y }, current: { x, y } });
    } else if (['pen', 'marker', 'highlighter', 'eraser'].includes(tool)) {
        ctx.beginPath();
        ctx.moveTo(x, y);
    }
  };

  const moveAction = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing || !startPos) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    const { x, y } = getPos(e, canvas);

    if (tool === 'context') {
        setSelection(prev => ({ ...prev, current: { x, y } }));
    } else if (['rect', 'circle', 'line'].includes(tool)) {
        // Restore background then draw shape
        if (snapshot) ctx.putImageData(snapshot, 0, 0);
        
        ctx.beginPath();
        ctx.strokeStyle = color;
        ctx.lineWidth = lineWidth;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        if (tool === 'rect') {
            ctx.strokeRect(startPos.x, startPos.y, x - startPos.x, y - startPos.y);
        } else if (tool === 'circle') {
            const radius = Math.sqrt(Math.pow(x - startPos.x, 2) + Math.pow(y - startPos.y, 2));
            ctx.beginPath();
            ctx.arc(startPos.x, startPos.y, radius, 0, 2 * Math.PI);
            ctx.stroke();
        } else if (tool === 'line') {
            ctx.beginPath();
            ctx.moveTo(startPos.x, startPos.y);
            ctx.lineTo(x, y);
            ctx.stroke();
        }

    } else {
        // Free drawing tools
        ctx.globalCompositeOperation = tool === 'eraser' ? 'destination-out' : 'source-over';
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        
        if (tool === 'highlighter') {
            ctx.strokeStyle = color;
            ctx.globalAlpha = 0.3; 
            ctx.lineWidth = 20;
        } else if (tool === 'marker') {
            ctx.strokeStyle = color;
            ctx.globalAlpha = 1.0;
            ctx.lineWidth = lineWidth * 3;
        } else if (tool === 'eraser') {
            ctx.lineWidth = 30;
            ctx.globalAlpha = 1.0;
        } else {
            ctx.strokeStyle = color;
            ctx.globalAlpha = 1.0;
            ctx.lineWidth = lineWidth;
        }

        ctx.lineTo(x, y);
        ctx.stroke();
        ctx.globalAlpha = 1.0;
        ctx.globalCompositeOperation = 'source-over';
    }
  };

  const endAction = () => {
    if (tool === 'context' && isDrawing && selection.start && selection.current) {
        setIsDrawing(false);
        const minX = Math.min(selection.start.x, selection.current.x);
        const maxY = Math.max(selection.start.y, selection.current.y);
        setPopupPos({ x: minX, y: maxY + 10 });
        setShowQueryPopup(true);
        setQueryText('');
    } else {
        if (isDrawing) saveHistory();
        setIsDrawing(false);
        setStartPos(null);
        setSnapshot(null);
        
        const canvas = canvasRef.current;
        const ctx = canvas?.getContext('2d');
        if (ctx) ctx.beginPath(); 
    }
  };

  const handleTextComplete = () => {
      if (!textInput || !textInput.text.trim()) {
          setTextInput(null);
          return;
      }
      
      const canvas = canvasRef.current;
      const ctx = canvas?.getContext('2d');
      if (canvas && ctx) {
          ctx.font = `${lineWidth * 5 + 12}px sans-serif`;
          ctx.fillStyle = color;
          ctx.fillText(textInput.text, textInput.x, textInput.y);
          saveHistory();
      }
      setTextInput(null);
  };

  const getPos = (e: React.MouseEvent | React.TouchEvent, canvas: HTMLCanvasElement) => {
    const rect = canvas.getBoundingClientRect();
    let clientX, clientY;
    
    if ('touches' in e) {
        clientX = e.touches[0].clientX;
        clientY = e.touches[0].clientY;
    } else {
        clientX = (e as React.MouseEvent).clientX;
        clientY = (e as React.MouseEvent).clientY;
    }
    return {
        x: clientX - rect.left,
        y: clientY - rect.top
    };
  };

  const clearBoard = () => {
      if (!canDraw) return;
      const canvas = canvasRef.current;
      const ctx = canvas?.getContext('2d');
      if (canvas && ctx) {
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          saveHistory();
      }
      setShowQueryPopup(false);
      setSelection({ start: null, current: null });
  };

  const handleQuerySubmit = (e: React.FormEvent) => {
      e.preventDefault();
      if (!queryText.trim() || !canvasRef.current) return;
      const dataUrl = canvasRef.current.toDataURL('image/jpeg', 0.8);
      const base64 = dataUrl.split(',')[1];
      onContextQuery?.(queryText, base64);
      setShowQueryPopup(false);
      setSelection({ start: null, current: null });
  };

  return (
    <div className="flex flex-col h-full bg-white rounded-xl overflow-hidden shadow-xl border border-gray-300 relative group">
      
      {/* Toolbar */}
      <div className="h-16 bg-gray-50 border-b flex items-center justify-between px-4 z-10 overflow-x-auto no-scrollbar gap-4 shrink-0">
         
         <div className="flex items-center gap-2 shrink-0">
             <span className="font-bold text-gray-700 hidden md:block">Whiteboard</span>
             {!canDraw && (
                 <span className="bg-gray-200 text-gray-600 text-xs px-2 py-1 rounded">Read Only</span>
             )}
         </div>

         {canDraw && (
             <div className="flex items-center gap-3">
                <div className="flex bg-white p-1 rounded-lg border shadow-sm">
                    {/* Drawing Tools */}
                    {[
                        { t: 'pen', Icon: Pen, label: 'Pen' },
                        { t: 'marker', Icon: PenTool, label: 'Marker' },
                        { t: 'highlighter', Icon: Highlighter, label: 'Highlight' },
                        { t: 'eraser', Icon: Eraser, label: 'Erase' }
                    ].map(item => (
                        <button 
                            key={item.t}
                            onClick={() => setTool(item.t as ToolType)}
                            className={`p-2 rounded transition-colors ${tool === item.t ? 'bg-blue-100 text-blue-600' : 'text-gray-600 hover:bg-gray-100'}`}
                            title={item.label}
                        >
                            <item.Icon size={18} />
                        </button>
                    ))}
                    
                    {/* Separator */}
                    <div className="w-px h-6 bg-gray-200 mx-1 self-center"></div>

                    {/* Shape Tools */}
                    {[
                         { t: 'rect', Icon: Square, label: 'Rectangle' },
                         { t: 'circle', Icon: CircleIcon, label: 'Circle' },
                         { t: 'line', Icon: Minus, label: 'Line' },
                         { t: 'text', Icon: Type, label: 'Text' }
                    ].map(item => (
                        <button 
                            key={item.t}
                            onClick={() => setTool(item.t as ToolType)}
                            className={`p-2 rounded transition-colors ${tool === item.t ? 'bg-blue-100 text-blue-600' : 'text-gray-600 hover:bg-gray-100'}`}
                            title={item.label}
                        >
                            <item.Icon size={18} />
                        </button>
                    ))}
                </div>
                
                {/* Colors */}
                <div className="flex items-center gap-1 bg-white p-1 rounded-lg border shadow-sm">
                    {COLORS.map(c => (
                        <button
                            key={c}
                            onClick={() => setColor(c)}
                            className={`w-6 h-6 rounded-full border border-gray-200 transition-transform ${color === c ? 'scale-110 ring-2 ring-blue-400' : 'hover:scale-105'}`}
                            style={{ backgroundColor: c }}
                        />
                    ))}
                    <div className="w-px h-6 bg-gray-200 mx-1"></div>
                    <input 
                        type="range" 
                        min="1" max="20" 
                        value={lineWidth} 
                        onChange={(e) => setLineWidth(Number(e.target.value))}
                        className="w-16 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                        title="Stroke Size"
                    />
                </div>

                {/* Undo/Redo */}
                <div className="flex bg-white p-1 rounded-lg border shadow-sm">
                    <button 
                        onClick={handleUndo} 
                        disabled={historyStep <= 0}
                        className="p-2 text-gray-600 hover:bg-gray-100 rounded disabled:opacity-30"
                        title="Undo (Ctrl+Z)"
                    >
                        <Undo size={18} />
                    </button>
                    <button 
                        onClick={handleRedo}
                        disabled={historyStep >= history.length - 1}
                        className="p-2 text-gray-600 hover:bg-gray-100 rounded disabled:opacity-30"
                        title="Redo (Ctrl+Shift+Z)"
                    >
                        <Redo size={18} />
                    </button>
                </div>

                {/* Actions */}
                <div className="flex bg-white p-1 rounded-lg border shadow-sm">
                    <input 
                        type="file" 
                        ref={fileInputRef} 
                        onChange={handleFileUpload} 
                        accept="image/*" 
                        className="hidden" 
                    />
                    <button 
                        onClick={() => fileInputRef.current?.click()}
                        className="p-2 text-gray-600 hover:bg-gray-100 rounded"
                        title="Upload Image"
                    >
                        <Upload size={18} />
                    </button>
                    {isAIEnabled && (
                        <button 
                            onClick={() => setTool('context')}
                            className={`p-2 rounded ${tool === 'context' ? 'bg-purple-100 text-purple-600' : 'text-gray-600 hover:bg-gray-100'}`}
                            title="Ask AI (Select Area)"
                        >
                            <ScanSearch size={18} />
                        </button>
                    )}
                    <button 
                        onClick={clearBoard} 
                        className="p-2 text-red-500 hover:bg-red-50 rounded"
                        title="Clear Board"
                    >
                        <Trash2 size={18} />
                    </button>
                </div>
             </div>
         )}
      </div>
      
      {/* Canvas Area */}
      <div className="flex-1 relative cursor-crosshair overflow-hidden bg-white" ref={containerRef}>
        <canvas
            ref={canvasRef}
            onMouseDown={startAction}
            onMouseMove={moveAction}
            onMouseUp={endAction}
            onMouseLeave={endAction}
            onTouchStart={startAction}
            onTouchMove={moveAction}
            onTouchEnd={endAction}
            className={`absolute top-0 left-0 w-full h-full touch-none ${
                !canDraw ? 'cursor-default' :
                tool === 'context' ? 'cursor-help' : 
                tool === 'text' ? 'cursor-text' :
                tool === 'eraser' ? 'cursor-cell' : 'cursor-crosshair'
            }`}
        />
        
        {/* Helper text for empty whiteboard */}
        {canDraw && history.length <= 1 && tool !== 'context' && !isDrawing && !textInput && (
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-gray-300 text-2xl font-bold pointer-events-none select-none">
                Start Drawing
            </div>
        )}

        {/* Text Input Overlay */}
        {textInput && (
            <input
                autoFocus
                type="text"
                value={textInput.text}
                onChange={(e) => setTextInput({ ...textInput, text: e.target.value })}
                onKeyDown={(e) => { if(e.key === 'Enter') handleTextComplete(); }}
                onBlur={handleTextComplete}
                className="absolute bg-transparent border border-blue-400 outline-none p-0 m-0"
                style={{
                    left: textInput.x,
                    top: textInput.y - (lineWidth * 5 + 12),
                    font: `${lineWidth * 5 + 12}px sans-serif`,
                    color: color,
                    minWidth: '50px'
                }}
            />
        )}

        {/* Selection Overlay */}
        {tool === 'context' && selection.start && selection.current && (
            <div 
                className="absolute border-2 border-purple-500 bg-purple-500/10 pointer-events-none"
                style={{
                    left: Math.min(selection.start.x, selection.current.x),
                    top: Math.min(selection.start.y, selection.current.y),
                    width: Math.abs(selection.current.x - selection.start.x),
                    height: Math.abs(selection.current.y - selection.start.y),
                }}
            />
        )}

        {/* Smart Query Popup */}
        {showQueryPopup && isAIEnabled && (
            <div 
                className="absolute bg-white rounded-lg shadow-2xl border border-gray-200 p-3 w-72 animate-fadeIn z-20"
                style={{
                    left: Math.min(Math.max(10, popupPos.x), (containerRef.current?.offsetWidth || 300) - 300), 
                    top: Math.min(Math.max(10, popupPos.y), (containerRef.current?.offsetHeight || 300) - 100)
                }}
            >
                <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-semibold text-purple-700 flex items-center gap-1">
                        <ScanSearch size={14} />
                        Ask AI about this
                    </span>
                    <button onClick={() => { setShowQueryPopup(false); setSelection({start:null, current:null}); }} className="text-gray-400 hover:text-gray-600">
                        <X size={16} />
                    </button>
                </div>
                <form onSubmit={handleQuerySubmit} className="flex flex-col gap-2">
                    <input 
                        type="text" 
                        value={queryText}
                        onChange={(e) => setQueryText(e.target.value)}
                        placeholder="e.g., Explain this formula..."
                        className="w-full text-sm border rounded p-2 focus:ring-2 focus:ring-purple-200 outline-none text-gray-800"
                        autoFocus
                    />
                    <button 
                        type="submit" 
                        className="bg-purple-600 hover:bg-purple-700 text-white text-xs font-medium py-2 rounded flex items-center justify-center gap-2 transition-colors"
                    >
                        Ask Professor <Send size={12} />
                    </button>
                </form>
            </div>
        )}
      </div>
    </div>
  );
};