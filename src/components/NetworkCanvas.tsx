import React, { useRef, useEffect, useState } from 'react';
import { SimulationConfig } from '../types';

interface NetworkCanvasProps {
  config: SimulationConfig;
  onMetricsUpdate: (blockedPackets: number, allowedPackets: number) => void;
}

interface Particle {
  id: string;
  x: number;
  y: number;
  startX: number;
  startY: number;
  targetX: number;
  targetY: number;
  t: number; // interpolation progress (0 to 1)
  speed: number;
  size: number;
  color: string;
  type: 'valid' | 'ddos';
  botIndex?: number;
}

interface Spark {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  color: string;
  size: number;
}

interface Smoke {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  alpha: number;
  life: number;
  maxLife: number;
}

interface PulseWave {
  radius: number;
  maxRadius: number;
  alpha: number;
  speed: number;
}

export const NetworkCanvas: React.FC<NetworkCanvasProps> = ({ config, onMetricsUpdate }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Particle systems
  const particlesRef = useRef<Particle[]>([]);
  const sparksRef = useRef<Spark[]>([]);
  const smokeRef = useRef<Smoke[]>([]);
  const pulsesRef = useRef<PulseWave[]>([]);

  // Simulation state
  const serverPulseTimer = useRef<number>(0);
  const ddosSpawnTimer = useRef<number>(0);
  const validSpawnTimer = useRef<number>(0);
  const serverShake = useRef<number>(0);
  const firewallImpactFlash = useRef<number>(0);

  // Resize canvas to fill its parent
  useEffect(() => {
    const handleResize = () => {
      if (canvasRef.current && containerRef.current) {
        canvasRef.current.width = containerRef.current.clientWidth;
        canvasRef.current.height = containerRef.current.clientHeight;
      }
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    
    // Add a small observer to catch container resizing
    const resizeObserver = new ResizeObserver(() => {
      handleResize();
    });
    if (containerRef.current) {
      resizeObserver.observe(containerRef.current);
    }

    return () => {
      window.removeEventListener('resize', handleResize);
      resizeObserver.disconnect();
    };
  }, []);

  // Main Animation Loop
  useEffect(() => {
    let animationFrameId: number;
    let lastTime = performance.now();

    const render = (time: number) => {
      const dt = (time - lastTime) / 1000;
      lastTime = time;

      const canvas = canvasRef.current;
      if (!canvas) {
        animationFrameId = requestAnimationFrame(render);
        return;
      }

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        animationFrameId = requestAnimationFrame(render);
        return;
      }

      const width = canvas.width;
      const height = canvas.height;

      // Positions (dynamic relative to canvas size)
      const serverX = width * 0.5;
      const serverY = height * 0.55;
      const serverRadius = Math.min(width, height) * 0.08;

      const clientX = width * 0.85;
      const clientY = height * 0.55;

      const firewallX = width * 0.32;
      const firewallTop = height * 0.22;
      const firewallBottom = height * 0.82;

      // Host cluster of bots
      const botCenterY = height * 0.55;
      const botCenterX = width * 0.12;
      const botRadius = Math.min(width, height) * 0.03;

      // 5 staggered bot locations
      const botPositions = [
        { x: botCenterX - 20, y: botCenterY - 70 },
        { x: botCenterX + 15, y: botCenterY - 35 },
        { x: botCenterX - 10, y: botCenterY },
        { x: botCenterX + 20, y: botCenterY + 40 },
        { x: botCenterX - 15, y: botCenterY + 75 },
      ];

      // 1. DRAW DARK GRID BLUEPRINT BACKGROUND
      ctx.fillStyle = '#050b14'; // Dark navy/black cyan
      ctx.fillRect(0, 0, width, height);

      // Draw faint blueprint grid
      ctx.strokeStyle = '#0e1e33';
      ctx.lineWidth = 1;
      const gridSize = 40;
      
      // Vertical lines
      for (let x = 0; x < width; x += gridSize) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
        ctx.stroke();
      }
      // Horizontal lines
      for (let y = 0; y < height; y += gridSize) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
      }

      // 2. TIMERS & SPAWN EVENTS

      // A. Valid Client Packet Spawn (continuous green packets)
      validSpawnTimer.current += dt;
      const spawnFrequency = 1 / config.validTrafficRate; // packets/sec
      if (validSpawnTimer.current >= spawnFrequency) {
        validSpawnTimer.current = 0;
        particlesRef.current.push({
          id: Math.random().toString(),
          x: clientX,
          y: clientY,
          startX: clientX,
          startY: clientY,
          targetX: serverX,
          targetY: serverY,
          t: 0,
          speed: 0.35 + Math.random() * 0.1,
          size: 6,
          color: '#10b981', // green
          type: 'valid'
        });
      }

      // B. DDoS botnet wave spawn
      ddosSpawnTimer.current += dt;
      // High intensity = extremely rapid waves of chaotic connections
      if (config.ddosIntensity > 0) {
        // Base delay scale: lower ddosIntensity -> higher delay. At 100, we spawn basically every frame.
        const ddosDelay = Math.max(0.005, 0.45 - (config.ddosIntensity / 100) * 0.44);
        if (ddosSpawnTimer.current >= ddosDelay) {
          ddosSpawnTimer.current = 0;
          
          // Spawn multiple packets depending on intensity (e.g. from all 5 bot positions)
          const spawnCount = Math.ceil(config.ddosIntensity / 20);
          for (let k = 0; k < spawnCount; k++) {
            const botIdx = Math.floor(Math.random() * botPositions.length);
            const botOrigin = botPositions[botIdx];
            
            // Random slight vertical offset to Target to create nice chaotic fan pattern
            const targetOffset = (Math.random() - 0.5) * 40;

            particlesRef.current.push({
              id: Math.random().toString(),
              x: botOrigin.x,
              y: botOrigin.y,
              startX: botOrigin.x,
              startY: botOrigin.y,
              targetX: serverX - 20, // targeted slightly to left interface of server
              targetY: serverY + targetOffset,
              t: 0,
              speed: 0.45 + Math.random() * 0.3, // very rapid
              size: 4 + Math.random() * 3,
              color: '#ef4444', // red
              type: 'ddos',
              botIndex: botIdx
            });
          }
        }
      }

      // C. Server pulse wave generator
      serverPulseTimer.current += dt;
      if (serverPulseTimer.current >= 1.5) {
        serverPulseTimer.current = 0;
        pulsesRef.current.push({
          radius: serverRadius * 0.5,
          maxRadius: serverRadius * 2.8,
          alpha: 0.4,
          speed: 40 + Math.random() * 20
        });
      }

      // 3. PHYSICAL INTERFACES & CONNECTORS (THE PATTERNS)

      // Baseline Circuit lines connecting client to server
      ctx.beginPath();
      ctx.strokeStyle = '#1e293b';
      ctx.lineWidth = 2;
      ctx.save();
      ctx.setLineDash([6, 6]);
      
      // Client connection line (perfect smooth line)
      ctx.moveTo(clientX, clientY);
      ctx.lineTo(serverX, serverY);
      ctx.stroke();

      // Botnet connection layout lines (faint dark lines pointing to server/firewall)
      botPositions.forEach(pos => {
        ctx.beginPath();
        ctx.moveTo(pos.x, pos.y);
        ctx.lineTo(serverX, serverY);
        ctx.stroke();
      });
      ctx.restore();

      // 4. ANIMATE & DRAW firewall barriers
      if (config.firewallActive) {
        if (firewallImpactFlash.current > 0) {
          firewallImpactFlash.current -= dt * 4;
        }
      }

      // Render Firewall Wall
      ctx.save();
      // Glow effect if active
      if (config.firewallActive) {
        ctx.shadowBlur = 15;
        ctx.shadowColor = '#06b6d4'; // bright cyan
        ctx.strokeStyle = '#06b6d4';
        ctx.lineWidth = 4;
      } else {
        ctx.strokeStyle = '#475569'; // dim bypassed grey
        ctx.lineWidth = 2;
        ctx.setLineDash([4, 4]);
      }

      ctx.beginPath();
      ctx.moveTo(firewallX, firewallTop);
      ctx.lineTo(firewallX, firewallBottom);
      ctx.stroke();
      ctx.restore();

      // Top and bottom cap nodes for Firewall
      ctx.fillStyle = config.firewallActive ? '#06b6d4' : '#475569';
      ctx.beginPath();
      ctx.arc(firewallX, firewallTop, 5, 0, Math.PI * 2);
      ctx.arc(firewallX, firewallBottom, 5, 0, Math.PI * 2);
      ctx.fill();

      // Label details for Firewall
      ctx.fillStyle = config.firewallActive ? '#06b6d4' : '#64748b';
      ctx.font = 'bold 9px "JetBrains Mono", monospace';
      ctx.textAlign = 'center';
      ctx.fillText(
        config.firewallActive ? '🛡️ FIREWALL ACTIVE' : '⚠️ FIREWALL BYPASSED',
        firewallX,
        firewallTop - 12
      );
      ctx.font = '8px "JetBrains Mono", monospace';
      ctx.fillStyle = config.firewallActive ? '#22d3ee' : '#475569';
      ctx.fillText(
        config.firewallActive ? 'BLOCKING MALICIOUS L4-L7 FLOODS' : 'UNGUARDED',
        firewallX,
        firewallTop - 3
      );

      // Simple grid wireframe on active firewall to make it look technical
      if (config.firewallActive) {
        ctx.save();
        ctx.strokeStyle = 'rgba(6, 182, 212, 0.2)';
        ctx.lineWidth = 1;
        const segmentCount = 10;
        const segmentHeight = (firewallBottom - firewallTop) / segmentCount;
        for (let i = 0; i <= segmentCount; i++) {
          const cy = firewallTop + i * segmentHeight;
          ctx.beginPath();
          ctx.moveTo(firewallX - 8, cy);
          ctx.lineTo(firewallX + 8, cy);
          ctx.stroke();

          // Horizontal electric mesh feel inside canvas
          ctx.fillStyle = 'rgba(6, 182, 212, 0.4)';
          ctx.beginPath();
          ctx.arc(firewallX, cy, 2, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.restore();
      }

      // 5. UPDATE AND DRAW PARTICLES (THE PACKETS)
      let metricsBlockedThisFrame = 0;
      let metricsAllowedThisFrame = 0;

      const activeParticles: Particle[] = [];

      for (let i = 0; i < particlesRef.current.length; i++) {
        const p = particlesRef.current[i];
        p.t += p.speed * dt;

        // Linear interpolation path representing packet travel
        p.x = p.startX + (p.targetX - p.startX) * p.t;
        p.y = p.startY + (p.targetY - p.startY) * p.t;

        // Check if ddos packet hits active firewall
        if (p.type === 'ddos' && config.firewallActive && p.x >= firewallX) {
          // INTERACTION: Bounces off and dissolves into smoke
          metricsBlockedThisFrame += 1;
          firewallImpactFlash.current = 1.0;

          // Impact coordinate on the firewall wall
          const impactY = p.y;

          // Spawn spark particles flying backwards/scattered to the left
          const sparkCount = 3 + Math.floor(Math.random() * 3);
          for (let s = 0; s < sparkCount; s++) {
            // Speed and angle directed back or sideways (between Math.PI/2 and 3*Math.PI/2)
            const angle = Math.PI + (Math.random() - 0.5) * 1.5; 
            const speed = 60 + Math.random() * 90;
            sparksRef.current.push({
              x: firewallX,
              y: impactY,
              vx: Math.cos(angle) * speed,
              vy: Math.sin(angle) * speed,
              life: 1.0,
              maxLife: 0.4 + Math.random() * 0.4,
              color: Math.random() > 0.5 ? '#f87171' : '#f59e0b', // Red-orange hybrid sparks
              size: 2 + Math.random() * 2
            });
          }

          // Spawn grey smoke particles expanding and dissolving upward
          if (Math.random() > 0.4) {
            smokeRef.current.push({
              x: firewallX,
              y: impactY,
              vx: -(10 + Math.random() * 20), // drift backward slightly
              vy: -(15 + Math.random() * 25), // float upward
              size: 5 + Math.random() * 8,
              alpha: 0.7,
              life: 1.0,
              maxLife: 0.8 + Math.random() * 0.6
            });
          }

          // Exclude this particle from next frames (it dissolved)
          continue;
        }

        // Check if packet reached its destination (t >= 1)
        if (p.t >= 1.0) {
          if (p.type === 'valid') {
            metricsAllowedThisFrame += 1;
          } else {
            // DDOS packet hit server! (No firewall or firewall bypassed)
            metricsAllowedThisFrame += 0.2; // Registered as hostile loads
            serverShake.current = Math.min(20, serverShake.current + 0.8);
            
            // Red alert sparks on server to show direct hit damage
            if (Math.random() > 0.6) {
              const theta = Math.random() * Math.PI * 2;
              const spd = 40 + Math.random() * 60;
              sparksRef.current.push({
                x: serverX + (Math.random() - 0.5) * 10,
                y: serverY + (Math.random() - 0.5) * 10,
                vx: Math.cos(theta) * spd,
                vy: Math.sin(theta) * spd,
                life: 1.0,
                maxLife: 0.3 + Math.random() * 0.3,
                color: '#ef4444',
                size: 2 + Math.random() * 2
              });
            }
          }
          continue; // Particle completed trajectory
        }

        // Draw active packets
        ctx.save();
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);

        // Add glow for larger visualization
        ctx.shadowBlur = 8;
        ctx.shadowColor = p.color;
        ctx.fill();
        ctx.restore();

        // Optional packet trailing wireframe tail
        ctx.strokeStyle = p.type === 'valid' ? 'rgba(16, 185, 129, 0.25)' : 'rgba(239, 68, 68, 0.25)';
        ctx.lineWidth = p.size * 0.6;
        ctx.beginPath();
        const tailOffset = 0.08;
        const tailX = p.startX + (p.targetX - p.startX) * Math.max(0, p.t - tailOffset);
        const tailY = p.startY + (p.targetY - p.startY) * Math.max(0, p.t - tailOffset);
        ctx.moveTo(p.x, p.y);
        ctx.lineTo(tailX, tailY);
        ctx.stroke();

        activeParticles.push(p);
      }
      particlesRef.current = activeParticles;

      // Report processed / blocked counts to dashboard state periodically
      if (metricsBlockedThisFrame > 0 || metricsAllowedThisFrame > 0) {
        onMetricsUpdate(metricsBlockedThisFrame, Math.floor(metricsAllowedThisFrame));
      }

      // 6. ANIMATE & DRAW PARTICLE COLLISION SPARKS (BOUNCING BITS)
      const activeSparks: Spark[] = [];
      for (let i = 0; i < sparksRef.current.length; i++) {
        const s = sparksRef.current[i];
        s.life -= dt / s.maxLife;

        if (s.life > 0) {
          // Physics mechanics
          s.x += s.vx * dt;
          s.y += s.vy * dt;
          
          // gravity or air resistance drift to render realistically
          s.vy += 65 * dt; // gravity arc downward

          ctx.fillStyle = s.color;
          ctx.globalAlpha = s.life;
          ctx.beginPath();
          ctx.arc(s.x, s.y, s.size * s.life, 0, Math.PI * 2);
          ctx.fill();
          ctx.globalAlpha = 1.0;

          activeSparks.push(s);
        }
      }
      sparksRef.current = activeSparks;

      // 7. ANIMATE & DRAW COMPREHENSIVE BLACK SMOKE (DISSOLVING TRAIL)
      const activeSmoke: Smoke[] = [];
      for (let i = 0; i < smokeRef.current.length; i++) {
        const sm = smokeRef.current[i];
        sm.life -= dt / sm.maxLife;

        if (sm.life > 0) {
          sm.x += sm.vx * dt;
          sm.y += sm.vy * dt;
          sm.size += dt * 6; // puff expansion
          sm.alpha = sm.life * 0.45;

          ctx.fillStyle = '#64748b'; // soft iron slate smoke
          ctx.globalAlpha = sm.alpha;
          ctx.beginPath();
          ctx.arc(sm.x, sm.y, sm.size, 0, Math.PI * 2);
          ctx.fill();
          ctx.globalAlpha = 1.0;

          activeSmoke.push(sm);
        }
      }
      smokeRef.current = activeSmoke;

      // 8. ANIMATE & DRAW PULSES LISTENING INDICATORS (CENTER SERVER RINGS)
      const activePulses: PulseWave[] = [];
      for (let k = 0; k < pulsesRef.current.length; k++) {
        const pulse = pulsesRef.current[k];
        pulse.radius += pulse.speed * dt;
        pulse.alpha = Math.max(0, 0.4 * (1 - pulse.radius / pulse.maxRadius));

        if (pulse.radius < pulse.maxRadius) {
          ctx.save();
          ctx.strokeStyle = '#3b82f6'; // faint blue pulsing wave
          ctx.lineWidth = 1.5;
          ctx.globalAlpha = pulse.alpha;
          ctx.shadowBlur = 10;
          ctx.shadowColor = '#3b82f6';
          ctx.beginPath();
          ctx.arc(serverX, serverY, pulse.radius, 0, Math.PI * 2);
          ctx.stroke();
          ctx.restore();

          activePulses.push(pulse);
        }
      }
      pulsesRef.current = activePulses;

      // 9. DRAW BOTNET CLUSTER NODE DISPLAY
      // Draw 5 bots
      botPositions.forEach((pos, idx) => {
        const isSpawningThisFrame = config.ddosIntensity > 0 && Math.random() > 0.85;
        
        ctx.save();
        ctx.shadowBlur = isSpawningThisFrame ? 15 : 6;
        ctx.shadowColor = '#ef4444';
        ctx.fillStyle = isSpawningThisFrame ? '#f87171' : '#b91c1c';
        
        ctx.beginPath();
        ctx.arc(pos.x, pos.y, botRadius * 0.6, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();

        // draw small technical node name
        ctx.fillStyle = '#94a3b8';
        ctx.font = '8px "JetBrains Mono", monospace';
        ctx.textAlign = 'center';
        ctx.fillText(`BOT #${idx + 1}`, pos.x, pos.y - 10);
      });

      // Botnet Header box
      ctx.fillStyle = 'rgba(239, 68, 68, 0.08)';
      ctx.strokeStyle = '#ef4444';
      ctx.lineWidth = 1;
      const bHBoxW = 120;
      const bHBoxH = 34;
      const bHBoxX = botCenterX - 60;
      const bHBoxY = botCenterY - 120;
      ctx.fillRect(bHBoxX, bHBoxY, bHBoxW, bHBoxH);
      ctx.strokeRect(bHBoxX, bHBoxY, bHBoxW, bHBoxH);

      ctx.fillStyle = '#f87171';
      ctx.font = 'bold 9px "JetBrains Mono", monospace';
      ctx.textAlign = 'center';
      ctx.fillText('🔴 DDOS BOTNET', botCenterX, bHBoxY + 14);

      ctx.fillStyle = '#94a3b8';
      ctx.font = '8px "JetBrains Mono", monospace';
      ctx.fillText(
        config.ddosIntensity > 0 
          ? `ATTACKING @ ${config.ddosIntensity}%` 
          : 'STANDBY / IDLE', 
        botCenterX, 
        bHBoxY + 26
      );

      // 10. DRAW VALID CLIENT DISPLAY
      ctx.save();
      ctx.shadowBlur = 8;
      ctx.shadowColor = '#10b981';
      ctx.fillStyle = '#10b981';
      ctx.beginPath();
      ctx.arc(clientX, clientY, botRadius * 0.9, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      // Client design grid pattern circle
      ctx.strokeStyle = '#059669';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(clientX, clientY, botRadius * 1.3, 0, Math.PI * 2);
      ctx.stroke();

      // Client labels
      ctx.fillStyle = 'rgba(16, 185, 129, 0.08)';
      ctx.strokeStyle = '#10b981';
      ctx.lineWidth = 1;
      const cBoxW = 110;
      const cBoxH = 34;
      const cBoxX = clientX - 55;
      const cBoxY = clientY - 60;
      ctx.fillRect(cBoxX, cBoxY, cBoxW, cBoxH);
      ctx.strokeRect(cBoxX, cBoxY, cBoxW, cBoxH);

      ctx.fillStyle = '#34d399';
      ctx.font = 'bold 9px "JetBrains Mono", monospace';
      ctx.textAlign = 'center';
      ctx.fillText('🟢 VALID CLIENT', clientX, cBoxY + 14);

      ctx.fillStyle = '#94a3b8';
      ctx.font = '7px "JetBrains Mono", monospace';
      ctx.fillText('IP: 203.0.113.88', clientX, cBoxY + 26);

      // 11. DRAW CENTER SERVER HOST
      if (serverShake.current > 0.05) {
        serverShake.current -= dt * 10; // shake decay
      } else {
        serverShake.current = 0;
      }

      // Dynamic offsets based on shake strength
      const randShakeX = (Math.random() - 0.5) * serverShake.current;
      const randShakeY = (Math.random() - 0.5) * serverShake.current;
      const drawServerX = serverX + randShakeX;
      const drawServerY = serverY + randShakeY;

      // Server Outer technical interface ring (gears of the machine)
      ctx.save();
      ctx.strokeStyle = serverShake.current > 4 ? '#ef4444' : '#3b82f6';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(drawServerX, drawServerY, serverRadius * 1.25, 0, Math.PI * 2);
      ctx.stroke();

      // Small tick marks on loop
      ctx.beginPath();
      ctx.setLineDash([2, 5]);
      ctx.arc(drawServerX, drawServerY, serverRadius * 1.4, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();

      // Server primary core circle
      ctx.save();
      const serverGlow = serverShake.current > 4 ? '#ef4444' : '#3b82f6';
      ctx.shadowBlur = 18;
      ctx.shadowColor = serverGlow;
      ctx.fillStyle = serverShake.current > 4 ? '#991b1b' : '#1e3a8a';
      ctx.beginPath();
      ctx.arc(drawServerX, drawServerY, serverRadius, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      // Main server labels in a cool tech overlay box
      ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
      ctx.strokeStyle = serverShake.current > 4 ? '#ef4444' : '#3b82f6';
      ctx.lineWidth = 1;
      const sBoxW = 160;
      const sBoxH = 50;
      const sBoxX = drawServerX - sBoxW / 2;
      const sBoxY = drawServerY + serverRadius * 1.35;
      
      ctx.fillRect(sBoxX, sBoxY, sBoxW, sBoxH);
      ctx.strokeRect(sBoxX, sBoxY, sBoxW, sBoxH);

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 9px "JetBrains Mono", monospace';
      ctx.textAlign = 'center';
      
      // Port Indicator label next to server core
      ctx.fillStyle = '#60a5fa';
      ctx.fillRect(drawServerX - 25, drawServerY - 8, 50, 16);
      ctx.fillStyle = '#ffffff';
      ctx.fillText('PORT 8080', drawServerX, drawServerY + 3);

      // Server Host Title text
      ctx.fillStyle = serverShake.current > 4 ? '#f87171' : '#60a5fa';
      ctx.fillText('🖥️ SERVER HOST', drawServerX, sBoxY + 14);

      ctx.fillStyle = '#94a3b8';
      ctx.font = '7px "JetBrains Mono", monospace';
      ctx.fillText('IP: 192.168.1.50:8080', drawServerX, sBoxY + 25);
      
      // Live State Label
      ctx.font = 'bold 7px "JetBrains Mono", monospace';
      if (serverShake.current > 12) {
        ctx.fillStyle = '#fb7185';
        ctx.fillText('🔴 CRITICAL: DDoS INTRUSION', drawServerX, sBoxY + 37);
      } else if (serverShake.current > 4) {
        ctx.fillStyle = '#f59e0b';
        ctx.fillText('🟡 RECV INTRUDER PACKETS', drawServerX, sBoxY + 37);
      } else {
        ctx.fillStyle = '#34d399';
        // Pulsing wave text label
        const heartPulse = (time % 800 > 400) ? '●' : ' ';
        ctx.fillText(`${heartPulse} LISTENING FOR PORT TRAFFIC`, drawServerX, sBoxY + 37);
      }

      animationFrameId = requestAnimationFrame(render);
    };

    animationFrameId = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [config]);

  return (
    <div 
      id="simulation-canvas-container"
      ref={containerRef} 
      className="relative w-full h-[380px] md:h-[460px] border border-slate-800 rounded-lg overflow-hidden bg-slate-950 shadow-inner"
    >
      <canvas 
        ref={canvasRef} 
        className="block w-full h-full cursor-crosshair"
      />
      {/* Absolute design overlay for technical grid aesthetic metadata coordinates */}
      <div className="absolute top-2 left-3 font-mono text-[8.5px] text-slate-500 pointer-events-none select-none">
        GRID REF: XY-8012 // RESOLUTION: RESPONSIVE // RENDERER: CANVAS2D_60FPS
      </div>
      <div className="absolute bottom-2 right-3 font-mono text-[8.5px] text-slate-500 pointer-events-none select-none">
        PROTOCOL: TCP/SYN-HTTP // SHIELD STATE: {config.firewallActive ? 'ENABLED [L7_RULE]' : 'NONE'}
      </div>
    </div>
  );
};
