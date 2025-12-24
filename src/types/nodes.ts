// Node type definitions for the Graphic Novel Builder

export type Node = LeafNode | SplitNode;

export interface LeafNode {
  kind: "leaf";
  id: string;
  contentType: "text" | "image";
  textProps: {
    text: string;
    fontSize: number;
    color: string;
    fontWeight: string;
    textAlign: "left" | "center" | "right" | "justify";
    fontFamily: string;
    lineHeight: number;
    letterSpacing: number;
    italic: boolean;
    underline: boolean;
    strikethrough: boolean;
    textShadow: string;
    textTransform: "none" | "uppercase" | "lowercase" | "capitalize";
    wordSpacing: number;
    textBackground: string;
    textBackgroundOpacity: number;
    fontWeight100: number;
    textGradient: string;
  };
  imageProps: {
    url: string;
    objectFit: "cover" | "contain" | "fill";
    opacity: number;
    borderRadius: number;
  };
  backgroundProps: {
    color: string;
    opacity: number;
  };
  padding: {
    top: number;
    right: number;
    bottom: number;
    left: number;
  };
}

export interface SplitNode {
  kind: "split";
  id: string;
  direction: "horizontal" | "vertical";
  sizes: number[];
  children: Node[];
}
