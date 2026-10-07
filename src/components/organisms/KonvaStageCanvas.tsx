import React from "react";
import {
  Stage,
  Layer,
  Image as KonvaImage,
  Rect,
  Arrow,
  Line,
  Circle,
  Text,
  Group,
  Shape,
} from "react-konva";
import type { KonvaEventObject } from "konva/lib/Node";
import type Konva from "konva";
import type { ToolType } from "../../stores/toolStore";
import type { FlowNode } from "../../stores/flowStore";
import type {
  Annotation,
  CropArea,
  OcrArea,
} from "../../types/canvas";

export interface KonvaStageCanvasProps {
  stageRef: React.RefObject<Konva.Stage | null>;
  cropLayerRef: React.RefObject<Konva.Layer | null>;
  ocrLayerRef: React.RefObject<Konva.Layer | null>;
  dimensions: { width: number; height: number };
  capturedImage: HTMLImageElement | null;
  activeTool: ToolType;
  annotations: Annotation[];
  currentDrawing: Annotation | null;
  cropArea: CropArea | null;
  ocrArea: OcrArea | null;
  flowNodes: FlowNode[];
  activeNodeId: string | null;
  onMouseDown: (e: KonvaEventObject<MouseEvent>) => void;
  onMouseMove: (e: KonvaEventObject<MouseEvent>) => void;
  onMouseUp: (e: KonvaEventObject<MouseEvent>) => void;
  onUpdateNodePosition: (id: string, x: number, y: number) => void;
  onSelectNode: (id: string) => void;
}

