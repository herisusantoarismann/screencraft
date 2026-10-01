import React from "react";
import { Workflow, X, Trash2 } from "lucide-react";
import type { FlowNode } from "../../stores/flowStore";

export interface FlowNodeEditPopoverProps {
  activeNode: FlowNode | null;
  containerWidth: number;
  containerHeight: number;
  onUpdateNodeText: (id: string, title: string, description: string) => void;
  onDeleteNode: (id: string) => void;
  onClose: () => void;
}

export const FlowNodeEditPopover: React.FC<FlowNodeEditPopoverProps> = ({
  activeNode,
  containerWidth,
  containerHeight,
  onUpdateNodeText,
  onDeleteNode,
  onClose,
}) => {
  if (!activeNode) return null;

  const left = Math.min(
    Math.max(16, activeNode.x - 144),
    containerWidth - 304
  );

  const top =
    activeNode.y + 45 + 230 > containerHeight
      ? Math.max(16, activeNode.y - 240)
      : activeNode.y + 45;

  return (
    <div
      className="fixed z-50 bg-neutral-900/95 border border-purple-500/70 rounded-2xl shadow-2xl p-4 w-72 backdrop-blur-md animate-in fade-in zoom-in-95 duration-150 select-none text-white"
      style={{
        left: `${left}px`,
        top: `${top}px`,
      }}
    >
      <div className="flex items-center justify-between pb-2 mb-3 border-b border-neutral-800">
        <div className="flex items-center gap-1.5 text-xs font-bold text-purple-400">
          <Workflow className="w-3.5 h-3.5" />
          <span>Edit Step #{activeNode.stepNumber}</span>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="text-neutral-400 hover:text-white p-0.5 rounded-lg hover:bg-neutral-800 transition-colors cursor-pointer"
          title="Tutup"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      <div className="flex flex-col gap-1 mb-2.5">
        <label className="text-[10px] uppercase font-bold text-neutral-400">
          Judul Langkah
        </label>
        <input
          type="text"
          value={activeNode.title}
          onChange={(e) =>
            onUpdateNodeText(activeNode.id, e.target.value, activeNode.description)
          }
          className="w-full px-2.5 py-1.5 bg-neutral-950/80 border border-neutral-700/80 rounded-lg text-xs text-white focus:outline-hidden focus:border-purple-500"
          placeholder="Contoh: Klik tombol submit"
        />
      </div>

      <div className="flex flex-col gap-1 mb-3">
        <label className="text-[10px] uppercase font-bold text-neutral-400">
          Deskripsi / Detail
        </label>
        <textarea
          rows={3}
          value={activeNode.description}
          onChange={(e) =>
            onUpdateNodeText(activeNode.id, activeNode.title, e.target.value)
          }
          className="w-full px-2.5 py-1.5 bg-neutral-950/80 border border-neutral-700/80 rounded-lg text-xs text-neutral-200 focus:outline-hidden focus:border-purple-500 resize-none"
          placeholder="Contoh: Form validasi gagal dan toast error muncul"
        />
      </div>

      <div className="flex items-center justify-between pt-1">
        <button
          type="button"
          onClick={() => onDeleteNode(activeNode.id)}
          className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium text-red-400 hover:text-red-300 hover:bg-red-950/50 transition-colors cursor-pointer"
        >
          <Trash2 className="w-3.5 h-3.5" />
          <span>Hapus</span>
        </button>
        <button
          type="button"
          onClick={onClose}
          className="px-3 py-1 bg-purple-600 hover:bg-purple-500 text-white rounded-lg text-xs font-semibold shadow-md shadow-purple-600/30 transition-all cursor-pointer"
        >
          Selesai
        </button>
      </div>
    </div>
  );
};
