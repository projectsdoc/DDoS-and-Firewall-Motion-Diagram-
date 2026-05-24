import React, { useRef, useEffect, useState, useMemo } from 'react';
import { DiagramNode, DiagramEdge, DiagramPacketState } from '../types';
import { Video, Square, Grid, Activity, Layers, Sparkles, RefreshCw, ZoomIn, ZoomOut, Settings, MousePointer, Move, Eye, EyeOff } from 'lucide-react';

interface NetworkCanvasProps {
  nodes: DiagramNode[];
  edges: DiagramEdge[];
  packets: { from: string; to: string; label: string; color?: string; speed?: number }[];
  selectedNodeId: string | null;
  onSelectNode: (node: DiagramNode) => void;
  onUpdateNodePosition: (nodeId: string, x: number, y: number) => void;
  layoutMode: 'horizontal' | 'vertical' | 'distributed';
  onLayoutModeChange: (mode: 'horizontal' | 'vertical' | 'distributed') => void;
  globalSpeed: number;
  onGlobalSpeedChange: (speed: number) => void;
  onUpdateNode?: (updated: DiagramNode) => void;
  rawPromptText?: string;
}

const PALETTE_COLORS = [
  { hex: '#38bdf8', name: 'Sky Cyan' },
  { hex: '#a78bfa', name: 'Purple Rack' },
  { hex: '#f43f5e', name: 'Rose Petal' },
  { hex: '#34d399', name: 'Emerald' },
  { hex: '#fb923c', name: 'Orange Gateway' },
  { hex: '#eab308', name: 'Amber Yellow' },
  { hex: '#ef4444', name: 'Alert Red' },
  { hex: '#ffffff', name: 'Core White' },
];

const UNICODE_CIRCLES = ['①', '②', '③', '④', '⑤', '⑥', '⑦', '⑧', '⑨', '⑩', '⑪', '⑫', '⑬', '⑭', '⑮'];

