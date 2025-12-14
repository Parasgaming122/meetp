import React, { useRef, useEffect, useState } from 'react';
import { Eraser, Pen, Download, Trash2, ScanSearch, Send, X } from 'lucide-react';

interface WhiteboardProps {
    onCapture: (imageData: string) => void;
    onContextQuery?: (query: string, imageData: string) => void;
    isAIEnabled: boolean;
}

export const Whiteboard: React.FC<WhiteboardProps> = ({ onCapture, onContextQuery, isAIEnabled }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  
  const [isDrawing, setIsDrawing] = useState(false);
  const [color, setColor] = useState('#000000');
  const [lineWidth, setLineWidth] = useState(2);
  const [tool, setTool] = useState<'pen' | 'eraser' | 'context'>('pen');

  // Context Selection State
  const [selection, setSelection] = useState<{start: {x:number, y:number} | null, current: {x:number, y:number} | null}>({ start: null, current: null });
  const [showQueryPopup, setShowQueryPopup] = useState(false);
  const [queryText, setQueryText] = useState('');
  const [popupPos, setPopupPos] = useState({ x: 0, y: 0 });

  // Initialize canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set initial size
    canvas.width = container.offsetWidth;
    canvas.height = container.offsetHeight;
    
    // Fill white background
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Handle resizing
    const handleResize = () => {
        const imageData = ctx.getImageData(0,0, canvas.width, canvas.height);
        canvas.width = container.offsetWidth;
        canvas.height = container.offsetHeight;
        ctx.putImageData(imageData, 0, 0);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Periodic capture for AI (Only if no popup is open to avoid stutter)
  useEffect(() => {
     if (showQueryPopup || !isAIEnabled) return; 

     const interval = setInterval(() => {
         if (canvasRef.current) {
             const dataUrl = canvasRef.current.toDataURL('image/jpeg', 0.5);
             const base64 = dataUrl.split(',')[1];
             if (base64) onCapture(base64);
         }
     }, 2000); // Send frame every 2s
     return () => clearInterval(interval);
  }, [onCapture, showQueryPopup, isAIEnabled]);
  
  // Reset tool if AI is disabled while using Smart Select
  useEffect(() => {
      if (!isAIEnabled && tool === 'context') {
          setTool('pen');
          setShowQueryPopup(false);
          setSelection({ start: null, current: null });
      }
  }, [isAIEnabled, tool]);

  const startAction = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const { x, y } = getPos(e, canvas);

    if (tool === 'context') {
        if (showQueryPopup) {
            setShowQueryPopup(false); // Close existing popup if clicking elsewhere
            setSelection({ start: null, current: null });
        }
        setIsDrawing(true); // Reusing isDrawing for "isSelecting"
        setSelection({ start: { x, y }, current: { x, y } });
    } else {
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        setIsDrawing(true);
        ctx.beginPath();
        ctx.moveTo(x, y);
    }
  };

  const moveAction = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const { x, y } = getPos(e, canvas);

    if (tool === 'context') {
        setSelection(prev => ({ ...prev, current: { x, y } }));
    } else {
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        ctx.lineTo(x, y);
        ctx.strokeStyle = tool === 'eraser' ? '#ffffff' : color;
        ctx.lineWidth = tool === 'eraser' ? 20 : lineWidth;
        ctx.lineCap = 'round';
        ctx.stroke();
    }
  };

  const endAction = () => {
    if (tool === 'context' && isDrawing && selection.start && selection.current) {
        // Finalize selection
        setIsDrawing(false);
        // Calculate bounds to position popup
        const minX = Math.min(selection.start.x, selection.current.x);
        const maxY = Math.max(selection.start.y, selection.current.y);
        
        // Show popup
        setPopupPos({ x: minX, y: maxY + 10 });
        setShowQueryPopup(true);
        setQueryText('');
    } else {
        setIsDrawing(false);
    }
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
      const canvas = canvasRef.current;
      const ctx = canvas?.getContext('2d');
      if (canvas && ctx) {
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(0, 0, canvas.width, canvas.height);
      }
      setShowQueryPopup(false);
      setSelection({ start: null, current: null });
  };

  const handleQuerySubmit = (e: React.FormEvent) => {
      e.preventDefault();
      if (!queryText.trim() || !canvasRef.current) return;

      // Capture current state
      const dataUrl = canvasRef.current.toDataURL('image/jpeg', 0.8);
      const base64 = dataUrl.split(',')[1];
      
      onContextQuery?.(queryText, base64);
      
      // Reset UI
      setShowQueryPopup(false);
      setSelection({ start: null, current: null });
  };

  return (
    <div className="flex flex-col h-full bg-white rounded-xl overflow-hidden shadow-xl border border-gray-300 relative">
      <div className="h-14 bg-gray-100 border-b flex items-center justify-between px-4 z-10">
         <div className="flex items-center gap-2">
             <span className="font-bold text-gray-700">Class Whiteboard</span>
         </div>
         
         <div className="flex items-center gap-2 bg-white p-1 rounded-lg border shadow-sm">
             <button 
                onClick={() => setTool('pen')}
                className={`p-2 rounded ${tool === 'pen' ? 'bg-blue-100 text-blue-600' : 'text-gray-600 hover:bg-gray-100'}`}
                title="Pen"
             >
                 <Pen size={18} />
             </button>
             <button 
                onClick={() => setTool('eraser')}
                className={`p-2 rounded ${tool === 'eraser' ? 'bg-blue-100 text-blue-600' : 'text-gray-600 hover:bg-gray-100'}`}
                title="Eraser"
             >
                 <Eraser size={18} />
             </button>
             
             {isAIEnabled && (
                 <>
                    <div className="w-px h-6 bg-gray-300 mx-1"></div>
                    <button 
                        onClick={() => setTool('context')}
                        className={`p-2 rounded flex items-center gap-2 ${tool === 'context' ? 'bg-purple-100 text-purple-600' : 'text-gray-600 hover:bg-gray-100'}`}
                        title="Ask AI about a specific area"
                    >
                        <ScanSearch size={18} />
                        <span className="text-xs font-medium">Smart Select</span>
                    </button>
                 </>
             )}

             <div className="w-px h-6 bg-gray-300 mx-1"></div>
             <input 
                type="color" 
                value={color} 
                onChange={(e) => setColor(e.target.value)}
                className="w-8 h-8 rounded cursor-pointer"
             />
         </div>

         <button onClick={clearBoard} className="p-2 text-red-500 hover:bg-red-50 rounded">
             <Trash2 size={20} />
         </button>
      </div>
      
      <div className="flex-1 relative cursor-crosshair overflow-hidden" ref={containerRef}>
        <canvas
            ref={canvasRef}
            onMouseDown={startAction}
            onMouseMove={moveAction}
            onMouseUp={endAction}
            onMouseLeave={endAction}
            onTouchStart={startAction}
            onTouchMove={moveAction}
            onTouchEnd={endAction}
            className={`absolute top-0 left-0 w-full h-full touch-none ${tool === 'context' ? 'cursor-cell' : 'cursor-crosshair'}`}
        />

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