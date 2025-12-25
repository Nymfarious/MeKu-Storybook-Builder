import { SplitNode } from '@/types/nodes';
import { DEFAULT_LEAF, uid } from '@/utils/nodeUtils';

// Page size definitions (in pixels at 96 DPI)
export const PAGE_SIZES = {
  'A4': { width: 794, height: 1123, name: 'A4 (210×297mm)' },
  'US Letter': { width: 816, height: 1056, name: 'US Letter (8.5×11")' },
  'US Legal': { width: 816, height: 1344, name: 'US Legal (8.5×14")' },
  'Square': { width: 800, height: 800, name: 'Square (800×800px)' },
  'Comic': { width: 675, height: 1050, name: 'Comic Book (6.75×10.5")' },
  'Manga': { width: 480, height: 700, name: 'Manga (B6 format)' }
};

export type PageSizeKey = keyof typeof PAGE_SIZES;

export interface LayoutPreset {
  name: string;
  category: string;
  root: SplitNode;
}

// Helper to create fresh preset instances
const createPresets = (): LayoutPreset[] => [
  // Basic Layouts
  {
    name: "Single Panel",
    category: "Basic",
    root: {
      kind: "split",
      id: uid(),
      direction: "horizontal",
      sizes: [1],
      children: [DEFAULT_LEAF()]
    }
  },
  {
    name: "Two Columns",
    category: "Basic",
    root: {
      kind: "split",
      id: uid(),
      direction: "horizontal",
      sizes: [0.5, 0.5],
      children: [DEFAULT_LEAF(), DEFAULT_LEAF()]
    }
  },
  {
    name: "Three Columns",
    category: "Basic",
    root: {
      kind: "split",
      id: uid(),
      direction: "horizontal",
      sizes: [0.33, 0.33, 0.34],
      children: [DEFAULT_LEAF(), DEFAULT_LEAF(), DEFAULT_LEAF()]
    }
  },
  {
    name: "Two Rows",
    category: "Basic",
    root: {
      kind: "split",
      id: uid(),
      direction: "vertical",
      sizes: [0.5, 0.5],
      children: [DEFAULT_LEAF(), DEFAULT_LEAF()]
    }
  },
  {
    name: "Three Rows",
    category: "Basic",
    root: {
      kind: "split",
      id: uid(),
      direction: "vertical",
      sizes: [0.33, 0.33, 0.34],
      children: [DEFAULT_LEAF(), DEFAULT_LEAF(), DEFAULT_LEAF()]
    }
  },
  {
    name: "Two by Two",
    category: "Basic",
    root: {
      kind: "split",
      id: uid(),
      direction: "vertical",
      sizes: [0.5, 0.5],
      children: [
        {
          kind: "split",
          id: uid(),
          direction: "horizontal",
          sizes: [0.5, 0.5],
          children: [DEFAULT_LEAF(), DEFAULT_LEAF()]
        },
        {
          kind: "split",
          id: uid(),
          direction: "horizontal",
          sizes: [0.5, 0.5],
          children: [DEFAULT_LEAF(), DEFAULT_LEAF()]
        }
      ]
    }
  },
  
  // Comic Layouts
  {
    name: "Hero Splash",
    category: "Comic",
    root: {
      kind: "split",
      id: uid(),
      direction: "horizontal",
      sizes: [1],
      children: [DEFAULT_LEAF()]
    }
  },
  {
    name: "Classic 6-Panel",
    category: "Comic",
    root: {
      kind: "split",
      id: uid(),
      direction: "vertical",
      sizes: [0.33, 0.33, 0.34],
      children: [
        {
          kind: "split",
          id: uid(),
          direction: "horizontal",
          sizes: [0.5, 0.5],
          children: [DEFAULT_LEAF(), DEFAULT_LEAF()]
        },
        {
          kind: "split",
          id: uid(),
          direction: "horizontal",
          sizes: [0.5, 0.5],
          children: [DEFAULT_LEAF(), DEFAULT_LEAF()]
        },
        {
          kind: "split",
          id: uid(),
          direction: "horizontal",
          sizes: [0.5, 0.5],
          children: [DEFAULT_LEAF(), DEFAULT_LEAF()]
        }
      ]
    }
  },
  {
    name: "L-Shape Layout",
    category: "Comic",
    root: {
      kind: "split",
      id: uid(),
      direction: "horizontal",
      sizes: [0.6, 0.4],
      children: [
        DEFAULT_LEAF(),
        {
          kind: "split",
          id: uid(),
          direction: "vertical",
          sizes: [0.5, 0.5],
          children: [DEFAULT_LEAF(), DEFAULT_LEAF()]
        }
      ]
    }
  },
  {
    name: "Vertical Strip",
    category: "Comic",
    root: {
      kind: "split",
      id: uid(),
      direction: "vertical",
      sizes: [0.2, 0.2, 0.2, 0.2, 0.2],
      children: [DEFAULT_LEAF(), DEFAULT_LEAF(), DEFAULT_LEAF(), DEFAULT_LEAF(), DEFAULT_LEAF()]
    }
  },
  {
    name: "Fi Split",
    category: "Comic", 
    root: {
      kind: "split",
      id: uid(),
      direction: "vertical",
      sizes: [0.3, 0.7],
      children: [
        DEFAULT_LEAF(),
        {
          kind: "split",
          id: uid(),
          direction: "horizontal",
          sizes: [0.7, 0.3],
          children: [DEFAULT_LEAF(), DEFAULT_LEAF()]
        }
      ]
    }
  },
  {
    name: "Focus Panel",
    category: "Comic",
    root: {
      kind: "split",
      id: uid(),
      direction: "vertical",
      sizes: [0.7, 0.3],
      children: [
        DEFAULT_LEAF(),
        {
          kind: "split",
          id: uid(),
          direction: "horizontal",
          sizes: [0.33, 0.33, 0.34],
          children: [DEFAULT_LEAF(), DEFAULT_LEAF(), DEFAULT_LEAF()]
        }
      ]
    }
  },

  // Magazine Layouts
  {
    name: "Article Layout",
    category: "Magazine",
    root: {
      kind: "split",
      id: uid(),
      direction: "horizontal",
      sizes: [0.35, 0.65],
      children: [
        DEFAULT_LEAF(),
        DEFAULT_LEAF()
      ]
    }
  },
  {
    name: "Feature Spread",
    category: "Magazine",
    root: {
      kind: "split",
      id: uid(),
      direction: "vertical",
      sizes: [0.4, 0.6],
      children: [
        DEFAULT_LEAF(),
        {
          kind: "split",
          id: uid(),
          direction: "horizontal",
          sizes: [0.5, 0.5],
          children: [DEFAULT_LEAF(), DEFAULT_LEAF()]
        }
      ]
    }
  },
  {
    name: "Sidebar Layout",
    category: "Magazine",
    root: {
      kind: "split",
      id: uid(),
      direction: "horizontal",
      sizes: [0.75, 0.25],
      children: [
        {
          kind: "split",
          id: uid(),
          direction: "vertical",
          sizes: [0.4, 0.6],
          children: [DEFAULT_LEAF(), DEFAULT_LEAF()]
        },
        DEFAULT_LEAF()
      ]
    }
  },
  {
    name: "Grid Gallery",
    category: "Magazine",
    root: {
      kind: "split",
      id: uid(),
      direction: "vertical",
      sizes: [0.5, 0.5],
      children: [
        {
          kind: "split",
          id: uid(),
          direction: "horizontal",
          sizes: [0.33, 0.33, 0.34],
          children: [DEFAULT_LEAF(), DEFAULT_LEAF(), DEFAULT_LEAF()]
        },
        {
          kind: "split",
          id: uid(),
          direction: "horizontal",
          sizes: [0.33, 0.33, 0.34],
          children: [DEFAULT_LEAF(), DEFAULT_LEAF(), DEFAULT_LEAF()]
        }
      ]
    }
  }
];

export const PRESETS = createPresets();

export const getDefaultPreset = (): SplitNode => {
  return JSON.parse(JSON.stringify(PRESETS[0].root));
};