export const KonvaStageCanvas: React.FC<KonvaStageCanvasProps> = ({
  stageRef,
  cropLayerRef,
  ocrLayerRef,
  dimensions,
  capturedImage,
  activeTool,
  annotations,
  currentDrawing,
  cropArea,
  ocrArea,
  flowNodes,
  activeNodeId,
  onMouseDown,
  onMouseMove,
  onMouseUp,
  onUpdateNodePosition,
  onSelectNode,
}) => {
  if (!capturedImage) return null;

  // Helper to render an annotation shape
  const renderShape = (shape: Annotation) => {
    if (shape.type === "rect") {
      return (
        <Rect
          key={shape.id}
          x={shape.x}
          y={shape.y}
          width={shape.width}
          height={shape.height}
          stroke={shape.strokeColor}
          strokeWidth={shape.strokeWidth}
          cornerRadius={4}
          listening={activeTool === "select"}
          draggable={activeTool === "select"}
        />
      );
    }

    if (shape.type === "arrow") {
      return (
        <Arrow
          key={shape.id}
          points={shape.points}
          stroke={shape.strokeColor}
          strokeWidth={shape.strokeWidth}
          fill={shape.strokeColor}
          pointerLength={12}
          pointerWidth={12}
          listening={activeTool === "select"}
          draggable={activeTool === "select"}
        />
      );
    }

    if (shape.type === "pen") {
      return (
        <Line
          key={shape.id}
          points={shape.points}
          stroke={shape.strokeColor}
          strokeWidth={shape.strokeWidth}
          tension={0.5}
          lineCap="round"
          lineJoin="round"
          listening={activeTool === "select"}
          draggable={activeTool === "select"}
        />
      );
    }

    if (shape.type === "stepBadge") {
      return (
        <Group
          key={shape.id}
          x={shape.x}
          y={shape.y}
          listening={activeTool === "select"}
          draggable={activeTool === "select"}
        >
          <Circle
            radius={shape.radius}
            fill={shape.strokeColor}
            stroke="#ffffff"
            strokeWidth={2}
            shadowColor="#000000"
            shadowBlur={6}
            shadowOpacity={0.4}
          />
          <Text
            text={String(shape.stepNumber)}
            fontSize={13}
            fontStyle="bold"
            fontFamily="sans-serif"
            fill="#ffffff"
            align="center"
            verticalAlign="middle"
            width={shape.radius * 2}
            height={shape.radius * 2}
            offsetX={shape.radius}
            offsetY={shape.radius}
          />
        </Group>
      );
    }

    if (shape.type === "blur") {
      return (
        <Shape
          key={shape.id}
          x={shape.x}
          y={shape.y}
          width={shape.width}
          height={shape.height}
          listening={activeTool === "select"}
          draggable={activeTool === "select"}
          sceneFunc={(context, konvaShape) => {
            const ctx = context._context as CanvasRenderingContext2D;
            const w = konvaShape.width();
            const h = konvaShape.height();
            const absPos = konvaShape.getAbsolutePosition();

            if (w < 2 || h < 2 || !capturedImage) return;

            const natWidth = capturedImage.naturalWidth || capturedImage.width || dimensions.width;
            const natHeight = capturedImage.naturalHeight || capturedImage.height || dimensions.height;

            const scaleX = natWidth / dimensions.width;
            const scaleY = natHeight / dimensions.height;

            const sx = Math.max(0, Math.floor(absPos.x * scaleX));
            const sy = Math.max(0, Math.floor(absPos.y * scaleY));
            const sw = Math.min(Math.floor(w * scaleX), natWidth - sx);
            const sh = Math.min(Math.floor(h * scaleY), natHeight - sy);

            if (sw <= 0 || sh <= 0) return;

            // Smart Redact Pixelation Mosaic Effect
            const blockSize = 9;
            const tinyW = Math.max(1, Math.round(w / blockSize));
            const tinyH = Math.max(1, Math.round(h / blockSize));

            const offscreen = document.createElement("canvas");
            offscreen.width = tinyW;
            offscreen.height = tinyH;
            const offCtx = offscreen.getContext("2d");

            if (offCtx) {
              offCtx.imageSmoothingEnabled = true;
              offCtx.drawImage(capturedImage, sx, sy, sw, sh, 0, 0, tinyW, tinyH);

              ctx.save();
              ctx.beginPath();
              ctx.rect(0, 0, w, h);
              ctx.clip();

              ctx.imageSmoothingEnabled = false;
              ctx.drawImage(offscreen, 0, 0, tinyW, tinyH, 0, 0, w, h);

              // Subtle security privacy outline
              ctx.strokeStyle = "rgba(244, 63, 94, 0.4)";
              ctx.lineWidth = 1;
              ctx.strokeRect(0, 0, w, h);

              ctx.restore();
            }

            context.fillStrokeShape(konvaShape);
          }}
        />
      );
    }

    if (shape.type === "stamp") {
      const displayText = `${shape.emoji}  ${shape.label}`;
      const charWidth = 8.2;
      const pillWidth = Math.max(90, Math.round(displayText.length * charWidth) + 24);
      const pillHeight = 28;

      return (
        <Group
          key={shape.id}
          x={shape.x}
          y={shape.y}
          listening={activeTool === "select"}
          draggable={activeTool === "select"}
        >
          {/* Pill Container */}
          <Rect
            width={pillWidth}
            height={pillHeight}
            cornerRadius={14}
            fill={shape.bgColor}
            stroke={shape.badgeColor}
            strokeWidth={1.5}
            shadowColor="#000000"
            shadowBlur={10}
            shadowOpacity={0.55}
          />
          {/* Stamp Label */}
          <Text
            text={displayText}
            fontSize={11.5}
            fontStyle="bold"
            fontFamily="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
            fill="#ffffff"
            width={pillWidth}
            height={pillHeight}
            align="center"
            verticalAlign="middle"
          />
        </Group>
      );
    }

    return null;
  };

  // Cursor selector
  const getCursor = () => {
    switch (activeTool) {
      case "spotlight":
        return "default";
      case "stepBadge":
      case "stamp":
        return "pointer";
      case "select":
      case "blur":
      case "flowBuilder":
      case "laser":
      case "ocr":
      case "crop":
      case "rect":
      case "arrow":
      case "pen":
      default:
        return "crosshair";
    }
  };

  return (
    <Stage
      ref={stageRef}
      width={dimensions.width}
      height={dimensions.height}
      onMouseDown={onMouseDown}
      onMouseMove={onMouseMove}
      onMouseUp={onMouseUp}
      style={{
        cursor: getCursor(),
      }}
    >
      {/* Layer 1: Native screenshot freeze background */}
      <Layer listening={false}>
        <KonvaImage
          image={capturedImage}
          x={0}
          y={0}
          width={dimensions.width}
          height={dimensions.height}
          listening={false}
        />
      </Layer>

      {/* Layer 2: Annotations & Active Drawing Drag Preview */}
      <Layer>
        {annotations.map(renderShape)}
        {currentDrawing && renderShape(currentDrawing)}
      </Layer>

      {/* Layer 3: Crop Area Selection Overlay & Dimensions Badge */}
      <Layer ref={cropLayerRef}>
        {cropArea && cropArea.width > 2 && cropArea.height > 2 && (
          <Group>
            {/* Semi-transparent Crop Box */}
            <Rect
              x={cropArea.x}
              y={cropArea.y}
              width={cropArea.width}
              height={cropArea.height}
              fill="rgba(59, 130, 246, 0.12)"
              stroke="#3b82f6"
              strokeWidth={1.5}
              dash={[6, 3]}
              cornerRadius={2}
            />

            {/* Dimensions Badge (e.g. 1920 × 1080 px) */}
            <Group
              x={cropArea.x + 6}
              y={
                cropArea.y + cropArea.height + 26 > dimensions.height
                  ? Math.max(0, cropArea.y - 26)
                  : cropArea.y + cropArea.height + 6
              }
            >
              <Rect
                width={110}
                height={22}
                fill="#0f172a"
                stroke="#334155"
                strokeWidth={1}
                cornerRadius={6}
                opacity={0.92}
                shadowColor="#000000"
                shadowBlur={4}
                shadowOpacity={0.3}
              />
              <Text
                text={`${Math.round(cropArea.width)} × ${Math.round(cropArea.height)} px`}
                fontSize={11}
                fontFamily="sans-serif"
                fontStyle="bold"
                fill="#38bdf8"
                width={110}
                height={22}
                align="center"
                verticalAlign="middle"
              />
            </Group>
          </Group>
        )}
      </Layer>

      {/* Layer 4: OCR Drag Selection Overlay */}
      <Layer ref={ocrLayerRef}>
        {ocrArea && ocrArea.width > 2 && ocrArea.height > 2 && (
          <Group>
            <Rect
              x={ocrArea.x}
              y={ocrArea.y}
              width={ocrArea.width}
              height={ocrArea.height}
              fill="rgba(99, 102, 241, 0.15)"
              stroke="#6366f1"
              strokeWidth={1.5}
              dash={[5, 4]}
              cornerRadius={2}
            />
            <Group
              x={ocrArea.x + 6}
              y={
                ocrArea.y + ocrArea.height + 26 > dimensions.height
                  ? Math.max(0, ocrArea.y - 26)
                  : ocrArea.y + ocrArea.height + 6
              }
            >
              <Rect
                width={130}
                height={22}
                fill="#0f172a"
                stroke="#334155"
                strokeWidth={1}
                cornerRadius={6}
                opacity={0.92}
                shadowColor="#000000"
                shadowBlur={4}
                shadowOpacity={0.3}
              />
              <Text
                text={`OCR: ${Math.round(ocrArea.width)} × ${Math.round(ocrArea.height)} px`}
                fontSize={11}
                fontFamily="sans-serif"
                fontStyle="bold"
                fill="#a5b4fc"
                width={130}
                height={22}
                align="center"
                verticalAlign="middle"
              />
            </Group>
          </Group>
        )}
      </Layer>

      {/* Layer 5: Flow & Documentation Builder (Bezier curves & Nodes) */}
      <Layer>
        {/* Cubic Bezier Curves connecting consecutive nodes */}
        {flowNodes.map((node, i) => {
          if (i >= flowNodes.length - 1) return null;
          const nextNode = flowNodes[i + 1];

          const R = 18;
          const dx = nextNode.x - node.x;
          const dy = nextNode.y - node.y;
          const dist = Math.hypot(dx, dy);

          if (dist <= R * 2) return null;

          const uX = dx / dist;
          const uY = dy / dist;

          const startX = node.x + uX * R;
          const startY = node.y + uY * R;
          const endX = nextNode.x - uX * (R + 8);
          const endY = nextNode.y - uY * (R + 8);

          // Natural S/C-curve curvature
          const curvature = Math.min(Math.max(dist * 0.45, 30), 180);
          let cp1x: number, cp1y: number, cp2x: number, cp2y: number;

          if (Math.abs(dx) >= Math.abs(dy)) {
            cp1x = startX + (dx > 0 ? curvature : -curvature);
            cp1y = startY;
            cp2x = endX - (dx > 0 ? curvature : -curvature);
            cp2y = endY;
          } else {
            cp1x = startX;
            cp1y = startY + (dy > 0 ? curvature : -curvature);
            cp2x = endX;
            cp2y = endY - (dy > 0 ? curvature : -curvature);
          }

          const tangentX = endX - cp2x;
          const tangentY = endY - cp2y;
          const arrowAngle = Math.atan2(tangentY, tangentX);
          const arrowLength = 9;
          const tipX = nextNode.x - uX * R;
          const tipY = nextNode.y - uY * R;

          return (
            <Shape
              key={`flow-edge-${node.id}-${nextNode.id}`}
              sceneFunc={(ctx, shape) => {
                ctx.save();
                // Bezier curve
                ctx.beginPath();
                ctx.moveTo(startX, startY);
                ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, endX, endY);
                ctx.strokeStyle = "#8b5cf6";
                ctx.lineWidth = 3;
                ctx.shadowColor = "rgba(139, 92, 246, 0.55)";
                ctx.shadowBlur = 6;
                ctx.lineCap = "round";
                ctx.stroke();

                // Arrowhead
                ctx.beginPath();
                ctx.moveTo(tipX, tipY);
                ctx.lineTo(
                  tipX - arrowLength * Math.cos(arrowAngle - Math.PI / 6),
                  tipY - arrowLength * Math.sin(arrowAngle - Math.PI / 6)
                );
                ctx.lineTo(
                  tipX - arrowLength * Math.cos(arrowAngle + Math.PI / 6),
                  tipY - arrowLength * Math.sin(arrowAngle + Math.PI / 6)
                );
                ctx.closePath();
                ctx.fillStyle = "#8b5cf6";
                ctx.shadowColor = "rgba(139, 92, 246, 0.55)";
                ctx.shadowBlur = 6;
                ctx.fill();
                ctx.restore();
                ctx.fillStrokeShape(shape);
              }}
            />
          );
        })}

        {/* Flow Nodes */}
        {flowNodes.map((node) => {
          const isSelected = activeNodeId === node.id;
          const titleWidth = Math.min(
            120,
            Math.max(50, node.title.length * 6.5 + 16)
          );

          return (
            <Group
              key={node.id}
              x={node.x}
              y={node.y}
              draggable={activeTool === "select" || activeTool === "flowBuilder"}
              onDragMove={(e) => {
                onUpdateNodePosition(node.id, e.target.x(), e.target.y());
              }}
              onClick={(e) => {
                e.cancelBubble = true;
                onSelectNode(node.id);
              }}
            >
              {/* Active selection dashed ring */}
              {isSelected && (
                <Circle
                  radius={24}
                  stroke="#c4b5fd"
                  strokeWidth={2}
                  dash={[4, 3]}
                />
              )}

              {/* Node circular badge */}
              <Circle
                radius={18}
                fill="#7c3aed"
                stroke="#ffffff"
                strokeWidth={2.5}
                shadowColor="#7c3aed"
                shadowBlur={8}
                shadowOpacity={0.5}
              />

              {/* Step number */}
              <Text
                text={String(node.stepNumber)}
                fontSize={13}
                fontFamily="sans-serif"
                fontStyle="bold"
                fill="#ffffff"
                align="center"
                verticalAlign="middle"
                width={36}
                height={36}
                offsetX={18}
                offsetY={18}
              />

              {/* Step Title Label Tag */}
              {node.title && (
                <Group y={22}>
                  <Rect
                    x={-titleWidth / 2}
                    width={titleWidth}
                    height={18}
                    fill="#1e1b4b"
                    stroke="#6d28d9"
                    strokeWidth={1}
                    cornerRadius={5}
                    opacity={0.92}
                    shadowColor="#000000"
                    shadowBlur={4}
                    shadowOpacity={0.3}
                  />
                  <Text
                    text={
                      node.title.length > 15
                        ? `${node.title.slice(0, 14)}…`
                        : node.title
                    }
                    fontSize={10}
                    fontFamily="sans-serif"
                    fontStyle="bold"
                    fill="#ddd6fe"
                    width={titleWidth}
                    height={18}
                    offsetX={titleWidth / 2}
                    align="center"
                    verticalAlign="middle"
                  />
                </Group>
              )}
            </Group>
          );
        })}
      </Layer>
    </Stage>
  );
};
