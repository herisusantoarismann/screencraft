import { create } from "zustand";

export interface FlowNode {
  id: string;
  stepNumber: number;
  x: number;
  y: number;
  title: string;
  description: string;
}

export interface FlowState {
  nodes: FlowNode[];
  activeNodeId: string | null;
  addNode: (x: number, y: number) => FlowNode;
  updateNodeText: (id: string, title: string, description: string) => void;
  updateNodePosition: (id: string, x: number, y: number) => void;
  deleteNode: (id: string) => void;
  setActiveNodeId: (id: string | null) => void;
  resetFlow: () => void;
}

export const useFlowStore = create<FlowState>((set, get) => ({
  nodes: [],
  activeNodeId: null,

  addNode: (x: number, y: number) => {
    const currentNodes = get().nodes;
    const nextStep = currentNodes.length + 1;
    const newNode: FlowNode = {
      id: `flow-node-${Date.now()}-${nextStep}`,
      stepNumber: nextStep,
      x: Math.round(x),
      y: Math.round(y),
      title: `Step ${nextStep}`,
      description: `Description for step ${nextStep}`,
    };

    set({
      nodes: [...currentNodes, newNode],
      activeNodeId: newNode.id,
    });

    return newNode;
  },

  updateNodeText: (id: string, title: string, description: string) => {
    set((state) => ({
      nodes: state.nodes.map((node) =>
        node.id === id ? { ...node, title, description } : node
      ),
    }));
  },

  updateNodePosition: (id: string, x: number, y: number) => {
    set((state) => ({
      nodes: state.nodes.map((node) =>
        node.id === id ? { ...node, x: Math.round(x), y: Math.round(y) } : node
      ),
    }));
  },

  deleteNode: (id: string) => {
    set((state) => {
      const filtered = state.nodes.filter((node) => node.id !== id);
      // Re-index remaining nodes sequentially (1, 2, 3...)
      const renumbered = filtered.map((node, index) => ({
        ...node,
        stepNumber: index + 1,
      }));

      return {
        nodes: renumbered,
        activeNodeId: state.activeNodeId === id ? null : state.activeNodeId,
      };
    });
  },

  setActiveNodeId: (activeNodeId: string | null) => set({ activeNodeId }),

  resetFlow: () => set({ nodes: [], activeNodeId: null }),
}));

/**
 * Helper to export flow steps as formatted Markdown
 */
export const exportFlowToMarkdown = (nodes: FlowNode[]): string => {
  if (nodes.length === 0) {
    return "### Workflow / Reproduction Steps\n\n*(No steps created yet)*\n";
  }

  const lines: string[] = ["### Workflow / Reproduction Steps\n"];

  nodes.forEach((node) => {
    const title = node.title.trim() || `Step ${node.stepNumber}`;
    const desc = node.description.trim();
    if (desc) {
      lines.push(`${node.stepNumber}. **${title}**: ${desc}`);
    } else {
      lines.push(`${node.stepNumber}. **${title}**`);
    }
  });

  return lines.join("\n") + "\n";
};
