import React, { useState, useEffect, useRef, useCallback } from "react";

interface SmartRulerProps {
  dimensions: { width: number; height: number };
  isActive: boolean;
}

interface Point {
  x: number;
  y: number;
}

interface MeasurementBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export const SmartRuler: React.FC<SmartRulerProps> = ({ dimensions, isActive }) => {
  const [mousePos, setMousePos] = useState<Point | null>(null);
  const [startPoint, setStartPoint] = useState<Point | null>(null);
  const [isMeasuring, setIsMeasuring] = useState<boolean>(false);
  const [measurement, setMeasurement] = useState<MeasurementBox | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const animFrameIdRef = useRef<number | null>(null);
  const latestMouseRef = useRef<Point | null>(null);

  // Mouse move listener with requestAnimationFrame for 60fps tracking
  useEffect(() => {
    if (!isActive) {
      setMousePos(null);
      setMeasurement(null);
      setIsMeasuring(false);
      setStartPoint(null);
      return;
    }

    const handleMouseMove = (e: MouseEvent) => {
      latestMouseRef.current = { x: e.clientX, y: e.clientY };

      if (animFrameIdRef.current !== null) {
        cancelAnimationFrame(animFrameIdRef.current);
      }

      animFrameIdRef.current = requestAnimationFrame(() => {
        if (!latestMouseRef.current) return;
        const cur = latestMouseRef.current;
        setMousePos(cur);

        if (isMeasuring && startPoint) {
          const x = Math.min(startPoint.x, cur.x);
          const y = Math.min(startPoint.y, cur.y);
          const width = Math.abs(cur.x - startPoint.x);
          const height = Math.abs(cur.y - startPoint.y);
          setMeasurement({ x, y, width, height });
        }
      });
    };

    window.addEventListener("mousemove", handleMouseMove, { passive: true });
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      if (animFrameIdRef.current !== null) {
        cancelAnimationFrame(animFrameIdRef.current);
      }
    };
  }, [isActive, isMeasuring, startPoint]);

  // Mouse down / up handlers for drag measurement
  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (!isActive) return;
      setIsMeasuring(true);
      const pt = { x: e.clientX, y: e.clientY };
      setStartPoint(pt);
      setMeasurement({ x: pt.x, y: pt.y, width: 0, height: 0 });
    },
    [isActive]
  );

  const handleMouseUp = useCallback(() => {
    if (!isActive || !isMeasuring) return;
    setIsMeasuring(false);
    setStartPoint(null);
    if (measurement && (measurement.width < 3 || measurement.height < 3)) {
      setMeasurement(null);
    }
  }, [isActive, isMeasuring, measurement]);

  if (!isActive) return null;

  // Calculate edge distances if a box is measured
  const topDistance = measurement ? Math.round(measurement.y) : 0;
  const bottomDistance = measurement
    ? Math.round(dimensions.height - (measurement.y + measurement.height))
    : 0;
  const leftDistance = measurement ? Math.round(measurement.x) : 0;
  const rightDistance = measurement
    ? Math.round(dimensions.width - (measurement.x + measurement.width))
    : 0;

  return (
    <div
      ref={containerRef}
      onMouseDown={handleMouseDown}
      onMouseUp={handleMouseUp}
      className="fixed inset-0 z-40 pointer-events-auto cursor-crosshair select-none overflow-hidden"
    >
      {/* Fullscreen Crosshair Lines */}
      {mousePos && (
        <>
          {/* Horizontal Line */}
          <div
            className="absolute left-0 w-full h-[1px] bg-cyan-400/80 pointer-events-none shadow-[0_0_8px_rgba(34,211,238,0.5)]"
            style={{ top: `${mousePos.y}px` }}
          />

          {/* Vertical Line */}
          <div
            className="absolute top-0 h-full w-[1px] bg-cyan-400/80 pointer-events-none shadow-[0_0_8px_rgba(34,211,238,0.5)]"
            style={{ left: `${mousePos.x}px` }}
          />

          {/* Current Cursor Coordinate Pill */}
          {!measurement && (
            <div
              className="absolute pointer-events-none z-50 px-2 py-0.5 rounded-lg bg-neutral-900/90 border border-neutral-700 text-[10px] font-mono text-cyan-300 shadow-xl"
              style={{
                transform: `translate3d(${Math.min(
                  mousePos.x + 12,
                  dimensions.width - 120
                )}px, ${Math.min(mousePos.y + 12, dimensions.height - 30)}px, 0)`,
              }}
            >
              X: {Math.round(mousePos.x)}px &nbsp; Y: {Math.round(mousePos.y)}px
            </div>
          )}
        </>
      )}

      {/* Measurement Box & Edge Guides */}
      {measurement && measurement.width > 1 && measurement.height > 1 && (
        <>
          {/* Measurement Box */}
          <div
            className="absolute pointer-events-none border border-cyan-400 bg-cyan-500/15 shadow-[0_0_15px_rgba(6,182,212,0.2)] rounded-sm"
            style={{
              left: `${measurement.x}px`,
              top: `${measurement.y}px`,
              width: `${measurement.width}px`,
              height: `${measurement.height}px`,
            }}
          >
            {/* Center Dimension Pill */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="px-2.5 py-1 rounded-xl bg-neutral-900/95 border border-cyan-500/60 shadow-2xl text-xs font-mono font-bold text-cyan-300 whitespace-nowrap">
                {Math.round(measurement.width)} × {Math.round(measurement.height)} px
              </div>
            </div>
          </div>

          {/* Edge Guide Lines & Delta Badges */}
          {/* 1. Top Distance Guide */}
          {topDistance > 10 && (
            <div
              className="absolute border-l border-dashed border-cyan-400/60 pointer-events-none flex items-center justify-center"
              style={{
                left: `${measurement.x + measurement.width / 2}px`,
                top: 0,
                height: `${measurement.y}px`,
              }}
            >
              <span className="px-1.5 py-0.5 rounded bg-neutral-900/90 border border-neutral-700 text-[9px] font-mono text-cyan-200">
                {topDistance}px
              </span>
            </div>
          )}

          {/* 2. Bottom Distance Guide */}
          {bottomDistance > 10 && (
            <div
              className="absolute border-l border-dashed border-cyan-400/60 pointer-events-none flex items-center justify-center"
              style={{
                left: `${measurement.x + measurement.width / 2}px`,
                top: `${measurement.y + measurement.height}px`,
                height: `${bottomDistance}px`,
              }}
            >
              <span className="px-1.5 py-0.5 rounded bg-neutral-900/90 border border-neutral-700 text-[9px] font-mono text-cyan-200">
                {bottomDistance}px
              </span>
            </div>
          )}

          {/* 3. Left Distance Guide */}
          {leftDistance > 10 && (
            <div
              className="absolute border-t border-dashed border-cyan-400/60 pointer-events-none flex items-center justify-center"
              style={{
                top: `${measurement.y + measurement.height / 2}px`,
                left: 0,
                width: `${measurement.x}px`,
              }}
            >
              <span className="px-1.5 py-0.5 rounded bg-neutral-900/90 border border-neutral-700 text-[9px] font-mono text-cyan-200">
                {leftDistance}px
              </span>
            </div>
          )}

          {/* 4. Right Distance Guide */}
          {rightDistance > 10 && (
            <div
              className="absolute border-t border-dashed border-cyan-400/60 pointer-events-none flex items-center justify-center"
              style={{
                top: `${measurement.y + measurement.height / 2}px`,
                left: `${measurement.x + measurement.width}px`,
                width: `${rightDistance}px`,
              }}
            >
              <span className="px-1.5 py-0.5 rounded bg-neutral-900/90 border border-neutral-700 text-[9px] font-mono text-cyan-200">
                {rightDistance}px
              </span>
            </div>
          )}
        </>
      )}
    </div>
  );
};