export const NetworkCanvas: React.FC<NetworkCanvasProps> = ({
  nodes,
  edges,
  packets,
  selectedNodeId,
  onSelectNode,
  onUpdateNodePosition,
  layoutMode,
  onLayoutModeChange,
  globalSpeed,
  onGlobalSpeedChange,
  onUpdateNode,
  rawPromptText,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Pan and zoom states
  const [zoom, setZoom] = useState<number>(1.0);
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  // Mode Selection: Drag nodes manually versus Move/Pan general workbench board
  const [interactionMode, setInteractionMode] = useState<'drag' | 'move'>('drag');

  // Distraction-free Focus / Simplified Arena View
  const [isSimplifiedView, setIsSimplifiedView] = useState<boolean>(false);

  const zoomRef = useRef<number>(1.0);
  const prevZoomRef = useRef<number>(1.0);

  // Sync refs to keep the wheel listener clean and avoid re-binding
  useEffect(() => {
    zoomRef.current = zoom;
    prevZoomRef.current = zoom;
  }, [zoom]);

  // Drag state trackers
  const [draggedNodeId, setDraggedNodeId] = useState<string | null>(null);
  const dragOffset = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  // Pan state trackers
  const isPanningRef = useRef<boolean>(false);
  const panStartRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const initialPanRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  // In-flight packets animation state
  const packetsStateRef = useRef<DiagramPacketState[]>([]);
  const waveRadiusRef = useRef<number>(0);
  const blinkCounterRef = useRef<number>(0);
  const particlesRef = useRef<{ x: number; y: number; vx: number; vy: number; age: number; maxAge: number; color: string; size: number; type: 'smoke' | 'fire' | 'spark' }[]>([]);

  // Queue tracking state
  const activePacketIndexRef = useRef<number>(0);
  const [currentActivePacketIndex, setCurrentActivePacketIndex] = useState<number>(0);

  // Media Capture state
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [recordedSeconds, setRecordedSeconds] = useState<number>(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);
  const isCurrentlyRecordingRef = useRef<boolean>(false);
  const recordingStartTimeRef = useRef<number>(0);
  const stepTrackerSetRef = useRef<Set<number>>(new Set());
  const stepsCompletedDuringRecordingRef = useRef<number>(0);
  const hasScheduledStopRef = useRef<boolean>(false);

  // Position style for floating parameters overlay to prevent blocking the selected node
  const [panelStyles, setPanelStyles] = useState<React.CSSProperties>({
    right: '16px',
    top: '16px',
  });
  const [isPanelMinimized, setIsPanelMinimized] = useState<boolean>(false);

  // Explicit parameters panel dragging coordinates and interactions to handle custom layouts
  const [panelPos, setPanelPos] = useState<{ x: number, y: number } | null>(null);
  const dragStartOffsetRef = useRef<{ x: number, y: number }>({ x: 0, y: 0 });
  const isDraggingPanelRef = useRef<boolean>(false);

  // When selectedNodeId changes, reset custom dragged positions so it computes opposite-side placement nicely for the new node
  useEffect(() => {
    setPanelPos(null);
  }, [selectedNodeId]);

  // Global window listeners for the parameters edit pop-up dragging actions
  useEffect(() => {
    const handleGlobalMove = (e: MouseEvent | TouchEvent) => {
      if (!isDraggingPanelRef.current || !containerRef.current) return;

      // Prevent page-level scroll, bounce, or zoom during parameter panel drag
      if (e.cancelable) {
        e.preventDefault();
      }

      const clientX = 'touches' in e ? (e as TouchEvent).touches[0].clientX : (e as MouseEvent).clientX;
      const clientY = 'touches' in e ? (e as TouchEvent).touches[0].clientY : (e as MouseEvent).clientY;

      const containerRect = containerRef.current.getBoundingClientRect();
      
      let newX = clientX - containerRect.left - dragStartOffsetRef.current.x;
      let newY = clientY - containerRect.top - dragStartOffsetRef.current.y;

      // Keep inside container with small-small panel bounds: width = 224 (w-56), height = ~180 depending on minimize state
      const panelWidth = 224; // matches w-56
      const panelHeight = isPanelMinimized ? 38 : 195;
      const maxX = containerRect.width - panelWidth;
      const maxY = containerRect.height - panelHeight;

      newX = Math.max(8, Math.min(newX, maxX - 8));
      newY = Math.max(8, Math.min(newY, maxY - 8));

      setPanelPos({ x: newX, y: newY });
    };

    const handleGlobalEnd = () => {
      isDraggingPanelRef.current = false;
    };

    window.addEventListener('mousemove', handleGlobalMove);
    window.addEventListener('mouseup', handleGlobalEnd);
    window.addEventListener('touchmove', handleGlobalMove, { passive: false });
    window.addEventListener('touchend', handleGlobalEnd);

    return () => {
      window.removeEventListener('mousemove', handleGlobalMove);
      window.removeEventListener('mouseup', handleGlobalEnd);
      window.removeEventListener('touchmove', handleGlobalMove);
      window.removeEventListener('touchend', handleGlobalEnd);
    };
  }, [isPanelMinimized]);

  // Combined draggable panel styles helper mapping absolute positions with fallback coordinates
  const finalPanelStyles = useMemo<React.CSSProperties>(() => {
    if (panelPos) {
      return {
        position: 'absolute',
        zIndex: 100,
        left: `${panelPos.x}px`,
        top: `${panelPos.y}px`,
      };
    }
    return panelStyles;
  }, [panelPos, panelStyles]);

  // Start drag handler bound to panel interaction points
  const handlePanelDragStart = (e: React.MouseEvent<HTMLDivElement> | React.TouchEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement;
    // Do not initiate panel drag when clicking buttons, inputs, presets or labels
    if (
      target.closest('button') || 
      target.closest('input') || 
      target.closest('select') || 
      target.classList.contains('cursor-pointer')
    ) {
      return;
    }

    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

    const panelEl = target.closest('.draggable-panel') as HTMLDivElement;
    if (!panelEl) return;

    const rect = panelEl.getBoundingClientRect();
    dragStartOffsetRef.current = {
      x: clientX - rect.left,
      y: clientY - rect.top,
    };
    isDraggingPanelRef.current = true;
    
    // Prevent default and stop propagation key touch gestures from scrolling the background window
    if ('touches' in e && e.cancelable) {
      e.preventDefault();
    }
    e.stopPropagation();
  };

  // Mutable dynamic speed pointer to avoid tearing loops
  const globalSpeedRef = useRef<number>(1.0);
  useEffect(() => { globalSpeedRef.current = globalSpeed; }, [globalSpeed]);

  // Keep packets updated when incoming list updates
  useEffect(() => {
    const nextPackets: DiagramPacketState[] = [];
    packets.forEach((p, idx) => {
      nextPackets.push({
        id: `p_${idx}_${Date.now()}`,
        from: p.from,
        to: p.to,
        label: p.label,
        progress: 0.0, 
        speed: p.speed || 0.010 + Math.random() * 0.005, 
        color: p.color || '#38bdf8',
        size: 7,
        isContinuous: (p as any).isContinuous,
        isLightOrb: (p as any).isLightOrb,
      });
    });
    packetsStateRef.current = nextPackets;
    activePacketIndexRef.current = 0;
    setCurrentActivePacketIndex(0);
  }, [packets]);

  // Handle Canvas Resizing
  useEffect(() => {
    const handleResize = () => {
      if (canvasRef.current && containerRef.current) {
        canvasRef.current.width = containerRef.current.clientWidth;
        canvasRef.current.height = containerRef.current.clientHeight;
      }
    };
    handleResize();
    window.addEventListener('resize', handleResize);

    const resizeObserver = new ResizeObserver(() => handleResize());
    if (containerRef.current) {
      resizeObserver.observe(containerRef.current);
    }

    return () => {
      window.removeEventListener('resize', handleResize);
      resizeObserver.disconnect();
    };
  }, []);

  // Touch event binding with passive: false to guarantee page never scrolls/drags while working inside the canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const preventDefaultTouch = (e: TouchEvent) => {
      // If user is operating on the canvas, prevent browser default scroll or bounce actions
      e.preventDefault();
    };

    canvas.addEventListener('touchstart', preventDefaultTouch, { passive: false });
    canvas.addEventListener('touchmove', preventDefaultTouch, { passive: false });

    return () => {
      canvas.removeEventListener('touchstart', preventDefaultTouch);
      canvas.removeEventListener('touchmove', preventDefaultTouch);
    };
  }, []);

  // Compute dynamic floating parameters card position on the opposite side of screen to avoid blocking the selected component
  useEffect(() => {
    if (!selectedNodeId || !canvasRef.current) return;
    const selectedNode = nodes.find((n) => n.id === selectedNodeId);
    if (!selectedNode) return;

    const w = canvasRef.current.width || 800;
    const h = canvasRef.current.height || 600;
    const coords = getCoordinates(selectedNode, w, h);

    // Dynamic scale projection to find where the node is situated on the client's screen viewport right now
    const screenX = coords.x * zoom + pan.x;
    const screenY = coords.y * zoom + pan.y;

    // Is the element on the right side of the whiteboard screen?
    const isRightHalf = screenX > w / 2;
    // Is the element on the bottom half of the whiteboard screen?
    const isBottomHalf = screenY > h / 2;

    const newStyles: React.CSSProperties = {
      position: 'absolute',
      zIndex: 20,
    };

    // Position opposite to where the node sits to ensure total visibility of the node & connections is preserved
    if (isRightHalf) {
      newStyles.left = '16px';
      newStyles.right = 'auto';
    } else {
      newStyles.left = 'auto';
      newStyles.right = '16px';
    }

    if (isBottomHalf) {
      newStyles.top = '16px';
      newStyles.bottom = 'auto';
    } else {
      newStyles.top = 'auto';
      newStyles.bottom = '16px';
    }

    setPanelStyles(newStyles);
  }, [selectedNodeId, nodes, zoom, pan]);

  // Listen for non-passive Mouse Wheel Events
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const onWheelRaw = (e: WheelEvent) => {
      e.preventDefault();
      const rect = canvas.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;

      const zoomFactor = 1.06;
      const nextZoom = e.deltaY < 0
        ? Math.min(3.0, zoomRef.current * zoomFactor)
        : Math.max(0.4, zoomRef.current / zoomFactor);

      setPan((prev) => ({
        x: mouseX - (mouseX - prev.x) * (nextZoom / zoomRef.current),
        y: mouseY - (mouseY - prev.y) * (nextZoom / zoomRef.current),
      }));
      setZoom(nextZoom);
    };

    canvas.addEventListener('wheel', onWheelRaw, { passive: false });
    return () => {
      canvas.removeEventListener('wheel', onWheelRaw);
    };
  }, []);

  // Helper vectors to translate percentage x/y into accurate pixel coords
  const getCoordinates = (n: DiagramNode, width: number, height: number) => {
    return {
      x: (n.x / 100) * width,
      y: (n.y / 100) * height,
    };
  };

  const getPacketProperty = (p: DiagramPacketState, fromNode?: DiagramNode): 'Malicious' | 'Secure' | 'Encrypted' | 'Valid' | 'Decrypted' => {
    if (p.property) return p.property;
    const labelLower = (p.label || '').toLowerCase();
    const fromLabel = fromNode ? fromNode.label.toLowerCase() : '';
    if (
      labelLower.includes('malicious') ||
      labelLower.includes('threat') ||
      labelLower.includes('attack') ||
      labelLower.includes('exploit') ||
      labelLower.includes('payload') ||
      labelLower.includes('flood') ||
      labelLower.includes('ddos') ||
      fromLabel.includes('attacker') ||
      fromLabel.includes('hacker') ||
      fromLabel.includes('bot')
    ) {
      return 'Malicious';
    }
    if (
      labelLower.includes('encrypt') ||
      labelLower.includes('cipher') ||
      labelLower.includes('tls') ||
      labelLower.includes('ssl') ||
      labelLower.includes('ssh') ||
      labelLower.includes('token') ||
      labelLower.includes('lock') ||
      labelLower.includes('handshake')
    ) {
      return 'Encrypted';
    }
    if (
      labelLower.includes('secure') ||
      labelLower.includes('auth') ||
      labelLower.includes('cert') ||
      labelLower.includes('valid') ||
      labelLower.includes('approved') ||
      labelLower.includes('payment')
    ) {
      return 'Secure';
    }
    return 'Valid';
  };

  const draw3DPackageIcon = (
    ctx: CanvasRenderingContext2D,
    cx: number,
    cy: number,
    size: number,
    property: 'Malicious' | 'Secure' | 'Encrypted' | 'Valid' | 'Decrypted'
  ) => {
    const h = size * 1.5; // taller 3D box
    const w = size * 2.0; // wider 3D box

    // Set colors based on property
    let baseCardboardTop = '#fbbf24';  // light cardboard
    let baseCardboardLeft = '#d97706'; // medium cardboard
    let baseCardboardRight = '#b45309'; // dark cardboard
    let accentColor = '#10b981'; // Green
    let emojiBadge = '📦';
    
    if (property === 'Malicious') {
      baseCardboardTop = '#f87171';
      baseCardboardLeft = '#dc2626';
      baseCardboardRight = '#991b1b';
      accentColor = '#ef4444'; // Red
      emojiBadge = '⚠️';
    } else if (property === 'Encrypted') {
      baseCardboardTop = '#60a5fa';
      baseCardboardLeft = '#2563eb';
      baseCardboardRight = '#1d4ed8';
      accentColor = '#3b82f6'; // Blue
      emojiBadge = '🔒';
    } else if (property === 'Secure') {
      baseCardboardTop = '#34d399';
      baseCardboardLeft = '#059669';
      baseCardboardRight = '#047857';
      accentColor = '#10b981'; // Green check
      emojiBadge = '🛡️';
    } else if (property === 'Decrypted') {
      baseCardboardTop = '#22d3ee';
      baseCardboardLeft = '#0891b2';
      baseCardboardRight = '#0e7490';
      accentColor = '#06b6d4'; // Cyan unlocked
      emojiBadge = '🔓';
    }

    ctx.save();
    
    // 1. Draw dynamic connection ambient aura glow
    ctx.shadowBlur = size * 1.5;
    ctx.shadowColor = accentColor;
    ctx.fillStyle = 'rgba(2, 6, 23, 0.4)';
    ctx.beginPath();
    ctx.ellipse(cx, cy + h * 0.1, w * 0.7, h * 0.35, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0; // reset shadow for box painting

    // 2. Isometric Top Face
    ctx.beginPath();
    ctx.moveTo(cx, cy - h * 0.4);
    ctx.lineTo(cx + w * 0.5, cy - h * 0.15);
    ctx.lineTo(cx, cy + h * 0.1);
    ctx.lineTo(cx - w * 0.5, cy - h * 0.15);
    ctx.closePath();
    ctx.fillStyle = baseCardboardTop;
    ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,0.45)';
    ctx.lineWidth = 1;
    ctx.stroke();

    // 3. Isometric Left Face
    ctx.beginPath();
    ctx.moveTo(cx - w * 0.5, cy - h * 0.15);
    ctx.lineTo(cx, cy + h * 0.1);
    ctx.lineTo(cx, cy + h * 0.5);
    ctx.lineTo(cx - w * 0.5, cy + h * 0.25);
    ctx.closePath();
    ctx.fillStyle = baseCardboardLeft;
    ctx.fill();
    ctx.stroke();

    // 4. Isometric Right Face
    ctx.beginPath();
    ctx.moveTo(cx, cy + h * 0.1);
    ctx.lineTo(cx + w * 0.5, cy - h * 0.15);
    ctx.lineTo(cx + w * 0.5, cy + h * 0.25);
    ctx.lineTo(cx, cy + h * 0.5);
    ctx.closePath();
    ctx.fillStyle = baseCardboardRight;
    ctx.fill();
    ctx.stroke();

    // 5. Cardboard center packing tape tape
    ctx.beginPath();
    ctx.moveTo(cx, cy - h * 0.4);
    ctx.lineTo(cx, cy + h * 0.1);
    ctx.strokeStyle = 'rgba(30,10,0,0.4)';
    ctx.lineWidth = 3;
    ctx.stroke();

    // 6. Glowing indicator ring around package
    ctx.beginPath();
    ctx.ellipse(cx, cy + h * 0.12, w * 0.75, h * 0.38, 0, 0, Math.PI * 2);
    ctx.strokeStyle = accentColor;
    ctx.lineWidth = 1.5;
    ctx.setLineDash([4, 4]);
    ctx.stroke();

    // 7. Small floating badge/seal centered in box
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 9px Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(emojiBadge, cx, cy - h * 0.12);

    ctx.restore();
  };

  // Drag, Pan and Select Interactions
  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;

    const width = canvas.width;
    const height = canvas.height;

    // Convert screen pointer click back to logical whiteboard arena coordinates
    const logicX = (clickX - pan.x) / zoom;
    const logicY = (clickY - pan.y) / zoom;

    let clickedNode: DiagramNode | null = null;

    // Search backwards for top-most elements
    for (let i = nodes.length - 1; i >= 0; i--) {
      const node = nodes[i];
      const coords = getCoordinates(node, width, height);
      const nodeSize = node.size || 35;
      const ratio = nodeSize / 35;
      const hitRadius = 36 * ratio;

      const dx = logicX - coords.x;
      const dy = logicY - coords.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist <= hitRadius) {
        clickedNode = node;
        break;
      }
    }

    if (interactionMode === 'drag' && clickedNode) {
      setDraggedNodeId(clickedNode.id);
      onSelectNode(clickedNode);
      const coords = getCoordinates(clickedNode, width, height);
      dragOffset.current = {
        x: logicX - coords.x,
        y: logicY - coords.y,
      };
    } else {
      // Empty background clicked, or 'move' mode active: engage full canvas workspace panning mode
      isPanningRef.current = true;
      panStartRef.current = { x: e.clientX, y: e.clientY };
      initialPanRef.current = { ...pan };
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    const width = canvas.width;
    const height = canvas.height;

    if (draggedNodeId) {
      // Logic space projection mapping
      const logicX = (mouseX - pan.x) / zoom;
      const logicY = (mouseY - pan.y) / zoom;

      const targetLogicX = logicX - dragOffset.current.x;
      const targetLogicY = logicY - dragOffset.current.y;

      const percentX = (targetLogicX / width) * 100;
      const percentY = (targetLogicY / height) * 100;

      const boundedX = Math.min(95, Math.max(5, percentX));
      const boundedY = Math.min(93, Math.max(7, percentY));

      onUpdateNodePosition(draggedNodeId, boundedX, boundedY);
    } else if (isPanningRef.current) {
      const dx = e.clientX - panStartRef.current.x;
      const dy = e.clientY - panStartRef.current.y;
      
      // Prevent canvas from being panned too far away out of sight
      const maxPanX = width * 1.5;
      const maxPanY = height * 1.5;
      setPan({
        x: Math.min(maxPanX, Math.max(-maxPanX, initialPanRef.current.x + dx)),
        y: Math.min(maxPanY, Math.max(-maxPanY, initialPanRef.current.y + dy)),
      });
    }
  };

  const handleMouseUp = () => {
    setDraggedNodeId(null);
    isPanningRef.current = false;
  };

  // Recording timer increment effects containing safe automatic fallback halts
  useEffect(() => {
    let interval: any;
    if (isRecording) {
      interval = setInterval(() => {
        setRecordedSeconds((prev) => {
          // If there are no packet pathways, record for 4 seconds then stop
          if (packetsStateRef.current.length === 0 && prev >= 4) {
            stopRecording();
            return prev;
          }
          // Absolute safety cap of 15 seconds so we don't blow up raw memory
          if (prev >= 15) {
            stopRecording();
            return prev;
          }
          return prev + 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isRecording]);

  // Video capture methods prioritizing universal mobile photo library H.264 mp4 codec
  const startRecording = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Force sequence to reset to the very beginning of Step 1
    activePacketIndexRef.current = 0;
    setCurrentActivePacketIndex(0);
    
    // Reset packet run progresses to start
    packetsStateRef.current = packetsStateRef.current.map(p => ({
      ...p,
      progress: 0.0
    }));

    stepsCompletedDuringRecordingRef.current = 0;
    hasScheduledStopRef.current = false;
    stepTrackerSetRef.current = new Set();
    recordedChunksRef.current = [];
    recordingStartTimeRef.current = Date.now();

    try {
      // Use fallback captureStream
      let stream: MediaStream;
      if (typeof (canvas as any).captureStream === 'function') {
        stream = (canvas as any).captureStream(30);
      } else if (typeof (canvas as any).mozCaptureStream === 'function') {
        stream = (canvas as any).mozCaptureStream(30);
      } else {
        stream = (canvas as any).captureStream();
      }

      // Prioritize native WebM containers (highly stable, performs flawless video-only web recording)
      // MP4 options are included as safe fallback streams for general configurations.
      const codecOptions = [
        'video/webm;codecs=vp9',
        'video/webm;codecs=vp8',
        'video/webm',
        'video/mp4;codecs=avc1',
        'video/mp4'
      ];

      let selectedMime = '';
      let recorder: MediaRecorder | null = null;
      
      // Perform aggressive trial creation to bypass browser-specific lies about isTypeSupported
      for (const mime of codecOptions) {
        try {
          if (MediaRecorder.isTypeSupported(mime)) {
            recorder = new MediaRecorder(stream, { mimeType: mime });
            selectedMime = mime;
            break;
          }
        } catch (e) {
          console.warn(`Browser reported ${mime} as supported but failed to instantiate recorder:`, e);
        }
      }

      // Safe parameterless fallback if none of the above succeeded
      if (!recorder) {
        try {
          recorder = new MediaRecorder(stream);
          selectedMime = recorder.mimeType || 'video/webm';
        } catch (e) {
          console.error("Failed to instantiate standard parameterless MediaRecorder:", e);
          throw e;
        }
      }

      // Add general error logger
      recorder.onerror = (e) => {
        console.error("MediaRecorder runtime canvas error:", e);
      };

      recorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          recordedChunksRef.current.push(event.data);
        }
      };

      recorder.onstop = () => {
        const fileExt = selectedMime.toLowerCase().includes('mp4') ? 'mp4' : 'webm';
        const blobType = selectedMime || 'video/webm';
        const blob = new Blob(recordedChunksRef.current, { type: blobType });
        
        // Ensure we don't download empty files
        if (blob.size === 0) {
          console.warn("Recorded blob has 0 bytes. Trying to download buffer metadata fallback...");
        }

        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `flowmotion-animation-recording-${Date.now()}.${fileExt}`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        setIsRecording(false);
        isCurrentlyRecordingRef.current = false;
      };

      mediaRecorderRef.current = recorder;
      isCurrentlyRecordingRef.current = true;
      setIsRecording(true);
      setRecordedSeconds(0);
      
      // Crucial: Use timeslice interval to continuously feed non-empty chunks of binary video frames
      recorder.start(500);
    } catch (err) {
      console.error("Failed to start MediaRecorder on canvas capture stream:", err);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    setIsRecording(false);
    isCurrentlyRecordingRef.current = false;
  };

  // CANVAS DRAW ROUTINES
  const drawInfiniteGrid = (ctx: CanvasRenderingContext2D) => {
    // Fill deep cosmos backdrop
    ctx.fillStyle = '#030308';
    ctx.fillRect(-6000, -6000, 12000, 12000);

    ctx.strokeStyle = '#0a0a16';
    ctx.lineWidth = 1;
    const spacing = 32;

    ctx.beginPath();
    for (let x = -6000; x < 6000; x += spacing) {
      ctx.moveTo(x, -6000);
      ctx.lineTo(x, 6000);
    }
    for (let y = -6000; y < 6000; y += spacing) {
      ctx.moveTo(-6000, y);
      ctx.lineTo(6000, y);
    }
    ctx.stroke();

    // Secondary subtle crosshair coordinates
    ctx.strokeStyle = '#1e1b4b';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(-6000, 0); ctx.lineTo(6000, 0);
    ctx.moveTo(0, -6000); ctx.lineTo(0, 6000);
    ctx.stroke();
  };

  const drawCarNode = (ctx: CanvasRenderingContext2D, x: number, y: number, color: string) => {
    ctx.save();
    ctx.shadowBlur = 10;
    ctx.shadowColor = color;
    ctx.fillStyle = color;

    // Chassis base
    ctx.fillRect(x - 26, y + 2, 52, 13);

    // Cab
    ctx.beginPath();
    ctx.moveTo(x - 17, y + 2);
    ctx.lineTo(x - 10, y - 9);
    ctx.lineTo(x + 10, y - 9);
    ctx.lineTo(x + 17, y + 2);
    ctx.closePath();
    ctx.fill();

    // Wheels
    ctx.shadowBlur = 0;
    ctx.fillStyle = '#000000';
    ctx.strokeStyle = '#64748b';
    ctx.lineWidth = 1.5;

    ctx.beginPath(); ctx.arc(x - 14, y + 15, 6, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.arc(x + 14, y + 15, 6, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.restore();
  };

  const drawCloudNode = (ctx: CanvasRenderingContext2D, x: number, y: number, color: string) => {
    ctx.save();
    ctx.shadowBlur = 10;
    ctx.shadowColor = color;
    ctx.fillStyle = color;

    ctx.beginPath();
    ctx.arc(x - 14, y + 2, 12, 0, Math.PI * 2);
    ctx.arc(x + 14, y + 2, 12, 0, Math.PI * 2);
    ctx.arc(x, y - 7, 15, 0, Math.PI * 2);
    ctx.fillRect(x - 20, y - 2, 40, 16);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  };

  const drawServerNode = (ctx: CanvasRenderingContext2D, x: number, y: number, color: string) => {
    ctx.save();
    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 2;

    ctx.fillStyle = '#111827';
    ctx.fillRect(x - 22, y - 22, 44, 44);
    ctx.strokeRect(x - 22, y - 22, 44, 44);

    const isBlinkingOffset = blinkCounterRef.current % 30 < 15;
    const bladeH = 8;
    for (let i = 0; i < 3; i++) {
      const bY = y - 18 + i * (bladeH + 4);
      ctx.fillStyle = '#030712';
      ctx.fillRect(x - 16, bY, 32, bladeH);

      ctx.fillStyle = isBlinkingOffset ? '#10b981' : '#047857';
      ctx.beginPath(); ctx.arc(x + 10, bY + bladeH / 2, 1.5, 0, Math.PI * 2); ctx.fill();

      ctx.fillStyle = isBlinkingOffset ? '#3b82f6' : '#1d4ed8';
      ctx.beginPath(); ctx.arc(x + 5, bY + bladeH / 2, 1.5, 0, Math.PI * 2); ctx.fill();
    }
    ctx.restore();
  };

  const drawDatabaseNode = (ctx: CanvasRenderingContext2D, x: number, y: number, color: string) => {
    ctx.save();
    ctx.shadowBlur = 8;
    ctx.shadowColor = color;
    ctx.fillStyle = color;
    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth = 1;

    const drawCanister = (cY: number) => {
      ctx.beginPath();
      ctx.fillRect(x - 18, cY, 36, 10);
      ctx.strokeRect(x - 18, cY, 36, 10);

      ctx.fillStyle = color;
      ctx.beginPath(); ctx.ellipse(x, cY, 18, 4, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      ctx.beginPath(); ctx.ellipse(x, cY + 10, 18, 4, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    };

    drawCanister(y - 15);
    drawCanister(y - 2);
    drawCanister(y + 11);
    ctx.restore();
  };

  const drawClientNode = (ctx: CanvasRenderingContext2D, x: number, y: number, color: string) => {
    ctx.save();
    ctx.shadowBlur = 8;
    ctx.shadowColor = color;
    ctx.fillStyle = color;

    ctx.fillRect(x - 18, y - 16, 36, 22);
    ctx.fillStyle = '#030712';
    ctx.fillRect(x - 15, y - 13, 30, 16);

    ctx.fillStyle = color;
    ctx.fillRect(x - 3, y + 6, 6, 6);
    ctx.fillRect(x - 12, y + 12, 24, 3);
    ctx.restore();
  };

  const drawBrowserNode = (ctx: CanvasRenderingContext2D, x: number, y: number, color: string) => {
    ctx.save();
    ctx.fillStyle = '#111827';
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.shadowBlur = 8;
    ctx.shadowColor = color;
    ctx.fillRect(x - 22, y - 18, 44, 36);
    ctx.strokeRect(x - 22, y - 18, 44, 36);

    ctx.fillStyle = '#030712';
    ctx.fillRect(x - 22, y - 18, 44, 7);

    ctx.fillStyle = '#ef4444'; ctx.beginPath(); ctx.arc(x - 17, y - 14, 1.5, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#3b82f6'; ctx.beginPath(); ctx.arc(x - 12, y - 14, 1.5, 0, Math.PI * 2); ctx.fill();

    ctx.fillStyle = color;
    ctx.fillRect(x - 16, y - 3, 32, 3);
    ctx.fillRect(x - 16, y + 4, 20, 3);
    ctx.restore();
  };

  const drawCacheNode = (ctx: CanvasRenderingContext2D, x: number, y: number, color: string) => {
    ctx.save();
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.fillStyle = '#030712';
    ctx.shadowBlur = 8;
    ctx.shadowColor = color;
    ctx.fillRect(x - 24, y - 10, 48, 20);
    ctx.strokeRect(x - 24, y - 10, 48, 20);

    ctx.fillStyle = '#eab308';
    for (let i = 0; i < 5; i++) {
      ctx.fillRect(x - 18 + i * 8, y + 10, 3, 3);
    }
    ctx.fillStyle = color;
    for (let c = 0; c < 3; c++) {
      ctx.fillRect(x - 16 + c * 13, y - 5, 8, 10);
    }
    ctx.restore();
  };

  const drawGatewayNode = (ctx: CanvasRenderingContext2D, x: number, y: number, color: string) => {
    ctx.save();
    ctx.strokeStyle = color;
    ctx.lineWidth = 2.5;
    ctx.fillStyle = '#111827';
    ctx.shadowBlur = 8;
    ctx.shadowColor = color;

    ctx.beginPath();
    ctx.arc(x, y, 20, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(x - 10, y); ctx.lineTo(x + 10, y);
    ctx.moveTo(x + 7, y - 3); ctx.lineTo(x + 10, y); ctx.lineTo(x + 7, y + 3);
    ctx.moveTo(x, y - 10); ctx.lineTo(x, y + 10);
    ctx.moveTo(x - 3, y + 7); ctx.lineTo(x, y + 10); ctx.lineTo(x + 3, y + 7);
    ctx.stroke();
    ctx.restore();
  };

  const drawFirewallNode = (ctx: CanvasRenderingContext2D, x: number, y: number, color: string) => {
    ctx.save();
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.fillStyle = '#111827';
    ctx.shadowBlur = 8;
    ctx.shadowColor = color;

    ctx.beginPath();
    ctx.moveTo(x - 18, y - 18);
    ctx.lineTo(x + 18, y - 18);
    ctx.lineTo(x + 14, y);
    ctx.quadraticCurveTo(x, y + 18, x - 14, y);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.strokeStyle = '#eab308';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(x - 8, y - 4); ctx.lineTo(x + 8, y - 4);
    ctx.moveTo(x, y - 11); ctx.lineTo(x, y + 6);
    ctx.stroke();
    ctx.restore();
  };

  // MAIN RUNTIME RENDER TICKER
  useEffect(() => {
    let frameId: number;
    let lastTime = performance.now();

    const loop = (currentTime: number) => {
      const dt = (currentTime - lastTime) / 1000;
      lastTime = currentTime;

      const canvas = canvasRef.current;
      if (!canvas) {
        frameId = requestAnimationFrame(loop);
        return;
      }

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        frameId = requestAnimationFrame(loop);
        return;
      }

      const w = canvas.width;
      const h = canvas.height;

      blinkCounterRef.current++;
      waveRadiusRef.current += dt * 32;
      if (waveRadiusRef.current >= 75) {
        waveRadiusRef.current = 5;
      }

      // 1. Establish infinite panning + zoom viewport context transformations
      ctx.clearRect(0, 0, w, h);
      ctx.save();
      ctx.translate(pan.x, pan.y);
      ctx.scale(zoom, zoom);

      // 2. Draw unlimited cosmos grid matrix
      drawInfiniteGrid(ctx);

      // 3. Setup dynamic firewall state machine tracking loops and timeline variables
      const hasOverwhelm = nodes.some(n => n.isOverwhelmTarget);
      const hasFirewall = nodes.some(n => n.type === 'firewall');
      const firewallNode = nodes.find(n => n.type === 'firewall');
      const victimNode = nodes.find(n => n.isOverwhelmTarget || n.type === 'server' || n.type === 'database') || nodes[0];

      const promptLower = (rawPromptText || '').toLowerCase() + ' ' + (hasFirewall ? 'firewall' : '');
      const isFirewallFailureRequested = hasFirewall && (
        promptLower.includes('break') || 
        promptLower.includes('fail') || 
        promptLower.includes('explode') || 
        promptLower.includes('weaken') || 
        promptLower.includes('destroy') || 
        promptLower.includes('breach') || 
        promptLower.includes('penetrate') || 
        promptLower.includes('bypass') || 
        promptLower.includes('compromise') ||
        promptLower.includes('overwhelm') ||
        promptLower.includes('ddos') ||
        promptLower.includes('flood') ||
        promptLower.includes('hacker') ||
        promptLower.includes('attacker') ||
        promptLower.includes('bot')
      );

      const useFirewallTimeline = hasFirewall && isFirewallFailureRequested;
      const loopPeriod = useFirewallTimeline ? 20000 : 15000;
      const cycleTime = (Date.now() % loopPeriod) / 1000;

      // Real-time state machine tracking loops variables
      const isFirewallActive = hasFirewall && (!useFirewallTimeline || cycleTime < 10.0);
      const isFirewallBroken = hasFirewall && (useFirewallTimeline && cycleTime >= 10.0);

      // Derived timeline states
      const isCrashedPhase = !useFirewallTimeline && hasOverwhelm && cycleTime >= 11.0;
      const isFailingPhase = !useFirewallTimeline && hasOverwhelm && cycleTime >= 8.0 && cycleTime < 11.0;
      const isStressedPhase = !useFirewallTimeline && hasOverwhelm && cycleTime >= 4.0 && cycleTime < 8.0;
      const isBlackoutPhase = useFirewallTimeline && cycleTime >= 16.0;

      const isSafeClientNode = (n: DiagramNode) => {
        return (n.type === 'client' || n.type === 'browser') &&
          !n.label.toLowerCase().includes('attacker') &&
          !n.label.toLowerCase().includes('hacker') &&
          !n.label.toLowerCase().includes('bot');
      };

      // 3. Draw connection pipelines (edges) with dynamic rerouting corridors
      edges.forEach((edge) => {
        let sourceNode = nodes.find((n) => n.id === edge.from);
        let targetNode = nodes.find((n) => n.id === edge.to);

        if (!sourceNode || !targetNode) return;

        // Rule 2: Invalidate routing corridors when broken & alter destinations on the fly directly to victimNode
        if (isFirewallBroken && firewallNode) {
          if (targetNode.id === firewallNode.id && victimNode) {
            targetNode = victimNode;
          }
          if (sourceNode.id === firewallNode.id) {
            return; // Invalidate outbound corridors of the broken security node
          }
        }

        const sCoords = getCoordinates(sourceNode, w, h);
        const tCoords = getCoordinates(targetNode, w, h);

        ctx.save();

        // Rule 1: Active Security Green Connection Pipeline
        let strokeColor = edge.color || 'rgba(99, 102, 241, 0.45)';
        if (isFirewallActive && firewallNode) {
          if (edge.from === firewallNode.id) {
            strokeColor = '#10b981'; // distinct Green connection line flowing from output anchor
          } else if (edge.to === firewallNode.id && isSafeClientNode(sourceNode)) {
            strokeColor = '#10b981'; // Green incoming legitimate corridor
          }
        }

        ctx.strokeStyle = strokeColor;
        ctx.lineWidth = edge.id === selectedNodeId ? 3.5 : 2;

        if (edge.lineStyle === 'dashed') {
          ctx.setLineDash([6, 6]);
        }

        ctx.beginPath();
        ctx.moveTo(sCoords.x, sCoords.y);
        ctx.lineTo(tCoords.x, tCoords.y);
        ctx.stroke();
        ctx.restore();

        if (edge.label) {
          ctx.save();
          ctx.fillStyle = '#475569';
          ctx.font = '8px "JetBrains Mono", monospace';
          ctx.textAlign = 'center';
          const midX = (sCoords.x + tCoords.x) / 2;
          const midY = (sCoords.y + tCoords.y) / 2 - 6;
          ctx.fillText(edge.label.toUpperCase(), midX, midY);
          ctx.restore();
        }
      });

      // 4. Draw active coordinate pulse beacons
      nodes.forEach((node) => {
        const coords = getCoordinates(node, w, h);
        if (['server', 'car', 'cloud', 'gateway'].includes(node.type)) {
          ctx.save();
          ctx.strokeStyle = node.color || '#38bdf8';
          ctx.lineWidth = 1.2;
          ctx.globalAlpha = Math.max(0, 0.35 * (1 - waveRadiusRef.current / 75));
          ctx.beginPath();
          ctx.arc(coords.x, coords.y, waveRadiusRef.current * ((node.size || 35) / 35), 0, Math.PI * 2);
          ctx.stroke();
          ctx.restore();
        }
      });

      // 5. Draw physical system chassis elements relative to custom scale sliders and shake timers
      // Spawn real-time physical disaster particles (smoke, fire, sparks) over damaged nodes
      if (useFirewallTimeline) {
        if (cycleTime >= 5.0 && cycleTime < 10.0 && firewallNode) {
          // Firewall weakening: releases smoke and minor sparks
          const fCoords = getCoordinates(firewallNode, w, h);
          if (Math.random() < 0.35) {
            particlesRef.current.push({
              x: fCoords.x + (Math.random() - 0.5) * 10,
              y: fCoords.y,
              vx: (Math.random() - 0.5) * 15,
              vy: -20 - Math.random() * 20,
              age: 0,
              maxAge: 0.8 + Math.random() * 0.4,
              color: 'rgba(148, 163, 184, 0.40)',
              size: 3 + Math.random() * 4,
              type: 'smoke'
            });
          }
          if (Math.random() < 0.20) {
            particlesRef.current.push({
              x: fCoords.x,
              y: fCoords.y,
              vx: (Math.random() - 0.5) * 60,
              vy: -10 - Math.random() * 30,
              age: 0,
              maxAge: 0.4 + Math.random() * 0.3,
              color: '#facc15',
              size: 1 + Math.random() * 1.5,
              type: 'spark'
            });
          }
        } else if (cycleTime >= 10.0 && cycleTime < 12.0 && firewallNode) {
          // Firewall explosion: bursts roaring fire & high-pressure sparks!
          const fCoords = getCoordinates(firewallNode, w, h);
          for (let i = 0; i < 3; i++) {
            particlesRef.current.push({
              x: fCoords.x + (Math.random() - 0.5) * 15,
              y: fCoords.y + (Math.random() - 0.5) * 15,
              vx: (Math.random() - 0.5) * 120,
              vy: (Math.random() - 0.5) * 120 - 40,
              age: 0,
              maxAge: 0.5 + Math.random() * 0.5,
              color: Math.random() > 0.45 ? '#f43f5e' : '#fb923c',
              size: 5 + Math.random() * 5,
              type: 'fire'
            });
            particlesRef.current.push({
              x: fCoords.x,
              y: fCoords.y,
              vx: (Math.random() - 0.5) * 180,
              vy: (Math.random() - 0.5) * 180,
              age: 0,
              maxAge: 0.3 + Math.random() * 0.4,
              color: '#ffffff',
              size: 2 + Math.random() * 2,
              type: 'spark'
            });
          }
          if (blinkCounterRef.current % 4 === 0) {
            particlesRef.current.push({
              x: fCoords.x,
              y: fCoords.y,
              vx: (Math.random() - 0.5) * 30,
              vy: -40 - Math.random() * 30,
              age: 0,
              maxAge: 1.2 + Math.random() * 0.6,
              color: 'rgba(71, 85, 105, 0.5)',
              size: 8 + Math.random() * 8,
              type: 'smoke'
            });
          }
        } else if (cycleTime >= 16.0 && victimNode) {
          // Main Server cascade failure smoke & roaring flame particles
          const vc = getCoordinates(victimNode, w, h);
          for (let i = 0; i < 2; i++) {
            particlesRef.current.push({
              x: vc.x + (Math.random() - 0.5) * 15,
              y: vc.y + (Math.random() - 0.5) * 15,
              vx: (Math.random() - 0.5) * 40,
              vy: -30 - Math.random() * 30,
              age: 0,
              maxAge: 0.7 + Math.random() * 0.4,
              color: Math.random() > 0.4 ? '#ef4444' : '#f97316',
              size: 4 + Math.random() * 4,
              type: 'fire'
            });
          }
          if (blinkCounterRef.current % 3 === 0) {
            particlesRef.current.push({
              x: vc.x + (Math.random() - 0.5) * 10,
              y: vc.y,
              vx: (Math.random() - 0.5) * 20,
              vy: -35 - Math.random() * 45,
              age: 0,
              maxAge: 1.5 + Math.random() * 0.6,
              color: 'rgba(47, 55, 75, 0.45)',
              size: 6 + Math.random() * 10,
              type: 'smoke'
            });
          }
        }
      } else if (victimNode && hasOverwhelm) {
        const vc = getCoordinates(victimNode, w, h);
        if (isFailingPhase) {
          for (let i = 0; i < 2; i++) {
            particlesRef.current.push({
              x: vc.x + (Math.random() - 0.5) * 15,
              y: vc.y + (Math.random() - 0.5) * 15,
              vx: (Math.random() - 0.5) * 50,
              vy: -35 - Math.random() * 45,
              age: 0,
              maxAge: 0.8 + Math.random() * 0.4,
              color: 'rgba(148, 163, 184, 0.45)',
              size: 5 + Math.random() * 7,
              type: 'smoke'
            });
            particlesRef.current.push({
              x: vc.x + (Math.random() - 0.5) * 10,
              y: vc.y + (Math.random() - 0.5) * 10,
              vx: (Math.random() - 0.5) * 40,
              vy: (Math.random() - 0.5) * 40 - 20,
              age: 0,
              maxAge: 0.5 + Math.random() * 0.4,
              color: Math.random() > 0.45 ? '#f43f5e' : '#fb923c',
              size: 4 + Math.random() * 4,
              type: 'fire'
            });
            particlesRef.current.push({
              x: vc.x,
              y: vc.y,
              vx: (Math.random() - 0.5) * 140,
              vy: (Math.random() - 0.5) * 140,
              age: 0,
              maxAge: 0.3 + Math.random() * 0.3,
              color: '#facc15',
              size: 1.5 + Math.random() * 2,
              type: 'spark'
            });
          }
        } else if (isCrashedPhase) {
          if (blinkCounterRef.current % 4 === 0) {
            particlesRef.current.push({
              x: vc.x + (Math.random() - 0.5) * 12,
              y: vc.y,
              vx: (Math.random() - 0.5) * 15,
              vy: -20 - Math.random() * 20,
              age: 0,
              maxAge: 1.3 + Math.random() * 0.5,
              color: 'rgba(100, 116, 139, 0.35)',
              size: 4 + Math.random() * 6,
              type: 'smoke'
            });
          }
        }
      }

      // Update particles positions and filtering
      particlesRef.current.forEach((p) => {
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.age += dt;
        if (p.type === 'smoke') {
          p.size += dt * 6;
        }
      });
      particlesRef.current = particlesRef.current.filter((p) => p.age < p.maxAge);

      // Render physical system elements and overrides
      nodes.forEach((node) => {
        let shakeX = 0;
        let shakeY = 0;
        let finalColor = node.color || '#a78bfa';
        let finalStatusLabel = node.statusLabel || '';

        if (useFirewallTimeline) {
          const isFw = node.type === 'firewall';
          const isTargetServer = node.type === 'server' || node.type === 'database';
          
          if (isFw) {
            if (cycleTime < 5.0) {
              finalStatusLabel = 'STRONG SECURITY';
              finalColor = '#10b981';
            } else if (cycleTime >= 5.0 && cycleTime < 10.0) {
              const fwHealth = Math.max(5, Math.round(100 - (cycleTime - 5.0) * 19));
              finalStatusLabel = `🛡️ SHIELD FAILING (${fwHealth}% HEALTH)`;
              finalColor = '#fb923c';
              const t = cycleTime - 5.0;
              shakeX = (Math.random() - 0.5) * (1.5 + t * 2.2);
              shakeY = (Math.random() - 0.5) * (1.5 + t * 2.2);
            } else if (cycleTime >= 10.0 && cycleTime < 12.0) {
              finalStatusLabel = '🔥 EXPLODING / BREACHED';
              finalColor = '#ef4444';
              shakeX = (Math.random() - 0.5) * 15;
              shakeY = (Math.random() - 0.5) * 15;
            } else {
              finalStatusLabel = '❌ DESTROYED (OFFLINE)';
              finalColor = '#475569';
            }
          } else if (isTargetServer) {
            if (cycleTime < 12.0) {
              finalStatusLabel = 'NORMAL [HEALTHY]';
              finalColor = node.color || '#a78bfa';
            } else if (cycleTime >= 12.0 && cycleTime < 16.0) {
              finalStatusLabel = '★ INCOMING FLOOD TAMPER';
              finalColor = '#fb923c';
              shakeX = (Math.random() - 0.5) * 5;
              shakeY = (Math.random() - 0.5) * 5;
            } else {
              finalStatusLabel = '✖ INACTIVE (CRASHED)';
              finalColor = '#64748b';
              shakeX = (Math.random() - 0.5) * 15;
              shakeY = (Math.random() - 0.5) * 15;
            }
          }
        } else {
          const isFw = node.type === 'firewall';
          if (isFw) {
            finalStatusLabel = 'STRONG SECURITY';
            finalColor = '#10b981';
          } else if (node.isOverwhelmTarget && hasOverwhelm) {
            if (isStressedPhase) {
              shakeX = (Math.random() - 0.5) * 4.5;
              shakeY = (Math.random() - 0.5) * 4.5;
              finalColor = '#fb923c';
              finalStatusLabel = '★ OVERLOAD STRESS';
            } else if (isFailingPhase) {
              shakeX = (Math.random() - 0.5) * 9.5;
              shakeY = (Math.random() - 0.5) * 9.5;
              finalColor = '#ef4444';
              finalStatusLabel = '🔥 FAILING (99% CPU)';
            } else if (isCrashedPhase) {
              finalColor = '#64748b';
              finalStatusLabel = '✖ INACTIVE (CRASHED)';
            } else {
              finalStatusLabel = 'NORMAL [HEALTHY]';
            }
          }
        }

        const rawCoords = getCoordinates(node, w, h);
        const coords = { x: rawCoords.x + shakeX, y: rawCoords.y + shakeY };
        const isSelected = selectedNodeId === node.id;
        const nodeSize = node.size || 35;
        const scaleFactor = nodeSize / 35;

        if (isSelected) {
          ctx.save();
          ctx.strokeStyle = '#22d3ee';
          ctx.lineWidth = 2.5;
          ctx.setLineDash([4, 4]);
          ctx.shadowBlur = 12;
          ctx.shadowColor = '#22d3ee';
          ctx.beginPath();
          ctx.arc(coords.x, coords.y, 34 * scaleFactor, 0, Math.PI * 2);
          ctx.stroke();
          ctx.restore();
        }

        ctx.save();
        ctx.translate(coords.x, coords.y);
        ctx.scale(scaleFactor, scaleFactor);
        ctx.translate(-coords.x, -coords.y);

        switch (node.type) {
          case 'car': drawCarNode(ctx, coords.x, coords.y, finalColor); break;
          case 'cloud': drawCloudNode(ctx, coords.x, coords.y, finalColor); break;
          case 'server': drawServerNode(ctx, coords.x, coords.y, finalColor); break;
          case 'database': drawDatabaseNode(ctx, coords.x, coords.y, finalColor); break;
          case 'client': drawClientNode(ctx, coords.x, coords.y, finalColor); break;
          case 'browser': drawBrowserNode(ctx, coords.x, coords.y, finalColor); break;
          case 'cache': drawCacheNode(ctx, coords.x, coords.y, finalColor); break;
          case 'gateway': drawGatewayNode(ctx, coords.x, coords.y, finalColor); break;
          case 'firewall': drawFirewallNode(ctx, coords.x, coords.y, finalColor); break;
        }

        ctx.restore();

        // High contrast system label rendering
        ctx.save();
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 10px "JetBrains Mono", monospace';
        ctx.textAlign = 'center';
        ctx.fillText(node.label, coords.x, coords.y - 25 * scaleFactor);

        ctx.font = '7.5px "JetBrains Mono", monospace';
        ctx.fillStyle = (node.isOverwhelmTarget || node.type === 'firewall' || node.type === 'server' || node.type === 'database') ? finalColor : '#94a3b8';
        if (finalStatusLabel) {
          ctx.fillText(finalStatusLabel.toUpperCase(), coords.x, coords.y + 32 * scaleFactor);
        }
        if (node.port) {
          ctx.fillStyle = '#38bdf8';
          ctx.fillText(`PORT ${node.port}`, coords.x, coords.y + 40 * scaleFactor);
        }
        ctx.restore();
      });

      // 6. Packet stream pipelines
      const isContinuousStream = packetsStateRef.current.some(p => p.isContinuous) || nodes.some(n => n.isOverwhelmTarget) || useFirewallTimeline;
      const totalPackets = packetsStateRef.current.length;

      if (totalPackets > 0) {
        if (isContinuousStream) {
          // A: CONTINUOUS OVERLAPPING PIPELINE VECTOR FLOW (Concurrent Multi-Packet Channels)
          packetsStateRef.current.forEach((p, idx) => {
            const fromNode = nodes.find((n) => n.id === p.from);
            const toNode = nodes.find((n) => n.id === p.to);

            if (fromNode && toNode) {
              const sCoords = getCoordinates(fromNode, w, h);
              
              const isSenderAttacker = fromNode.type === 'client' && 
                                       (fromNode.label.toLowerCase().includes('attacker') || 
                                        fromNode.label.toLowerCase().includes('hacker') || 
                                        fromNode.label.toLowerCase().includes('bot'));

              // Rule 2: Post-Death perimeter bypassing rerouting
              let renderToNode = toNode;
              if (isFirewallBroken && firewallNode) {
                if (fromNode.id === firewallNode.id) {
                  return; // Invalidate outbound corridors of broken security node
                }
                if (toNode.id === firewallNode.id && victimNode) {
                  renderToNode = victimNode;
                }
              } else if (useFirewallTimeline && cycleTime >= 12.0 && toNode.type === 'firewall' && isSenderAttacker) {
                const mainTargetServer = nodes.find(n => n.type === 'server' || n.type === 'database' || n.isOverwhelmTarget);
                if (mainTargetServer) {
                  renderToNode = mainTargetServer;
                }
              }

              const tCoords = getCoordinates(renderToNode, w, h);

               // Update progress continuously unless system is in blackout or crashed phase
              const isSimulationFrozen = isCrashedPhase || isBlackoutPhase;
              if (!isSimulationFrozen) {
                let speedMultiplier = 1.0;
                const prop = getPacketProperty(p, fromNode);
                if (prop === 'Malicious') {
                  speedMultiplier = 2.0; // Rapid bursts for malicious streams / floods
                } else if (fromNode && fromNode.label.toLowerCase().includes('high priority')) {
                  speedMultiplier = 1.6; // Faster bursts for high priority sync
                } else if (prop === 'Encrypted') {
                  speedMultiplier = 0.85; // Slightly slower, steady pulse for crypt payload
                } else {
                  speedMultiplier = 1.1; // Steady pulse
                }

                p.progress += p.speed * globalSpeedRef.current * speedMultiplier;
                if (p.progress >= 1.0) {
                  p.progress = 0.0;
                }
              }

              // In blackout phase, skip rendering packets altogether (network cut off!)
              if (isBlackoutPhase) {
                return;
              }

              // Pipeline trains: render multiple overlapping sub-packets following behind each other
              const subOffsets = [0.0, 0.33, 0.66];
              subOffsets.forEach((offset) => {
                const subProgress = (p.progress + offset) % 1.0;
                const pX = sCoords.x + (tCoords.x - sCoords.x) * subProgress;
                const pY = sCoords.y + (tCoords.y - sCoords.y) * subProgress;

                // Firewalls interceptor logic: Drop attacker bots packets at firewall bounding box
                const isReceiverFirewall = renderToNode.type === 'firewall';
                const isBlockedAtFirewall = useFirewallTimeline ? (cycleTime < 10.0) : true;

                // Determine dynamic property flag with transformation checks
                let currentProperty = getPacketProperty(p, fromNode);
                if (currentProperty === 'Encrypted' && renderToNode && renderToNode.type === 'gateway' && subProgress >= 0.50) {
                  currentProperty = 'Decrypted';
                }

                if (currentProperty === 'Malicious' && isReceiverFirewall && isBlockedAtFirewall && subProgress >= 0.90) {
                  // Packet is dropped/blocked by firewall! Trigger its destruction sequence & spawn red warning explosion particles
                  ctx.save();
                  ctx.fillStyle = '#ef4444';
                  ctx.shadowBlur = 15;
                  ctx.shadowColor = '#ef4444';
                  ctx.beginPath();
                  ctx.arc(pX, pY, 12, 0, Math.PI * 2);
                  ctx.fill();

                  // Spawn dynamic debris collision particles
                  if (Math.random() > 0.45) {
                    particlesRef.current.push({
                      x: pX,
                      y: pY,
                      vx: (Math.random() - 0.5) * 60,
                      vy: (Math.random() - 0.5) * 60 - 20,
                      age: 0,
                      maxAge: 0.5 + Math.random() * 0.3,
                      color: Math.random() > 0.5 ? '#ef4444' : '#f97316',
                      size: 2.5 + Math.random() * 2.5,
                      type: 'spark'
                    });
                  }

                  // "BLOCKED" text overlay
                  ctx.shadowBlur = 0;
                  ctx.fillStyle = '#ffffff';
                  ctx.font = 'bold 7px "JetBrains Mono", monospace';
                  ctx.textAlign = 'center';
                  ctx.textBaseline = 'middle';
                  ctx.fillText('BLOCKED', pX, pY - 14);
                  ctx.restore();
                  return; // Skip drawing standard visual package box
                }

                // Render individual 3D package icon (📦) with isometric projection and custom property accent colors
                const iconSize = currentProperty === 'Malicious' ? 6.5 : 5.5;
                draw3DPackageIcon(ctx, pX, pY, iconSize, currentProperty);

                // Draw hovering label tag card above 📦 representing packet description
                ctx.save();
                ctx.shadowBlur = 0;
                ctx.fillStyle = 'rgba(2, 6, 23, 0.9)';
                let glowColor = '#10b981';
                if (currentProperty === 'Malicious') glowColor = '#ef4444';
                else if (currentProperty === 'Encrypted') glowColor = '#3b82f6';
                else if (currentProperty === 'Decrypted') glowColor = '#06b6d4';
                else if (currentProperty === 'Secure') glowColor = '#10b981';

                ctx.strokeStyle = glowColor;
                ctx.lineWidth = 1.2;

                const textLine = p.label;
                const textWidth = ctx.measureText(textLine).width + 10;
                ctx.fillRect(pX - textWidth / 2, pY - 26, textWidth, 12);
                ctx.strokeRect(pX - textWidth / 2, pY - 26, textWidth, 12);

                ctx.fillStyle = '#ffffff';
                ctx.font = 'bold 7px "JetBrains Mono", monospace';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText(textLine, pX, pY - 20);
                
                // Draw tiny pill tag indicating property
                ctx.fillStyle = glowColor;
                ctx.fillRect(pX - 18, pY - 34, 36, 7);
                ctx.fillStyle = '#ffffff';
                ctx.font = 'bold 5px "JetBrains Mono", monospace';
                ctx.fillText(currentProperty.toUpperCase(), pX, pY - 30.5);
                ctx.restore();
              });
            }
          });
        } else {
          // B: ORIGINAL SEQUENTIAL SINGLE BUDGET TIMING PIPELINE
          const activeIdx = activePacketIndexRef.current;
          const p = packetsStateRef.current[activeIdx];

          if (p) {
            const fromNode = nodes.find((n) => n.id === p.from);
            const toNode = nodes.find((n) => n.id === p.to);

            if (fromNode && toNode) {
              const sCoords = getCoordinates(fromNode, w, h);
              
              const isSenderAttacker = fromNode.type === 'client' && 
                                       (fromNode.label.toLowerCase().includes('attacker') || 
                                        fromNode.label.toLowerCase().includes('hacker') || 
                                        fromNode.label.toLowerCase().includes('bot'));

              // Rule 2: Post-Death perimeter bypassing rerouting
              let renderToNode = toNode;
              if (isFirewallBroken && firewallNode) {
                if (fromNode.id === firewallNode.id) {
                  return; // Invalidate outbound corridors of broken security node
                }
                if (toNode.id === firewallNode.id && victimNode) {
                  renderToNode = victimNode;
                }
              } else if (useFirewallTimeline && cycleTime >= 12.0 && toNode.type === 'firewall' && isSenderAttacker) {
                const mainTargetServer = nodes.find(n => n.type === 'server' || n.type === 'database' || n.isOverwhelmTarget);
                if (mainTargetServer) {
                  renderToNode = mainTargetServer;
                }
              }

              const tCoords = getCoordinates(renderToNode, w, h);

              // Update progress unless simulation is frozen or blacked out
              const isSimulationFrozen = isCrashedPhase || isBlackoutPhase;
              if (!isSimulationFrozen) {
                let speedMultiplier = 1.0;
                const prop = getPacketProperty(p, fromNode);
                if (prop === 'Malicious') {
                  speedMultiplier = 2.0; // Faster bursts for malicious ddos/floods
                } else if (fromNode && fromNode.label.toLowerCase().includes('high priority')) {
                  speedMultiplier = 1.6; // High priority bursts
                } else if (prop === 'Encrypted') {
                  speedMultiplier = 0.85; // Heavy crypt payload steady speed
                } else {
                  speedMultiplier = 1.1; // Default steady speed
                }
                p.progress += p.speed * globalSpeedRef.current * speedMultiplier;

                if (p.progress >= 1.0) {
                  p.progress = 0; // reset
                  const nextIdx = (activeIdx + 1) % totalPackets;

                  if (isCurrentlyRecordingRef.current) {
                    stepsCompletedDuringRecordingRef.current++;
                    const elapsed = Date.now() - recordingStartTimeRef.current;
                    
                    if (stepsCompletedDuringRecordingRef.current >= totalPackets) {
                      if (elapsed >= 5000 && !hasScheduledStopRef.current) {
                        hasScheduledStopRef.current = true;
                        setTimeout(() => { stopRecording(); }, 400);
                      }
                    }
                  }

                  activePacketIndexRef.current = nextIdx;
                  setCurrentActivePacketIndex(nextIdx);
                }
              }

              // Do not render sequential packet in blackout phase
              if (!isBlackoutPhase) {
                const isReceiverFirewall = renderToNode.type === 'firewall';
                const isBlockedAtFirewall = useFirewallTimeline ? (cycleTime < 10.0) : true;

                // Determine dynamic property flag with transformation checks
                let currentProperty = getPacketProperty(p, fromNode);
                if (currentProperty === 'Encrypted' && renderToNode && renderToNode.type === 'gateway' && p.progress >= 0.50) {
                  currentProperty = 'Decrypted';
                }

                if (currentProperty === 'Malicious' && isReceiverFirewall && isBlockedAtFirewall && p.progress >= 0.90) {
                  // Packet is dropped/blocked! Fire warning explosion & particles
                  const pX = sCoords.x + (tCoords.x - sCoords.x) * p.progress;
                  const pY = sCoords.y + (tCoords.y - sCoords.y) * p.progress;
                  ctx.save();
                  ctx.fillStyle = '#ef4444';
                  ctx.shadowBlur = 15;
                  ctx.shadowColor = '#ef4444';
                  ctx.beginPath();
                  ctx.arc(pX, pY, 13, 0, Math.PI * 2);
                  ctx.fill();

                  // Spawn collision explosion particles
                  if (Math.random() > 0.45) {
                    particlesRef.current.push({
                      x: pX,
                      y: pY,
                      vx: (Math.random() - 0.5) * 60,
                      vy: (Math.random() - 0.5) * 60 - 20,
                      age: 0,
                      maxAge: 0.5 + Math.random() * 0.3,
                      color: '#ef4444',
                      size: 3 + Math.random() * 3,
                      type: 'spark'
                    });
                  }

                  ctx.shadowBlur = 0;
                  ctx.fillStyle = '#ffffff';
                  ctx.font = 'bold 7px "JetBrains Mono", monospace';
                  ctx.textAlign = 'center';
                  ctx.textBaseline = 'middle';
                  ctx.fillText('BLOCKED', pX, pY - 14);
                  ctx.restore();
                } else {
                  const pX = sCoords.x + (tCoords.x - sCoords.x) * p.progress;
                  const pY = sCoords.y + (tCoords.y - sCoords.y) * p.progress;

                  // Render individual 3D package icon (📦) with custom property color theme
                  const iconSize = currentProperty === 'Malicious' ? 6.5 : 5.5;
                  draw3DPackageIcon(ctx, pX, pY, iconSize, currentProperty);

                  // Label tag card
                  ctx.save();
                  ctx.shadowBlur = 0;
                  ctx.fillStyle = 'rgba(2, 6, 23, 0.9)';
                  let glowColor = '#10b981';
                  if (currentProperty === 'Malicious') glowColor = '#ef4444';
                  else if (currentProperty === 'Encrypted') glowColor = '#3b82f6';
                  else if (currentProperty === 'Decrypted') glowColor = '#06b6d4';
                  else if (currentProperty === 'Secure') glowColor = '#10b981';

                  ctx.strokeStyle = glowColor;
                  ctx.lineWidth = 1.2;

                  const textLine = `[${UNICODE_CIRCLES[activeIdx] || activeIdx + 1}] ${p.label}`;
                  const textWidth = ctx.measureText(textLine).width + 12;
                  ctx.fillRect(pX - textWidth / 2, pY - 28, textWidth, 14);
                  ctx.strokeRect(pX - textWidth / 2, pY - 28, textWidth, 14);

                  ctx.fillStyle = '#ffffff';
                  ctx.font = 'bold 7.5px "JetBrains Mono", monospace';
                  ctx.textAlign = 'center';
                  ctx.textBaseline = 'middle';
                  ctx.fillText(textLine, pX, pY - 21);

                  // Draw tiny pill tag indicating property
                  ctx.fillStyle = glowColor;
                  ctx.fillRect(pX - 22, pY - 37, 44, 8);
                  ctx.fillStyle = '#ffffff';
                  ctx.font = 'bold 5px "JetBrains Mono", monospace';
                  ctx.fillText(currentProperty.toUpperCase(), pX, pY - 33);
                  ctx.restore();
                }
              }

              // Draw sequence step numbers right next to active elements
              const drawChronologicalBadge = (node: DiagramNode, roleLabel: 'ORIGIN' | 'TARGET') => {
                const nodeCoords = getCoordinates(node, w, h);
                const nodeScale = (node.size || 35) / 35;
                ctx.save();

                const pulseFactor = Math.sin(Date.now() / 150) * 3 + 12;
                ctx.shadowColor = '#10b981';
                ctx.shadowBlur = pulseFactor;
                ctx.fillStyle = '#10b981';

                const bX = nodeCoords.x + 24 * nodeScale;
                const bY = nodeCoords.y - 24 * nodeScale;

                ctx.beginPath();
                ctx.arc(bX, bY, 11, 0, Math.PI * 2);
                ctx.fill();

                ctx.strokeStyle = '#022c22';
                ctx.lineWidth = 1.5;
                ctx.stroke();

                // Circle Indicator sequence badge (e.g., ①, ②, ③)
                ctx.shadowBlur = 0;
                ctx.fillStyle = '#022c22';
                ctx.font = 'bold 12px "JetBrains Mono", monospace';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                
                const seqSymId = UNICODE_CIRCLES[activeIdx] || `${activeIdx + 1}`;
                ctx.fillText(seqSymId, bX, bY);

                // Role metadata label
                ctx.fillStyle = '#34d399';
                ctx.font = 'bold 6.5px "JetBrains Mono", monospace';
                ctx.fillText(roleLabel, bX, bY + 16);

                ctx.restore();
              };

              if (fromNode) drawChronologicalBadge(fromNode, 'ORIGIN');
              if (toNode) drawChronologicalBadge(toNode, 'TARGET');
            }
          }
        }
      }

      // 7. Draw active stress particles on top of everything
      particlesRef.current.forEach((p) => {
        ctx.save();
        ctx.globalAlpha = Math.max(0, 1.0 - p.age / p.maxAge);
        ctx.fillStyle = p.color;
        if (p.type === 'spark') {
          ctx.shadowBlur = 8;
          ctx.shadowColor = p.color;
        }
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      });

      ctx.restore(); // Restore panning & zoom transform matrices for next frame
      frameId = requestAnimationFrame(loop);
    };

    frameId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(frameId);
  }, [nodes, edges, selectedNodeId, zoom, pan]);

  // Mobile touch event routing to enable Figma-style two-finger pinch zoom + swipe pan
  const lastTouchDistanceRef = useRef<number | null>(null);

  const handleTouchStart = (e: React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const w = canvas.width;
    const h = canvas.height;

    if (e.touches.length === 1) {
      const touch = e.touches[0];
      const clickX = touch.clientX - rect.left;
      const clickY = touch.clientY - rect.top;

      // Convert screen pointer click back to logical whiteboard arena coordinates
      const logicX = (clickX - pan.x) / zoom;
      const logicY = (clickY - pan.y) / zoom;

      let clickedNode: DiagramNode | null = null;
      for (let i = nodes.length - 1; i >= 0; i--) {
        const node = nodes[i];
        const coords = getCoordinates(node, w, h);
        const radius = node.size || 35;
        const hitRadius = 36 * (radius / 35);
        const dx = logicX - coords.x;
        const dy = logicY - coords.y;

        if (Math.sqrt(dx * dx + dy * dy) <= hitRadius) {
          clickedNode = node;
          break;
        }
      }

      if (interactionMode === 'drag' && clickedNode) {
        setDraggedNodeId(clickedNode.id);
        onSelectNode(clickedNode);
        const coords = getCoordinates(clickedNode, w, h);
        dragOffset.current = {
          x: logicX - coords.x,
          y: logicY - coords.y,
        };
      } else {
        isPanningRef.current = true;
        panStartRef.current = { x: touch.clientX, y: touch.clientY };
        initialPanRef.current = { ...pan };
      }
    } else if (e.touches.length === 2) {
      const t1 = e.touches[0];
      const t2 = e.touches[1];
      const dist = Math.hypot(t1.clientX - t2.clientX, t1.clientY - t2.clientY);
      lastTouchDistanceRef.current = dist;
      isPanningRef.current = false;
      setDraggedNodeId(null);
    }
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const w = canvas.width;
    const h = canvas.height;

    if (e.touches.length === 1) {
      const touch = e.touches[0];
      const mouseX = touch.clientX - rect.left;
      const mouseY = touch.clientY - rect.top;

      if (draggedNodeId) {
        const logicX = (mouseX - pan.x) / zoom;
        const logicY = (mouseY - pan.y) / zoom;
        const targetLogicX = logicX - dragOffset.current.x;
        const targetLogicY = logicY - dragOffset.current.y;

        const percentX = (targetLogicX / w) * 100;
        const percentY = (targetLogicY / h) * 100;

        const boundedX = Math.min(95, Math.max(5, percentX));
        const boundedY = Math.min(93, Math.max(7, percentY));

        onUpdateNodePosition(draggedNodeId, boundedX, boundedY);
      } else if (isPanningRef.current) {
        const dx = touch.clientX - panStartRef.current.x;
        const dy = touch.clientY - panStartRef.current.y;
        
        // Prevent canvas from being panned too far away out of sight on touch dragging
        const maxPanX = w * 1.5;
        const maxPanY = h * 1.5;
        setPan({
          x: Math.min(maxPanX, Math.max(-maxPanX, initialPanRef.current.x + dx)),
          y: Math.min(maxPanY, Math.max(-maxPanY, initialPanRef.current.y + dy)),
        });
      }
    } else if (e.touches.length === 2) {
      const t1 = e.touches[0];
      const t2 = e.touches[1];
      const currentDist = Math.hypot(t1.clientX - t2.clientX, t1.clientY - t2.clientY);

      if (lastTouchDistanceRef.current && lastTouchDistanceRef.current > 0) {
        const ratio = currentDist / lastTouchDistanceRef.current;
        let targetZoom = zoom * ratio;
        targetZoom = Math.min(3.0, Math.max(0.4, targetZoom));

        const midX = ((t1.clientX + t2.clientX) / 2) - rect.left;
        const midY = ((t1.clientY + t2.clientY) / 2) - rect.top;

        setPan((prev) => ({
          x: midX - (midX - prev.x) * (targetZoom / zoom),
          y: midY - (midY - prev.y) * (targetZoom / zoom),
        }));
        setZoom(targetZoom);
      }
      lastTouchDistanceRef.current = currentDist;
    }
  };

  const handleTouchEnd = () => {
    setDraggedNodeId(null);
    isPanningRef.current = false;
    lastTouchDistanceRef.current = null;
  };

  // Viewport action zoom helpers centered strictly relative to viewport middle coordinates
  const handleZoomIn = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const cx = canvas.width / 2;
    const cy = canvas.height / 2;
    const nextZoom = Math.min(3.0, zoom * 1.15);
    setPan((prev) => ({
      x: cx - (cx - prev.x) * (nextZoom / zoom),
      y: cy - (cy - prev.y) * (nextZoom / zoom),
    }));
    setZoom(nextZoom);
  };

  const handleZoomOut = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const cx = canvas.width / 2;
    const cy = canvas.height / 2;
    const nextZoom = Math.max(0.4, zoom / 1.15);
    setPan((prev) => ({
      x: cx - (cx - prev.x) * (nextZoom / zoom),
      y: cy - (cy - prev.y) * (nextZoom / zoom),
    }));
    setZoom(nextZoom);
  };

  const handleResetView = () => {
    setZoom(1.0);
    setPan({ x: 0, y: 0 });
  };

  return (
    <div
      className="w-full h-[880px] md:h-[1100px] border border-slate-800 rounded-xl overflow-hidden shadow-2xl flex flex-col bg-[#020205] select-none"
    >
      {/* 1. SEPARATE NON-OVERLAPPING CONTROLS HEADER */}
      <div className="w-full bg-slate-950 border-b border-slate-900 p-3 sm:p-4 flex flex-col gap-3 shrink-0 z-20">
        
        {/* Row 1: Sequence tracker & touch gesture info */}
        <div className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${isSimplifiedView ? 'border-none pb-0' : 'pb-2.5 border-b border-slate-900/60'}`}>
          <div className="flex items-center gap-2">
            <span className={`inline-block w-2.5 h-2.5 rounded-full shrink-0 ${isSimplifiedView ? 'bg-cyan-500 shadow-lg shadow-cyan-950 animate-pulse' : 'bg-emerald-400 animate-pulse'}`} />
            <div className="flex flex-col">
              <span className="font-mono text-[9px] text-slate-400 font-bold uppercase tracking-wider">
                {isSimplifiedView ? 'IMMERSIVE SANDBOX ACTIVE // MINIMALIST VIEW' : 'Simulation Sequence Monitor'}
              </span>
              {!isSimplifiedView ? (
                <div className="font-mono text-[10.5px] text-emerald-400 font-bold flex items-center gap-1.5 flex-wrap">
                  <span>ACTIVE PATHWAY ROUTE:</span>
                  <span className="bg-emerald-950/70 px-2 py-0.5 border border-emerald-900/50 rounded text-emerald-300 font-mono font-bold">
                    {packets.length > 0 
                      ? `STEP ${UNICODE_CIRCLES[currentActivePacketIndex] || currentActivePacketIndex + 1} OF ${packets.length}` 
                      : 'BOUND PORT LISTEN ACTIVE'}
                  </span>
                </div>
              ) : (
                <span className="font-mono text-[10px] text-cyan-400 font-bold uppercase">
                  Click any chassis/node components on the grid to change its color, size, or name live
                </span>
              )}
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            {/* Immersive View Toggle Button */}
            <button
              onClick={() => setIsSimplifiedView(!isSimplifiedView)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border font-mono text-[9.5px] font-bold uppercase transition-all duration-200 cursor-pointer shadow-md ${
                isSimplifiedView 
                  ? 'bg-cyan-500/20 text-cyan-400 border-cyan-500/60 hover:bg-cyan-500/30' 
                  : 'bg-slate-900 hover:bg-slate-850 text-slate-300 border-slate-800'
              }`}
              title="Toggle Immersive Full-Workspace View"
            >
              {isSimplifiedView ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              <span>{isSimplifiedView ? 'Exit Immersive' : 'Immersive View'}</span>
            </button>
            
            <span className="text-[10px] sm:hidden md:inline-block font-mono text-slate-400 bg-slate-900/60 border border-slate-850 px-2.5 py-1 rounded">
              {interactionMode === 'drag' 
                ? '💡 Drag Node to space components' 
                : '💡 Navigation Board Active: drag empty screen to Pan'}
            </span>
          </div>
        </div>

        {/* Row 2: Flow Speed slider, Layout selector, Download MP4 button, and Paint Device swatches */}
        <div className="flex flex-wrap items-center gap-3">
          
          {/* Hide these general widgets in Simplified Focus View */}
          {!isSimplifiedView && (
            <>
              {/* Global Flow Speed controller */}
              <div className="flex items-center gap-2 bg-slate-900/60 border border-slate-850 rounded-lg px-2.5 py-1.5 text-xs text-slate-300">
                <Activity className="w-3.5 h-3.5 text-emerald-400" />
                <span className="font-mono text-[8.5px] font-bold text-slate-400">SPEED:</span>
                <input
                  type="range"
                  min="0.2"
                  max="3.0"
                  step="0.1"
                  value={globalSpeed}
                  onChange={(e) => onGlobalSpeedChange(Number(e.target.value))}
                  className="w-14 sm:w-20 h-1 bg-slate-950 rounded cursor-pointer accent-emerald-500"
                  title="Drag slider to scale real-time network flow animation speed"
                />
                <span className="font-mono text-[9.5px] text-slate-200 font-bold w-6 text-right">
                  {globalSpeed}x
                </span>
              </div>

              {/* Grid Layout Dropdown Selection */}
              <div className="flex items-center gap-1.5 bg-slate-900/60 border border-slate-850 rounded-lg px-2.5 py-1.5 text-xs text-slate-300">
                <span className="font-mono text-[8.5px] font-bold text-slate-400 uppercase">GRID:</span>
                <select
                  value={layoutMode}
                  onChange={(e) => onLayoutModeChange(e.target.value as any)}
                  className="bg-transparent text-[10.5px] font-mono font-bold text-slate-100 uppercase focus:outline-none cursor-pointer border-none outline-none py-0 px-0 [&>option]:bg-slate-950 [&>option]:text-slate-200"
                >
                  <option value="horizontal">Horizontal Line</option>
                  <option value="vertical">Vertical Stack</option>
                  <option value="distributed">Distributed Grid</option>
                </select>
              </div>
            </>
          )}

          {/* Interaction Mode Button Group */}
          <div className="flex items-center bg-slate-900/60 border border-slate-850 rounded-lg p-0.5 text-xs text-slate-300">
            <button
              onClick={() => setInteractionMode('drag')}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded font-mono text-[9px] font-bold uppercase transition-all duration-200 ${
                interactionMode === 'drag'
                  ? 'bg-cyan-500 text-slate-950 font-black shadow'
                  : 'hover:bg-slate-850 text-slate-400 hover:text-slate-100 cursor-pointer'
              }`}
              title="Drag Mode: Click and hold any node/device to rearrange its position on the grid"
            >
              <MousePointer className="w-3.5 h-3.5" />
              <span>Drag Node</span>
            </button>
            <button
              onClick={() => setInteractionMode('move')}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded font-mono text-[9px] font-bold uppercase transition-all duration-200 ${
                interactionMode === 'move'
                  ? 'bg-cyan-500 text-slate-950 font-black shadow'
                  : 'hover:bg-slate-850 text-slate-400 hover:text-slate-100 cursor-pointer'
              }`}
              title="Move Mode: Click and drag anywhere (even on nodes) to pan the whole workspace board"
            >
              <Move className="w-3.5 h-3.5" />
              <span>Move Board</span>
            </button>
          </div>

          {/* H.264 Universal Video Downloader Button */}
          <button
            onClick={isRecording ? stopRecording : startRecording}
            className={`flex items-center gap-1.5 font-mono text-[9.5px] font-bold uppercase transition px-3 py-1.5 border rounded-lg shadow-md ${
              isRecording
                ? 'bg-rose-950/60 hover:bg-rose-900 text-rose-400 border-rose-800'
                : 'bg-emerald-600 hover:bg-emerald-500 text-white border-emerald-500 cursor-pointer shadow-emerald-950'
            }`}
            title="Saves whiteboard animation loop as a widely playable H.264 MP4 file"
          >
            {isRecording ? (
              <>
                <Square className="w-2.5 h-2.5 text-rose-400 fill-rose-400 animate-pulse" />
                <span>REC: {recordedSeconds}S // STOP</span>
              </>
            ) : (
              <>
                <Video className="w-3.5 h-3.5 text-white" />
                <span>Download Video</span>
              </>
            )}
          </button>

          {/* Interactive Paint Palette Component - Hide in Simplified View as custom floating handles editor */}
          {!isSimplifiedView && (
            <div className="flex flex-wrap items-center gap-2 bg-slate-900/40 border border-slate-850 p-1.5 rounded-lg text-xs text-slate-300 ml-auto select-none">
              <span className="font-mono text-[8.5px] font-bold text-slate-400 uppercase px-1.5 py-0.5 bg-slate-950 border border-slate-900 rounded select-none">
                PAINT ACTIVE CHASSIS:
              </span>
              <div className="flex items-center gap-1">
                {PALETTE_COLORS.map((color) => {
                  const isSelected = !!selectedNodeId;
                  const targetColorMatch = isSelected && nodes.find(n => n.id === selectedNodeId)?.color === color.hex;
                  
                  return (
                    <button
                      key={color.hex}
                      onClick={() => {
                        if (isSelected) {
                          const nodeRecord = nodes.find(n => n.id === selectedNodeId);
                          if (nodeRecord && onUpdateNode) {
                            onUpdateNode({ ...nodeRecord, color: color.hex });
                          }
                        }
                      }}
                      className={`w-4 h-4 rounded-full border transition hover:scale-125 cursor-pointer relative flex items-center justify-center ${
                        isSelected 
                          ? 'active:scale-95 hover:shadow-cyan-950' 
                          : 'opacity-25 cursor-not-allowed'
                      }`}
                      style={{ 
                        backgroundColor: color.hex,
                        borderColor: targetColorMatch ? '#ffffff' : 'rgba(255,255,255,0.15)',
                      }}
                      disabled={!isSelected}
                      title={isSelected ? `Paint selected element to ${color.name}` : `Click any device to colorize!`}
                    >
                      {targetColorMatch && (
                        <span className="w-1 h-1 rounded-full bg-slate-950" />
                      )}
                    </button>
                  );
                })}
              </div>
              {selectedNodeId ? (
                <span className="text-[9px] font-mono text-cyan-400 font-bold max-w-[130px] truncate bg-slate-950 border border-slate-900 px-1.5 py-0.5 rounded uppercase">
                  → PAINTING "{nodes.find(n => n.id === selectedNodeId)?.label}"
                </span>
              ) : (
                <span className="text-[8.5px] font-mono text-slate-500 italic px-1 select-none">
                  (click device to colorize)
                </span>
              )}
            </div>
          )}

        </div>
      </div>

      {/* 2. MAIN UNBLOCKED VISUAL VIEWPORT (Assign containerRef here to establish precise canvas sizing limits) */}
      <div 
        ref={containerRef}
        className="relative flex-1 w-full overflow-hidden bg-[#030308] select-none"
      >
        <canvas
          ref={canvasRef}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          className="absolute inset-0 w-full h-full cursor-grab active:cursor-grabbing block touch-none"
        />

        {/* Real-time high-fidelity recording state indicator */}
        {isRecording && (
          <div className="absolute top-4 left-4 bg-emerald-950/90 backdrop-blur-md border border-emerald-500/80 p-3 rounded-lg shadow-2xl z-25 flex items-center gap-2.5 font-mono text-[9.5px] text-emerald-300 animate-in fade-in slide-in-from-top-1 duration-200">
            <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping shrink-0" />
            <div className="flex flex-col">
              <span className="font-bold uppercase tracking-wider text-[10px] text-emerald-200">WHITEBOARD RECORDER ACTIVE</span>
              <span className="text-slate-300 text-[8.5px]">Capturing path elements start-to-finish // {recordedSeconds}s elapsed</span>
            </div>
          </div>
        )}

        {/* FLOATING CONTEXTUAL NODE PARAMETERS OVERLAY (Custom panel floating near screen top/right, only editing selected element) */}
        {selectedNodeId && (
          (() => {
            const selectedNode = nodes.find(n => n.id === selectedNodeId);
            if (!selectedNode) return null;
            return (
              <div 
                style={finalPanelStyles}
                onMouseDown={handlePanelDragStart}
                onTouchStart={handlePanelDragStart}
                className="draggable-panel absolute bg-[#05050e]/95 hover:bg-[#05050e]/98 active:bg-[#05050e]/98 focus-within:opacity-100 backdrop-blur-md border border-cyan-500/70 p-2.5 rounded-lg shadow-2xl z-30 w-56 opacity-95 hover:opacity-100 transition-opacity duration-200 cursor-move select-none animate-in fade-in duration-200"
                title="Drag this panel to position it anywhere"
              >
                <div className="flex items-center justify-between border-b border-slate-900 pb-1 mb-2 cursor-move select-none">
                  <div className="flex items-center gap-1.5 min-w-0 flex-1">
                    <span className="w-2 h-2 rounded-full shrink-0 animate-pulse" style={{ backgroundColor: selectedNode.color || '#38bdf8' }} />
                    <span 
                      className="font-mono text-[10px] font-black text-slate-100 uppercase tracking-wider truncate cursor-pointer hover:underline"
                      title="Toggle Minimize"
                      onClick={() => setIsPanelMinimized(!isPanelMinimized)}
                    >
                      {selectedNode.label}
                    </span>
                  </div>
                  <div className="flex items-center gap-1 shrink-0 select-none">
                    <button
                      onClick={() => setIsPanelMinimized(!isPanelMinimized)}
                      className="text-[8px] font-mono text-cyan-400 hover:text-cyan-300 transition cursor-pointer font-bold border border-slate-800 bg-slate-950 px-1 py-0.5 rounded"
                      title={isPanelMinimized ? "Expand settings" : "Minimize panel settings"}
                    >
                      {isPanelMinimized ? "EXP" : "MIN"}
                    </button>
                    <button
                      onClick={() => {
                        if (onSelectNode) onSelectNode({} as any);
                      }}
                      className="text-[8px] font-mono text-slate-400 hover:text-rose-400 transition cursor-pointer font-bold border border-slate-800 bg-slate-950 px-1 py-0.5 rounded"
                      title="Dismiss"
                    >
                      ✕
                    </button>
                  </div>
                </div>

                {!isPanelMinimized && (
                  <div className="space-y-2 font-mono text-[10px] animate-in slide-in-from-top-1 duration-150">
                    {/* Change Label */}
                    <div className="space-y-0.5">
                      <span className="text-slate-400 text-[8px] uppercase tracking-wider block">1. Rename Block</span>
                      <input
                        type="text"
                        value={selectedNode.label}
                        onChange={(e) => onUpdateNode && onUpdateNode({ ...selectedNode, label: e.target.value })}
                        className="w-full bg-slate-950 border border-slate-800 rounded px-2 py-0.5 text-slate-200 outline-none focus:border-cyan-500/60 font-mono text-[10px]"
                      />
                    </div>

                    {/* Change Size */}
                    <div className="space-y-0.5">
                      <div className="flex justify-between items-center text-[8px] text-slate-400 font-bold">
                        <span className="uppercase tracking-wider">2. Dimensions Scale</span>
                        <span className="text-cyan-400">{selectedNode.size || 35}px</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-[7.5px] text-slate-500 font-bold">MIN</span>
                        <input
                          type="range"
                          min="20"
                          max="65"
                          value={selectedNode.size || 35}
                          onChange={(e) => onUpdateNode && onUpdateNode({ ...selectedNode, size: Number(e.target.value) })}
                          className="flex-1 accent-cyan-500 h-1 cursor-pointer bg-slate-950 rounded"
                        />
                        <span className="text-[7.5px] text-slate-500 font-bold">MAX</span>
                      </div>
                    </div>

                    {/* Change Color Swatches */}
                    <div className="space-y-1 pt-0.5">
                      <span className="text-slate-400 text-[8px] uppercase tracking-wider block">3. Color Swatches</span>
                      <div className="grid grid-cols-4 gap-1">
                        {PALETTE_COLORS.map((color) => {
                          const isMatched = selectedNode.color === color.hex;
                          return (
                            <button
                              key={color.hex}
                              onClick={() => onUpdateNode && onUpdateNode({ ...selectedNode, color: color.hex })}
                              className="h-4.5 rounded border transition hover:scale-105 active:scale-95 flex items-center justify-center cursor-pointer"
                              style={{ backgroundColor: color.hex, borderColor: isMatched ? '#ffffff' : 'rgba(255,255,255,0.1)' }}
                              title={color.name}
                            >
                              {isMatched && (
                                <span className="w-1 h-1 rounded-full bg-slate-950" />
                              )}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Node IP, Port bound indicators if defined */}
                    {(selectedNode.ip || selectedNode.port) && (
                      <div className="pt-1 border-t border-slate-900 mt-1 text-[7.5px] text-slate-500 flex flex-col gap-0.5">
                        {selectedNode.ip && <span>• IP: {selectedNode.ip}</span>}
                        {selectedNode.port && <span>• PORT: {selectedNode.port}</span>}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })()
        )}
      </div>

      {/* 3. COMPONENT SIZER WORKBENCH */}
      {!isSimplifiedView && (
        <div className="w-full bg-[#05050c] border-t border-slate-900/80 p-3 sm:p-4 shrink-0 z-20">
          <div className="flex items-center gap-2 pb-2 border-b border-slate-900/60 mb-2.5 select-none">
            <Settings className="w-3.5 h-3.5 text-cyan-400" />
            <span className="font-mono text-[9px] font-bold text-slate-300 uppercase tracking-widest">
              COMPONENT SIZER WORKBENCH // RESIZE LIVE TO PREVENT OVERLAPS
            </span>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 max-h-[140px] overflow-y-auto pr-1 select-none">
            {nodes.map((node, idx) => (
              <div key={node.id} className="bg-slate-950 p-2 border border-slate-900 rounded-lg flex flex-col gap-1">
                <div className="flex justify-between items-center text-[10.5px]">
                  <span className="font-mono font-bold text-slate-200 truncate max-w-[70%] flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: node.color }} />
                    {node.label}
                  </span>
                  <span className="font-mono text-[9px] text-cyan-400 font-bold bg-slate-900 px-1.5 py-0.5 rounded border border-slate-800">
                    {node.size || 35}px
                  </span>
                </div>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-[8px] font-mono text-slate-500">MIN</span>
                  <input
                    type="range"
                    min="20"
                    max="65"
                    value={node.size || 35}
                    onChange={(e) => onUpdateNode && onUpdateNode({ ...node, size: Number(e.target.value) })}
                    className="flex-1 accent-cyan-500 h-1 cursor-pointer bg-slate-900 rounded"
                  />
                  <span className="text-[8px] font-mono text-slate-500">MAX</span>
                </div>
              </div>
            ))}
            {nodes.length === 0 && (
              <div className="col-span-full text-center py-4 text-[10px] text-slate-500 italic">
                No active chassis/devices found on the grid. Move presets or type system sentences to compile nodes!
              </div>
            )}
          </div>
        </div>
      )}

      {/* 4. SEPARATE NON-OVERLAPPING BOTTOM STATUS & ZOOM BAR */}
      <div className="w-full bg-slate-950 border-t border-slate-900 p-2.5 sm:p-3 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0 z-20 text-xs font-mono select-none">
        
        {/* Left side zoom controls */}
        <div className="flex items-center gap-2">
          <button 
            onClick={handleZoomIn} 
            className="p-1.5 hover:bg-slate-900 rounded border border-slate-800 text-slate-200 transition active:scale-95 cursor-pointer flex items-center justify-center"
            title="Zoom In"
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </button>
          <button 
            onClick={handleZoomOut} 
            className="p-1.5 hover:bg-slate-900 rounded border border-slate-800 text-slate-200 transition active:scale-95 cursor-pointer flex items-center justify-center"
            title="Zoom Out"
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </button>
          <button 
            onClick={handleResetView} 
            className="p-1 px-2.5 font-mono text-[9px] font-bold hover:bg-slate-900 rounded border border-slate-800 text-slate-200 transition cursor-pointer flex items-center"
            title="Reset whiteboard view to initial position"
          >
            RESET VIEW
          </button>
          <div className="h-4 w-[1px] bg-slate-850 mx-1" />
          <span className="font-mono text-[9.5px] text-cyan-400 font-bold">ZOOM: {Math.round(zoom * 100)}%</span>
        </div>

        {/* Right side system status and recording indicators */}
        <div className="flex items-center gap-3 text-[9px]">
          {isRecording && (
            <div className="font-mono text-[9px] text-rose-400 font-bold bg-rose-950/50 py-1 px-2 border border-rose-900/50 rounded animate-pulse flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
              <span>RECORDING ACTIVE</span>
            </div>
          )}
          <div className="flex items-center gap-1.5 text-slate-400">
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse shrink-0" />
            <span>COSMIC MATRIX // GRID INTERVALS: 32PX</span>
          </div>
        </div>

      </div>
    </div>
  );
};
