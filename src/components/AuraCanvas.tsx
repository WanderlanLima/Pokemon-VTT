import React, { useEffect, useRef } from "react";
import { AnimatedAura, ANIMATED_AURAS } from "../auras";

interface AuraCanvasProps {
  auraId: string;
  scale?: number;
  
  // Real-time custom tweaks
  intensity?: number;
  opacity?: number;
  particleCount?: number;
  animationSpeed?: number;
  colorPrimary?: string;
  colorSecondary?: string;
  enableGlow?: boolean;
  enableDistortion?: boolean;
}

export const AuraCanvas: React.FC<AuraCanvasProps> = ({
  auraId,
  scale = 1.0,
  intensity,
  opacity,
  particleCount,
  animationSpeed,
  colorPrimary,
  colorSecondary,
  enableGlow,
  enableDistortion,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  
  // Keep values in mutable refs to avoid restarting requestAnimationFrame on every change
  const propsRef = useRef({
    auraId,
    scale,
    intensity,
    opacity,
    particleCount,
    animationSpeed,
    colorPrimary,
    colorSecondary,
    enableGlow,
    enableDistortion,
  });

  useEffect(() => {
    propsRef.current = {
      auraId,
      scale,
      intensity,
      opacity,
      particleCount,
      animationSpeed,
      colorPrimary,
      colorSecondary,
      enableGlow,
      enableDistortion,
    };
  }, [
    auraId,
    scale,
    intensity,
    opacity,
    particleCount,
    animationSpeed,
    colorPrimary,
    colorSecondary,
    enableGlow,
    enableDistortion,
  ]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animationFrameId: number;
    let time = 0;

    // Local state for particles and trails
    interface VisualParticle {
      x: number;
      y: number;
      vx: number;
      vy: number;
      size: number;
      life: number;
      maxLife: number;
      color: string;
      alpha: number;
      angle?: number;
      radius?: number;
      angularSpeed?: number;
      wobbleSpeed?: number;
      wobbleRange?: number;
      decay?: number;
      type?: string;
      trail?: { x: number; y: number }[];
      pulseOffset?: number;
      runeIndex?: number;
    }

    let particles: VisualParticle[] = [];
    let lightningBolts: { path: { x: number; y: number }[]; life: number; color: string }[] = [];
    let rings: { radius: number; maxRadius: number; opacity: number; color: string }[] = [];

    const resizeCanvas = () => {
      const container = containerRef.current;
      if (!container || !canvas) return;
      const rect = container.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) return;
      
      // Let the canvas be slightly wider than the token bounds to contain rich aura overflows gracefully
      const pixelRatio = window.devicePixelRatio || 1;
      const size = rect.width;
      
      // Pad to let sparks and distortion render outside the token border
      const renderSize = size * 2.2; 
      canvas.width = renderSize * pixelRatio;
      canvas.height = renderSize * pixelRatio;
      canvas.style.width = `${renderSize}px`;
      canvas.style.height = `${renderSize}px`;
      
      ctx.scale(pixelRatio, pixelRatio);
    };

    resizeCanvas();
    window.addEventListener("resize", resizeCanvas);

    const resizeObserver = new ResizeObserver((entries) => {
      for (let entry of entries) {
        if (entry.contentRect.width > 0 && entry.contentRect.height > 0) {
          resizeCanvas();
        }
      }
    });

    const currContainer = containerRef.current;
    if (currContainer) {
      resizeObserver.observe(currContainer);
    }

    // Initializer function for styling
    const spawnParticle = (
      cx: number, 
      cy: number, 
      activeRadius: number, 
      pPrimary: string, 
      pSecondary: string, 
      style: string
    ) => {
      const angle = Math.random() * Math.PI * 2;
      const speedMult = propsRef.current.animationSpeed ?? 1.0;
      const col = Math.random() > 0.4 ? pPrimary : pSecondary;

      let p: VisualParticle = {
        x: cx,
        y: cy,
        vx: 0,
        vy: 0,
        size: 2,
        life: 0,
        maxLife: 50,
        color: col,
        alpha: 1,
      };

      if (style === "ki-aura" || style === "elemental-fire") {
        // Nascem principalmente na base inferior do círculo para simular fogo surgindo de baixo
        const spawnAngle = Math.PI * (0.05 + Math.random() * 0.9); // ângulo focado embaixo (arco de 9 a 162 graus)
        const rad = activeRadius * (0.6 + Math.random() * 0.45);
        p.x = cx + Math.cos(spawnAngle) * rad;
        p.y = cy + Math.sin(spawnAngle) * rad * 0.4 + activeRadius * 0.25; 
        p.vx = (Math.cos(spawnAngle) * 0.35 + (Math.random() - 0.5) * 0.5) * speedMult;
        p.vy = - (1.1 + Math.random() * 2.1) * speedMult;
        p.size = 2.0 + Math.random() * 3.8;
        p.maxLife = 24 + Math.random() * 24;
        p.wobbleSpeed = 0.08 + Math.random() * 0.12;
        p.wobbleRange = 1.3 + Math.random() * 2.2;
        p.trail = [];
      } else if (style === "chakra-flow" || style === "elemental-wind") {
        // Nascimento concêntrico exato na casca do diâmetro para criar órbitas limpas
        p.angle = angle;
        p.radius = activeRadius * (0.85 + Math.random() * 0.32);
        p.angularSpeed = (0.024 + Math.random() * 0.034) * (Math.random() > 0.45 ? 1 : -1) * speedMult;
        p.x = cx + Math.cos(p.angle) * p.radius;
        p.y = cy + Math.sin(p.angle) * p.radius;
        p.size = 1.6 + Math.random() * 2.1;
        p.maxLife = 45 + Math.random() * 45;
        p.alpha = 0.5 + Math.random() * 0.5;
        p.trail = [];
      } else if (style === "living-shadow") {
        // Sobem se espalhando organicamente como gavinhas de fumaça volumosa
        const spawnAngle = Math.random() * Math.PI * 2;
        const rad = activeRadius * (0.4 + Math.random() * 0.55);
        p.x = cx + Math.cos(spawnAngle) * rad;
        p.y = cy + Math.sin(spawnAngle) * rad;
        p.vx = (Math.random() - 0.5) * 0.35 * speedMult;
        p.vy = - (0.35 + Math.random() * 0.75) * speedMult;
        p.size = 6.0 + Math.random() * 14.0; // Puffs gordo de fumaça
        p.maxLife = 55 + Math.random() * 45;
        p.color = Math.random() > 0.35 ? "#040208" : (Math.random() > 0.5 ? col : "#111827");
        p.alpha = 0.25 + Math.random() * 0.4;
        p.wobbleSpeed = 0.03 + Math.random() * 0.04;
        p.wobbleRange = 1.5 + Math.random() * 3.0;
      } else if (style === "elemental-ice") {
        // Brilhos lentos, nevando ou orbitando estaticamente de forma calma
        const spawnAngle = Math.random() * Math.PI * 2;
        const rad = activeRadius * (0.8 + Math.random() * 0.4);
        p.x = cx + Math.cos(spawnAngle) * rad;
        p.y = cy + Math.sin(spawnAngle) * rad;
        p.vx = (Math.random() - 0.5) * 0.15 * speedMult;
        p.vy = (Math.random() - 0.35) * 0.25 * speedMult; // flutuabilidade quase neutra
        p.size = 1.8 + Math.random() * 2.8;
        p.maxLife = 55 + Math.random() * 55;
        p.angle = Math.random() * Math.PI * 2;
        p.angularSpeed = (0.01 + Math.random() * 0.02) * speedMult;
        p.type = Math.random() > 0.65 ? "shard" : "sparkle";
        p.pulseOffset = Math.random() * Math.PI * 2;
      } else if (style === "elemental-lightning") {
        // Faíscas estáticas imediatas, piscando caóticas na borda de energia
        const spawnAngle = Math.random() * Math.PI * 2;
        const rad = activeRadius * (0.9 + Math.random() * 0.25);
        p.x = cx + Math.cos(spawnAngle) * rad;
        p.y = cy + Math.sin(spawnAngle) * rad;
        p.vx = (Math.random() - 0.5) * 3.5 * speedMult; 
        p.vy = (Math.random() - 0.5) * 3.5 * speedMult;
        p.size = 1.0 + Math.random() * 1.8;
        p.maxLife = 4 + Math.floor(Math.random() * 7); // Durabilidade curtíssima para piscar instantâneo
        p.color = Math.random() > 0.3 ? "#ffffff" : col; 
        p.alpha = 0.9 + Math.random() * 0.1;
      } else if (style === "arcane-runes") {
        // Runas místicas que sobem rotacionando graciosamente
        const spawnAngle = Math.random() * Math.PI * 2;
        const rad = activeRadius * (0.65 + Math.random() * 0.4);
        p.x = cx + Math.cos(spawnAngle) * rad;
        p.y = cy + Math.sin(spawnAngle) * rad;
        p.vx = (Math.random() - 0.5) * 0.25 * speedMult;
        p.vy = - (0.3 + Math.random() * 0.5) * speedMult; // flutuação calma
        p.size = 5.5 + Math.random() * 4.5; // tamanho ótimo para detalhar a runa
        p.maxLife = 50 + Math.random() * 40;
        p.angle = (Math.random() - 0.5) * 0.5;
        p.angularSpeed = (Math.random() - 0.5) * 0.012 * speedMult;
        p.runeIndex = Math.floor(Math.random() * 6); // 6 formatos de runas diferentes
        p.alpha = 0.7 + Math.random() * 0.3;
      } else if (style === "spiritual-pressure") {
        // Feixes e ondas acelerando estritamente em eixos de pressão vertical
        p.x = cx + (Math.random() - 0.5) * activeRadius * 1.7;
        const side = Math.random() > 0.5 ? 1 : -1;
        p.y = cy + side * activeRadius * (0.2 + Math.random() * 0.85);
        p.vx = (Math.random() - 0.5) * 0.15 * speedMult;
        p.vy = side * (0.9 + Math.random() * 1.9) * speedMult; // descem estourando ou sobem
        p.size = 1.2 + Math.random() * 2.4;
        p.maxLife = 25 + Math.random() * 30;
        p.alpha = 0.85;
      } else if (style === "divine-light") {
        // Poeira angelical cintilante subindo senoidalmente
        const spawnAngle = Math.random() * Math.PI * 2;
        const rad = activeRadius * (0.2 + Math.random() * 0.95);
        p.x = cx + Math.cos(spawnAngle) * rad;
        p.y = cy + Math.sin(spawnAngle) * rad;
        p.vx = (Math.random() - 0.5) * 0.2 * speedMult;
        p.vy = - (0.25 + Math.random() * 0.45) * speedMult; // bem calmo
        p.size = 1.5 + Math.random() * 2.3;
        p.maxLife = 65 + Math.random() * 65;
        p.wobbleSpeed = 0.02 + Math.random() * 0.035;
        p.wobbleRange = 0.8 + Math.random() * 1.5;
        p.pulseOffset = Math.random() * Math.PI * 2;
        p.alpha = 0.65 + Math.random() * 0.35;
      } else {
        // Padrão limpo genérico
        const spawnAngle = Math.random() * Math.PI * 2;
        const rad = activeRadius * (0.5 + Math.random() * 0.6);
        p.x = cx + Math.cos(spawnAngle) * rad;
        p.y = cy + Math.sin(spawnAngle) * rad;
        p.vx = (Math.random() - 0.5) * 0.5 * speedMult;
        p.vy = (Math.random() - 0.5) * 0.5 * speedMult;
        p.size = 2.0 + Math.random() * 2.5;
        p.maxLife = 40 + Math.random() * 30;
      }

      particles.push(p);
    };

    const render = () => {
      time += 0.06;
      if (!canvas || !ctx) return;
      
      // Get exact configuration
      const currentProps = propsRef.current;
      const def = ANIMATED_AURAS.find(a => a.id === currentProps.auraId) || ANIMATED_AURAS[0];
      
      const activeIntensity = currentProps.intensity ?? def.intensity;
      const activeOpacity = currentProps.opacity ?? def.opacity;
      const activePartCount = currentProps.particleCount ?? def.particleCount;
      const speedMult = currentProps.animationSpeed ?? def.animationSpeed;
      const primaryCol = currentProps.colorPrimary ?? def.colorPrimary;
      const secondaryCol = currentProps.colorSecondary ?? def.colorSecondary;
      const glowOn = currentProps.enableGlow ?? def.enableGlow;
      const distortionOn = currentProps.enableDistortion ?? def.enableDistortion;
      const style = def.styleType;
      
      const scaleParam = currentProps.scale * def.scaleMultiplier;

      // Clean drawing area with subtle trails for Motion Blur
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const renderW = canvas.width / (window.devicePixelRatio || 1);
      const renderH = canvas.height / (window.devicePixelRatio || 1);
      
      const cx = renderW / 2;
      const cy = renderH / 2;
      
      // The radius relative to token size (assume VTT token size around 70-130px)
      // We scale it using scaleParam
      const tokenRadius = (renderW / 5.2) * scaleParam;

      // ----------------- MOTION BLUR / BACKGROUND GLOW -----------------
      if (glowOn) {
        ctx.save();
        const outerGlow = ctx.createRadialGradient(cx, cy, tokenRadius * 0.75, cx, cy, tokenRadius * (1.4 + activeIntensity * 0.3));
        outerGlow.addColorStop(0, hexToRgba(primaryCol, activeOpacity * 0.38));
        outerGlow.addColorStop(0.5, hexToRgba(secondaryCol, activeOpacity * 0.16));
        outerGlow.addColorStop(1, "rgba(0,0,0,0)");
        ctx.fillStyle = outerGlow;
        ctx.fillRect(0, 0, renderW, renderH);
        ctx.restore();
      }

      // ----------------- ENVIRONMENT DISTORTION -----------------
      if (distortionOn) {
        // Draw wavy environment waves to mimic heat haze / noise shaders
        ctx.save();
        ctx.strokeStyle = hexToRgba(primaryCol, activeOpacity * 0.12);
        ctx.lineWidth = 1.5;
        ctx.globalCompositeOperation = "screen";
        for (let i = 0; i < 3; i++) {
          const waveRadius = tokenRadius * (1.0 + i * 0.22) + Math.sin(time * speedMult * 1.5 + i) * 6;
          ctx.beginPath();
          for (let th = 0; th < Math.PI * 2; th += 0.2) {
            const noise = Math.sin(th * 5 + time * speedMult * 2) * (3 * activeIntensity);
            const rx = cx + Math.cos(th) * (waveRadius + noise);
            const ry = cy + Math.sin(th) * (waveRadius + noise);
            if (th === 0) ctx.moveTo(rx, ry);
            else ctx.lineTo(rx, ry);
          }
          ctx.closePath();
          ctx.stroke();
        }
        ctx.restore();
      }

      // ----------------- LAYER 1: BASE LAYER / SPECIALIZED DRAWER -----------------
      ctx.save();
      ctx.globalCompositeOperation = "lighter"; // Perfect Additive Blending for shiny energy emission!

      if (style === "arcane-runes") {
        // Draw spinning geometric magic ring on the lower layer
        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate(time * 0.15 * speedMult);
        
        ctx.strokeStyle = hexToRgba(primaryCol, activeOpacity * 0.45);
        ctx.lineWidth = 1.8;
        
        // Circular bounding rings
        ctx.beginPath();
        ctx.arc(0, 0, tokenRadius, 0, Math.PI * 2);
        ctx.stroke();
        
        ctx.beginPath();
        ctx.arc(0, 0, tokenRadius * 0.88, 0, Math.PI * 2);
        ctx.stroke();
        
        ctx.strokeStyle = hexToRgba(secondaryCol, activeOpacity * 0.3);
        ctx.lineWidth = 1.0;
        
        // Hexagram / Sacred triangles
        ctx.beginPath();
        for (let k = 0; k < 6; k++) {
          const ang = (Math.PI / 3) * k;
          const rx = Math.cos(ang) * tokenRadius * 0.88;
          const ry = Math.sin(ang) * tokenRadius * 0.88;
          if (k === 0) ctx.moveTo(rx, ry);
          else ctx.lineTo(rx, ry);
        }
        ctx.closePath();
        ctx.stroke();

        // Secondary triangles offset
        ctx.rotate(Math.PI / 6);
        ctx.beginPath();
        for (let k = 0; k < 6; k++) {
          const ang = (Math.PI / 3) * k;
          ctx.lineTo(Math.cos(ang) * tokenRadius * 0.88, Math.sin(ang) * tokenRadius * 0.88);
        }
        ctx.closePath();
        ctx.stroke();

        // Runic segments/ticks representations
        ctx.beginPath();
        for (let k = 0; k < 24; k++) {
          const ang = (Math.PI / 12) * k;
          const len = k % 2 === 0 ? 6 : 4;
          ctx.moveTo(Math.cos(ang) * tokenRadius * 0.88, Math.sin(ang) * tokenRadius * 0.88);
          ctx.lineTo(Math.cos(ang) * (tokenRadius * 0.88 + len), Math.sin(ang) * (tokenRadius * 0.88 + len));
        }
        ctx.stroke();
        ctx.restore();
      }

      if (style === "divine-light") {
        // Draw premium symmetric glowing seraph wings
        ctx.save();
        ctx.translate(cx, cy);
        const wingFlap = Math.sin(time * speedMult * 0.8) * 0.12;
        
        // Define wings paths with cubic curves
        const drawWing = (side: number) => {
          ctx.beginPath();
          ctx.fillStyle = hexToRgba(primaryCol, activeOpacity * 0.25);
          ctx.strokeStyle = hexToRgba(secondaryCol, activeOpacity * 0.7);
          ctx.lineWidth = 2.0;

          // Upper main wing loop
          ctx.moveTo(side * 20, 10);
          ctx.bezierCurveTo(
            side * (tokenRadius * 1.5), - (tokenRadius * 0.6) + wingFlap * 40,
            side * (tokenRadius * 1.8), (tokenRadius * 0.3) + wingFlap * 20,
            side * (tokenRadius * 0.3), (tokenRadius * 0.5)
          );
          // Inner feathers feathers
          ctx.bezierCurveTo(
            side * (tokenRadius * 1.2), (tokenRadius * 0.8),
            side * (tokenRadius * 1.4), (tokenRadius * 0.1),
            side * 28, 15
          );
          ctx.closePath();
          ctx.fill();
          ctx.stroke();

          // Second smaller lower feather layer
          ctx.beginPath();
          ctx.fillStyle = hexToRgba(secondaryCol, activeOpacity * 0.2);
          ctx.moveTo(side * 15, 25);
          ctx.bezierCurveTo(
            side * (tokenRadius * 1.25), (tokenRadius * 0.2),
            side * (tokenRadius * 1.4), (tokenRadius * 0.9),
            side * (tokenRadius * 0.4), (tokenRadius * 0.7)
          );
          ctx.closePath();
          ctx.fill();
          ctx.stroke();
        };

        // Left wing
        drawWing(-1);
        // Right wing
        drawWing(1);
        
        // Hovering Halo Crown above the token
        ctx.beginPath();
        const haloY = - (tokenRadius * 0.95);
        ctx.ellipse(0, haloY, tokenRadius * 0.5, tokenRadius * 0.12, 0, 0, Math.PI * 2);
        ctx.fillStyle = hexToRgba(primaryCol, activeOpacity * 0.22);
        ctx.strokeStyle = hexToRgba(secondaryCol, activeOpacity * 0.75);
        ctx.lineWidth = 1.8;
        ctx.fill();
        ctx.stroke();

        ctx.restore();
      }

      if (style === "elemental-lightning") {
        // Render genuine fractal electric lightning arcs connecting around the boundary
        if (Math.random() < 0.18 * speedMult) {
          const startAngle = Math.random() * Math.PI * 2;
          const endAngle = startAngle + Math.PI * 0.5 + Math.random() * Math.PI;
          
          let curX = cx + Math.cos(startAngle) * (tokenRadius * 0.95);
          let curY = cy + Math.sin(startAngle) * (tokenRadius * 0.95);
          const tarX = cx + Math.cos(endAngle) * (tokenRadius * 0.95);
          const tarY = cy + Math.sin(endAngle) * (tokenRadius * 0.95);

          const segments = 4 + Math.floor(Math.random() * 5);
          const path = [{ x: curX, y: curY }];

          for (let s = 1; s < segments; s++) {
            const ratio = s / segments;
            const px = curX + (tarX - curX) * ratio + (Math.random() - 0.5) * 16;
            const py = curY + (tarY - curY) * ratio + (Math.random() - 0.5) * 16;
            path.push({ x: px, y: py });
          }
          path.push({ x: tarX, y: tarY });
          lightningBolts.push({ path, life: 8, color: Math.random() > 0.4 ? primaryCol : secondaryCol });
        }

        // Draw lightning bolts
        lightningBolts.forEach((bolt) => {
          ctx.strokeStyle = hexToRgba(bolt.color, (bolt.life / 8) * activeOpacity);
          ctx.lineWidth = 1.5 + Math.random() * 2.0;
          ctx.beginPath();
          ctx.moveTo(bolt.path[0].x, bolt.path[0].y);
          for (let pIdx = 1; pIdx < bolt.path.length; pIdx++) {
            ctx.lineTo(bolt.path[pIdx].x, bolt.path[pIdx].y);
          }
          ctx.stroke();

          // Core bright white line inside lightning
          ctx.strokeStyle = "rgba(255,255,255, 0.95)";
          ctx.lineWidth = 0.8;
          ctx.stroke();
          
          bolt.life--;
        });
        lightningBolts = lightningBolts.filter(b => b.life > 0);
      }

      ctx.restore();

      // ----------------- LAYER 2: INTERACTIVE PARTICLE ENGINE -----------------
      // Spawn standard procedural particle calculations
      const targetCount = Math.floor(activePartCount * activeIntensity);
      if (particles.length < targetCount && Math.random() < 0.8) {
        const toSpawn = Math.min(6, targetCount - particles.length);
        for (let i = 0; i < toSpawn; i++) {
          spawnParticle(cx, cy, tokenRadius, primaryCol, secondaryCol, style);
        }
      }

      ctx.save();
      ctx.globalCompositeOperation = (style === "living-shadow") ? "source-over" : "lighter";

      particles.forEach((p) => {
        p.life++;
        
        // Se a partícula suporta rastros, armazena a posição atual para desenhar feixes orbitais ou chamas unificadas
        if (p.trail) {
          p.trail.push({ x: p.x, y: p.y });
          if (p.trail.length > 5) {
            p.trail.shift();
          }
        }
        
        if (style === "ki-aura" || style === "elemental-fire") {
          p.y += p.vy;
          if (p.wobbleSpeed && p.wobbleRange) {
            p.x += Math.sin(p.life * p.wobbleSpeed) * (p.wobbleRange * 0.2);
          }
          const progress = p.life / p.maxLife;
          const currentSize = p.size * (1 - progress * 0.5);
          const curAlpha = (1 - progress) * activeOpacity;
          
          // Renderiza rastro de fogo se disponível
          if (p.trail && p.trail.length > 1) {
            ctx.beginPath();
            ctx.moveTo(p.trail[0].x, p.trail[0].y);
            for (let i = 1; i < p.trail.length; i++) {
              ctx.lineTo(p.trail[i].x, p.trail[i].y);
            }
            ctx.strokeStyle = hexToRgba(p.color, curAlpha * 0.35);
            ctx.lineWidth = currentSize * 1.5;
            ctx.lineCap = "round";
            ctx.lineJoin = "round";
            ctx.stroke();
          }

          // Desenha formato oval/chama fluida
          ctx.fillStyle = hexToRgba(p.color, curAlpha);
          ctx.beginPath();
          ctx.ellipse(p.x, p.y, currentSize * 0.7, currentSize * 1.4, 0, 0, Math.PI * 2);
          ctx.fill();
        } 
        else if (style === "chakra-flow" || style === "elemental-wind") {
          if (p.angle !== undefined && p.radius !== undefined && p.angularSpeed !== undefined) {
            p.angle += p.angularSpeed;
            // Espirala suavemente para dentro e para fora
            p.radius += Math.sin(p.life * 0.04) * 0.25;
            p.x = cx + Math.cos(p.angle) * p.radius;
            // Visão levemente isométrica
            p.y = cy + Math.sin(p.angle) * p.radius * 0.8;
          }

          const progress = p.life / p.maxLife;
          const currentSize = p.size * (1 - progress * 0.3);
          const curAlpha = (1 - progress) * activeOpacity * p.alpha;

          // Desenha o maravilhoso rastro sinuoso orbital (linha fluida contínua)
          if (p.trail && p.trail.length > 1) {
            ctx.beginPath();
            ctx.moveTo(p.trail[0].x, p.trail[0].y);
            for (let i = 1; i < p.trail.length; i++) {
              ctx.lineTo(p.trail[i].x, p.trail[i].y);
            }
            ctx.strokeStyle = hexToRgba(p.color, curAlpha * 0.4);
            ctx.lineWidth = currentSize * 1.8;
            ctx.lineCap = "round";
            ctx.stroke();
          }

          ctx.fillStyle = hexToRgba(p.color, curAlpha);
          ctx.beginPath();
          ctx.arc(p.x, p.y, currentSize, 0, Math.PI * 2);
          ctx.fill();
        } 
        else if (style === "living-shadow") {
          p.y += p.vy;
          p.x += p.vx;
          if (p.wobbleSpeed && p.wobbleRange) {
            p.x += Math.sin(p.life * p.wobbleSpeed) * (p.wobbleRange * 0.15);
          }

          const progress = p.life / p.maxLife;
          const currentSize = p.size * (1.0 + progress * 0.8); // Cresce como fumaça de verdade!
          const curAlpha = (1 - progress) * activeOpacity * p.alpha * 0.5;

          // Cria pequenos nós de fumaça cumulativa de baixa opacidade overlapping
          ctx.fillStyle = hexToRgba(p.color, curAlpha);
          ctx.beginPath();
          ctx.arc(p.x, p.y, currentSize, 0, Math.PI * 2);
          ctx.fill();

          // Detritos de fumaça flutuando
          if (progress > 0.4 && Math.random() < 0.1) {
            ctx.fillStyle = hexToRgba(secondaryCol, curAlpha * 0.85);
            ctx.beginPath();
            ctx.arc(
              p.x + (Math.random() - 0.5) * currentSize * 0.8,
              p.y + (Math.random() - 0.5) * currentSize * 0.8,
              1.2,
              0,
              Math.PI * 2
            );
            ctx.fill();
          }
        } 
        else if (style === "elemental-ice") {
          p.x += p.vx;
          p.y += p.vy;
          if (p.angle !== undefined && p.angularSpeed !== undefined) {
            p.angle += p.angularSpeed;
          }

          const progress = p.life / p.maxLife;
          // Efeito de pulsação e cintilação usando seno baseada em pulseOffset
          const pulse = Math.sin((p.life * 0.05) + (p.pulseOffset ?? 0)) * 0.25 + 0.75;
          const curAlpha = (1 - progress) * activeOpacity * pulse;

          ctx.fillStyle = hexToRgba(p.color, curAlpha);

          if (p.type === "shard") {
            // Desenha triângulos/losangos de gelo nítidos girando no próprio centro!
            ctx.save();
            ctx.translate(p.x, p.y);
            ctx.rotate(p.angle ?? 0);
            ctx.beginPath();
            ctx.moveTo(0, - p.size);
            ctx.lineTo(p.size * 0.7, p.size * 0.5);
            ctx.lineTo(- p.size * 0.7, p.size * 0.5);
            ctx.closePath();
            ctx.fill();

            // Adiciona brilho de borda branca nas arestas
            ctx.strokeStyle = "rgba(255, 255, 255, 0.45)";
            ctx.lineWidth = 0.5;
            ctx.stroke();
            ctx.restore();
          } else {
            // Cristais cintilantes de gelo estrelado (pequenos losangos bem verticais)
            ctx.save();
            ctx.translate(p.x, p.y);
            ctx.rotate(p.angle ?? 0);
            ctx.beginPath();
            ctx.moveTo(0, -p.size * 1.25);
            ctx.lineTo(p.size * 0.5, 0);
            ctx.lineTo(0, p.size * 1.25);
            ctx.lineTo(-p.size * 0.5, 0);
            ctx.closePath();
            ctx.fill();
            ctx.restore();
          }
        } 
        else if (style === "elemental-lightning") {
          // As faíscas dão um salto aleatório spástico rápido no frame médio!
          if (Math.random() < 0.3) {
            p.x += (Math.random() - 0.5) * p.size * 8.0;
            p.y += (Math.random() - 0.5) * p.size * 8.0;
          } else {
            p.x += p.vx;
            p.y += p.vy;
          }

          const progress = p.life / p.maxLife;
          const curAlpha = (1 - progress) * activeOpacity;

          // Desenha ziguezague elétrico minúsculo de faísca!
          ctx.beginPath();
          ctx.moveTo(p.x, p.y);
          ctx.lineTo(p.x + (Math.random() - 0.5) * 4, p.y + (Math.random() - 0.5) * 4);
          ctx.lineTo(p.x + (Math.random() - 0.5) * p.size * 4, p.y + (Math.random() - 0.5) * p.size * 4);
          ctx.strokeStyle = hexToRgba(p.color, curAlpha);
          ctx.lineWidth = p.size;
          ctx.stroke();
        } 
        else if (style === "arcane-runes") {
          p.x += p.vx;
          p.y += p.vy;
          if (p.angle !== undefined && p.angularSpeed !== undefined) {
            p.angle += p.angularSpeed;
          }

          const progress = p.life / p.maxLife;
          const pulse = Math.sin(p.life * 0.1) * 0.2 + 0.8; // Piscando místico
          const curAlpha = (1 - progress) * activeOpacity * p.alpha * pulse;

          ctx.save();
          ctx.translate(p.x, p.y);
          ctx.rotate(p.angle ?? 0);
          ctx.strokeStyle = hexToRgba(p.color, curAlpha);
          ctx.fillStyle = hexToRgba(p.color, curAlpha * 0.25);
          ctx.lineWidth = 1.0;

          // Desenha runas e glifos reais baseados em p.runeIndex!
          ctx.beginPath();
          const rSize = p.size;
          const idx = p.runeIndex ?? 0;

          if (idx === 0) {
            // Runa: Losango rúnico com trunfo (Algiz)
            ctx.moveTo(0, -rSize);
            ctx.lineTo(rSize * 0.7, 0);
            ctx.lineTo(0, rSize);
            ctx.lineTo(-rSize * 0.7, 0);
            ctx.closePath();
            ctx.moveTo(0, -rSize);
            ctx.lineTo(0, rSize);
          } else if (idx === 1) {
            // Runa: Runa de fogo 'Fehu' (F invertido angular)
            ctx.moveTo(0, rSize);
            ctx.lineTo(0, -rSize);
            ctx.moveTo(0, -rSize * 0.8);
            ctx.lineTo(rSize * 0.6, -rSize);
            ctx.moveTo(0, -rSize * 0.2);
            ctx.lineTo(rSize * 0.6, -rSize * 0.4);
          } else if (idx === 2) {
            // Runa: Runa de proteção 'Thurisaz' (espinho lateral)
            ctx.moveTo(-rSize * 0.3, rSize);
            ctx.lineTo(-rSize * 0.3, -rSize);
            ctx.moveTo(-rSize * 0.3, -rSize * 0.5);
            ctx.lineTo(rSize * 0.5, 0);
            ctx.lineTo(-rSize * 0.3, rSize * 0.5);
          } else if (idx === 3) {
            // Runa: Ampulheta mística angular (Dagaz)
            ctx.moveTo(-rSize * 0.6, -rSize * 0.6);
            ctx.lineTo(rSize * 0.6, rSize * 0.6);
            ctx.lineTo(rSize * 0.6, -rSize * 0.6);
            ctx.lineTo(-rSize * 0.6, rSize * 0.6);
            ctx.closePath();
          } else if (idx === 4) {
            // Runa: Cruz mística com pontas cruzadas
            ctx.moveTo(-rSize * 0.8, 0);
            ctx.lineTo(rSize * 0.8, 0);
            ctx.moveTo(0, -rSize * 0.8);
            ctx.lineTo(0, rSize * 0.8);
            ctx.moveTo(-rSize * 0.8, -rSize * 0.3); ctx.lineTo(-rSize * 0.8, rSize * 0.3);
            ctx.moveTo(rSize * 0.8, -rSize * 0.3); ctx.lineTo(rSize * 0.8, rSize * 0.3);
          } else {
            // Triângulo místico de força (Gungnir)
            ctx.moveTo(0, -rSize * 0.9);
            ctx.lineTo(rSize * 0.8, rSize * 0.7);
            ctx.lineTo(-rSize * 0.8, rSize * 0.7);
            ctx.closePath();
            ctx.moveTo(0, -rSize * 0.4);
            ctx.lineTo(0, rSize * 0.7);
          }

          ctx.fill();
          ctx.stroke();
          ctx.restore();
        }
        else if (style === "spiritual-pressure") {
          p.y += p.vy;
          p.x += p.vx;
          
          const progress = p.life / p.maxLife;
          const curAlpha = (1 - progress) * activeOpacity;

          // Desenha feixes retangulares esticados imponentes brilhando muito pesado!
          ctx.fillStyle = hexToRgba(p.color, curAlpha * 0.95);
          ctx.beginPath();
          // Feixe vertical fino e bem alto que representa pressão linear esmagando a matéria!
          ctx.rect(p.x - p.size * 0.5, p.y - p.size * 4.5, p.size * 1.0, p.size * 9.0);
          ctx.fill();

          // Detalhes brilhantes adicionais de radiação
          ctx.fillStyle = "#ffffff";
          ctx.fillRect(p.x - p.size * 0.2, p.y - p.size * 1.5, p.size * 0.4, p.size * 3.0);
        }
        else if (style === "divine-light") {
          p.y += p.vy;
          if (p.wobbleSpeed && p.wobbleRange) {
            p.x += Math.sin((p.life * p.wobbleSpeed) + (p.pulseOffset ?? 0)) * (p.wobbleRange * 0.4);
          }

          const progress = p.life / p.maxLife;
          const twinkle = Math.sin((p.life * 0.08) + (p.pulseOffset ?? 0)) * 0.35 + 0.65;
          const curAlpha = (1 - progress) * activeOpacity * p.alpha * twinkle;

          ctx.save();
          ctx.translate(p.x, p.y);
          ctx.fillStyle = hexToRgba(p.color, curAlpha);

          // Desenha uma estrela brilhante de quatro pontas divina!
          ctx.beginPath();
          ctx.moveTo(0, -p.size * 1.6);
          ctx.quadraticCurveTo(0, 0, p.size * 1.6, 0);
          ctx.quadraticCurveTo(0, 0, 0, p.size * 1.6);
          ctx.quadraticCurveTo(0, 0, -p.size * 1.6, 0);
          ctx.quadraticCurveTo(0, 0, 0, -p.size * 1.6);
          ctx.closePath();
          ctx.fill();

          // Núcleo branco puro radiativo de divindade
          ctx.fillStyle = `rgba(255, 255, 255, ${curAlpha})`;
          ctx.beginPath();
          ctx.arc(0, 0, p.size * 0.4, 0, Math.PI * 2);
          ctx.fill();
          
          ctx.restore();
        }
        else { // Normal particle trail
          p.x += p.vx;
          p.y += p.vy;
          const progress = p.life / p.maxLife;
          const curAlpha = (1 - progress) * activeOpacity;
          ctx.fillStyle = hexToRgba(p.color, curAlpha);
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
          ctx.fill();
        }
      });

      // Filter dead particles
      particles = particles.filter(p => p.life < p.maxLife);
      ctx.restore();

      // ----------------- LAYER 3: DYNAMIC ACCENT EXPANDING SHOCKWAVES -----------------
      if (Math.random() < 0.015 * speedMult) {
        rings.push({
          radius: tokenRadius * 0.5,
          maxRadius: tokenRadius * 1.5,
          opacity: 0.7,
          color: Math.random() > 0.5 ? primaryCol : secondaryCol
        });
      }

      ctx.save();
      ctx.globalCompositeOperation = "lighter";
      rings.forEach((ring) => {
        ring.radius += 1.8 * speedMult;
        const scaleProgress = (ring.radius / ring.maxRadius);
        ring.opacity = Math.max(0, (1 - scaleProgress) * activeOpacity * 0.45);
        
        ctx.strokeStyle = hexToRgba(ring.color, ring.opacity);
        ctx.lineWidth = 2.0;
        ctx.beginPath();
        if (style === "chakra-flow") {
          ctx.ellipse(cx, cy, ring.radius, ring.radius * 0.65, 0, 0, Math.PI * 2);
        } else {
          ctx.arc(cx, cy, ring.radius, 0, Math.PI * 2);
        }
        ctx.stroke();
      });
      ctx.restore();
      rings = rings.filter(r => r.radius < r.maxRadius);

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    // Helper to translate Hex values safely to rgba outputs
    function hexToRgba(hex: string, alpha: number): string {
      const parsedHex = hex.replace("#", "");
      if (parsedHex.length === 3) {
        const r = parseInt(parsedHex[0] + parsedHex[0], 16);
        const g = parseInt(parsedHex[1] + parsedHex[1], 16);
        const b = parseInt(parsedHex[2] + parsedHex[2], 16);
        return `rgba(${r}, ${g}, ${b}, ${alpha})`;
      } else if (parsedHex.length === 6) {
        const r = parseInt(parsedHex.substring(0, 2), 16);
        const g = parseInt(parsedHex.substring(2, 4), 16);
        const b = parseInt(parsedHex.substring(4, 6), 16);
        return `rgba(${r}, ${g}, ${b}, ${alpha})`;
      }
      return `rgba(255, 255, 255, ${alpha})`;
    }

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener("resize", resizeCanvas);
      if (currContainer) {
        resizeObserver.unobserve(currContainer);
      }
    };
  }, []);

  return (
    <div 
      ref={containerRef} 
      className="absolute inset-[calc(-60%)] pointer-events-none flex items-center justify-center z-[-1]"
    >
      <canvas 
        ref={canvasRef} 
        className="pointer-events-none mix-blend-screen opacity-100" 
      />
    </div>
  );
};
