import React, { useEffect, useRef, useCallback } from "react";
import type { ToolType } from "../../stores/toolStore";

interface PresentationOverlayProps {
  dimensions: { width: number; height: number };
  activeTool: ToolType;
  spotlightRadius: number;
  setSpotlightRadius: (radius: number) => void;
  strokeColor: string;
}

interface LaserPoint {
  x: number;
  y: number;
  time: number;
}

interface LaserStroke {
  color: string;
  points: LaserPoint[];
}

const FADE_DURATION = 1500; // 1.5 seconds lifetime for laser trail decay

export const PresentationOverlay: React.FC<PresentationOverlayProps> = ({
  dimensions,
  activeTool,
  spotlightRadius,
  setSpotlightRadius,
  strokeColor,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animFrameIdRef = useRef<number | null>(null);

  // Position refs for 60fps tracking without triggering React re-renders
  const mousePosRef = useRef<{ x: number; y: number } | null>(null);
  const isMouseDownRef = useRef<boolean>(false);
  const laserStrokesRef = useRef<LaserStroke[]>([]);
  const currentStrokeRef = useRef<LaserStroke | null>(null);

  // Keep latest props in refs for animation loop
  const activeToolRef = useRef<ToolType>(activeTool);
  activeToolRef.current = activeTool;

  const spotlightRadiusRef = useRef<number>(spotlightRadius);
  spotlightRadiusRef.current = spotlightRadius;

  const strokeColorRef = useRef<string>(strokeColor);
  strokeColorRef.current = strokeColor;

  const dimensionsRef = useRef(dimensions);
  dimensionsRef.current = dimensions;

  // Main 60fps Canvas Render Loop
  const renderFrame = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const { width, height } = dimensionsRef.current;
    const now = performance.now();
    const currentTool = activeToolRef.current;
    const mousePos = mousePosRef.current;

    // Clear entire presentation canvas
    ctx.clearRect(0, 0, width, height);

    // 1. Render Spotlight Layer
    if (currentTool === "spotlight") {
      ctx.save();
      // Dark dimmer overlay (black with ~65% opacity)
      ctx.fillStyle = "rgba(0, 0, 0, 0.65)";
      ctx.beginPath();
      ctx.rect(0, 0, width, height);

      // Cutout circular hole at mouse position using counter-clockwise arc
      if (mousePos) {
        const radius = spotlightRadiusRef.current;
        ctx.arc(mousePos.x, mousePos.y, radius, 0, Math.PI * 2, true);
      }
      ctx.fill();

      // Subtle glowing border around the spotlight cutout
      if (mousePos) {
        const radius = spotlightRadiusRef.current;
        ctx.beginPath();
        ctx.arc(mousePos.x, mousePos.y, radius, 0, Math.PI * 2);
        ctx.lineWidth = 2.5;
        ctx.strokeStyle = "rgba(255, 255, 255, 0.4)";
        ctx.shadowColor = "rgba(255, 255, 255, 0.6)";
        ctx.shadowBlur = 10;
        ctx.stroke();
      }
      ctx.restore();
    }

    // 2. Render Ephemeral Laser Trails
    const activeStrokes = laserStrokesRef.current;
    const prunedStrokes: LaserStroke[] = [];

    for (let s = 0; s < activeStrokes.length; s++) {
      const stroke = activeStrokes[s];
      // Keep only points that are younger than FADE_DURATION
      const survivingPoints = stroke.points.filter(
        (p) => now - p.time < FADE_DURATION
      );

      if (survivingPoints.length > 0) {
        stroke.points = survivingPoints;
        prunedStrokes.push(stroke);

        if (survivingPoints.length === 1) {
          // Single dot
          const p = survivingPoints[0];
          const age = now - p.time;
          const alpha = Math.max(0, 1 - age / FADE_DURATION);

          ctx.save();
          ctx.beginPath();
          ctx.arc(p.x, p.y, 3, 0, Math.PI * 2);
          ctx.fillStyle = stroke.color;
          ctx.globalAlpha = alpha;
          ctx.shadowColor = stroke.color;
          ctx.shadowBlur = 15;
          ctx.fill();
          ctx.restore();
        } else {
          // Draw smooth multi-segment line with decaying alpha
          for (let i = 0; i < survivingPoints.length - 1; i++) {
            const p1 = survivingPoints[i];
            const p2 = survivingPoints[i + 1];
            const age = now - p2.time;
            const alpha = Math.max(0, 1 - age / FADE_DURATION);

            ctx.save();
            ctx.beginPath();
            ctx.moveTo(p1.x, p1.y);
            ctx.lineTo(p2.x, p2.y);
            ctx.strokeStyle = stroke.color;
            ctx.globalAlpha = alpha;
            ctx.lineWidth = 4;
            ctx.lineCap = "round";
            ctx.lineJoin = "round";
            ctx.shadowColor = stroke.color;
            ctx.shadowBlur = 15;
            ctx.stroke();
            ctx.restore();
          }
        }
      }
    }

    laserStrokesRef.current = prunedStrokes;

    // 3. Render Laser Pointer Dot indicator when laser tool is active
    if (currentTool === "laser" && mousePos) {
      const color = strokeColorRef.current;
      const isDown = isMouseDownRef.current;

      ctx.save();
      // Outer neon glow
      ctx.beginPath();
      ctx.arc(mousePos.x, mousePos.y, isDown ? 6 : 4, 0, Math.PI * 2);
      ctx.fillStyle = color;
      ctx.shadowColor = color;
      ctx.shadowBlur = 16;
      ctx.fill();

      // Inner white core
      ctx.beginPath();
      ctx.arc(mousePos.x, mousePos.y, isDown ? 2.5 : 1.8, 0, Math.PI * 2);
      ctx.fillStyle = "#ffffff";
      ctx.fill();
      ctx.restore();
    }

    // Determine whether to continue requestAnimationFrame loop
    const shouldContinue =
      currentTool === "spotlight" ||
      currentTool === "laser" ||
      laserStrokesRef.current.length > 0;

    if (shouldContinue) {
      animFrameIdRef.current = requestAnimationFrame(renderFrame);
    } else {
      animFrameIdRef.current = null;
    }
  }, []);

  // Trigger or restart animation loop whenever conditions change
  const startLoopIfNeeded = useCallback(() => {
    if (animFrameIdRef.current === null) {
      animFrameIdRef.current = requestAnimationFrame(renderFrame);
    }
  }, [renderFrame]);

  // Handle active tool changes
  useEffect(() => {
    if (activeTool === "spotlight" || activeTool === "laser") {
      startLoopIfNeeded();
    }
  }, [activeTool, startLoopIfNeeded]);

  // Window-level mouse tracking for smooth 60fps movement
  useEffect(() => {
    const handleWindowMouseMove = (e: MouseEvent) => {
      mousePosRef.current = { x: e.clientX, y: e.clientY };

      // If dragging with laser pointer, record coordinate
      if (activeToolRef.current === "laser" && isMouseDownRef.current) {
        const now = performance.now();
        const pt: LaserPoint = { x: e.clientX, y: e.clientY, time: now };

        if (!currentStrokeRef.current) {
          const newStroke: LaserStroke = {
            color: strokeColorRef.current,
            points: [pt],
          };
          currentStrokeRef.current = newStroke;
          laserStrokesRef.current.push(newStroke);
        } else {
          currentStrokeRef.current.points.push(pt);
        }
      }

      startLoopIfNeeded();
    };

    const handleWindowMouseDown = (e: MouseEvent) => {
      // Ignore clicks on HUD toolbar or modal dialogs
      const target = e.target as HTMLElement | null;
      if (
        target?.closest(".fixed.top-5") ||
        target?.closest("button") ||
        target?.closest("textarea")
      ) {
        return;
      }

      if (activeToolRef.current === "laser") {
        isMouseDownRef.current = true;
        const now = performance.now();
        const pt: LaserPoint = { x: e.clientX, y: e.clientY, time: now };
        const newStroke: LaserStroke = {
          color: strokeColorRef.current,
          points: [pt],
        };
        currentStrokeRef.current = newStroke;
        laserStrokesRef.current.push(newStroke);
        startLoopIfNeeded();
      }
    };

    const handleWindowMouseUp = () => {
      if (isMouseDownRef.current) {
        isMouseDownRef.current = false;
        currentStrokeRef.current = null;
      }
    };

    // Passive wheel handler for spotlight radius resizing
    const handleWindowWheel = (e: WheelEvent) => {
      if (activeToolRef.current !== "spotlight") return;

      e.preventDefault();
      const delta = e.deltaY < 0 ? 15 : -15;
      setSpotlightRadius(
        Math.max(40, Math.min(450, spotlightRadiusRef.current + delta))
      );
      startLoopIfNeeded();
    };

    window.addEventListener("mousemove", handleWindowMouseMove, {
      passive: true,
    });
    window.addEventListener("mousedown", handleWindowMouseDown, {
      passive: true,
    });
    window.addEventListener("mouseup", handleWindowMouseUp, { passive: true });
    window.addEventListener("wheel", handleWindowWheel, { passive: false });

    return () => {
      window.removeEventListener("mousemove", handleWindowMouseMove);
      window.removeEventListener("mousedown", handleWindowMouseDown);
      window.removeEventListener("mouseup", handleWindowMouseUp);
      window.removeEventListener("wheel", handleWindowWheel);
    };
  }, [setSpotlightRadius, startLoopIfNeeded]);

  // Clean up animation frame on unmount
  useEffect(() => {
    return () => {
      if (animFrameIdRef.current !== null) {
        cancelAnimationFrame(animFrameIdRef.current);
        animFrameIdRef.current = null;
      }
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      width={dimensions.width}
      height={dimensions.height}
      className="fixed inset-0 pointer-events-none z-30 select-none"
    />
  );
};
