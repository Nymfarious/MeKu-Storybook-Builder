import { Node, LeafNode, SplitNode } from '@/types/nodes';

export const uid = () => crypto.randomUUID();

export const appendGeneratedLine = (existing: string, newText: string) => {
  if (!existing.trim()) return newText;
  return existing + "\n\n" + newText;
};

export const DEFAULT_LEAF = (): LeafNode => ({
  kind: "leaf",
  id: uid(),
  contentType: "text",
  textProps: {
    text: "",
    fontSize: 16,
    color: "#000000",
    fontWeight: "normal",
    textAlign: "left",
    fontFamily: "Arial, sans-serif",
    lineHeight: 1.4,
    letterSpacing: 0,
    italic: false,
    underline: false,
    strikethrough: false,
    textShadow: "none",
    textTransform: "none",
    wordSpacing: 0,
    textBackground: "transparent",
    textBackgroundOpacity: 0,
    fontWeight100: 400,
    textGradient: "",
  },
  imageProps: {
    url: "",
    objectFit: "cover",
    opacity: 1,
    borderRadius: 0,
  },
  backgroundProps: {
    color: "#ffffff",
    opacity: 1,
  },
  padding: {
    top: 12,
    right: 12,
    bottom: 12,
    left: 12,
  }
});

export const findNode = (root: Node, id: string): Node | null => {
  if (root.id === id) return root;
  if (root.kind === "split") {
    for (const child of root.children) {
      const found = findNode(child, id);
      if (found) return found;
    }
  }
  return null;
};

export const updateNode = (root: Node, id: string, updater: (node: Node) => Node): Node => {
  if (root.id === id) return updater(root);
  if (root.kind === "split") {
    return {
      ...root,
      children: root.children.map(child => updateNode(child, id, updater))
    };
  }
  return root;
};

export const applyResize = (node: Node, index: number, delta: number): Node => {
  if (node.kind !== "split") return node;
  const newSizes = [...node.sizes];
  const total = newSizes.reduce((sum, size) => sum + size, 0);
  const normalizedDelta = delta / total;
  
  newSizes[index] = Math.max(0.05, Math.min(0.95, newSizes[index] + normalizedDelta));
  if (index + 1 < newSizes.length) {
    newSizes[index + 1] = Math.max(0.05, Math.min(0.95, newSizes[index + 1] - normalizedDelta));
  }
  
  const newTotal = newSizes.reduce((sum, size) => sum + size, 0);
  const normalizedSizes = newSizes.map(size => size / newTotal);
  
  return { ...node, sizes: normalizedSizes };
};

export const storyPrompts = [
  "A mysterious figure emerges from the shadows",
  "The hero discovers an ancient artifact",
  "An unexpected ally arrives at the crucial moment",
  "The villain reveals their true plan",
  "A dramatic chase begins through the city"
];
