import { useEffect, useCallback } from 'react';

export interface KeyboardShortcut {
  key: string;
  ctrl?: boolean;
  shift?: boolean;
  alt?: boolean;
  description: string;
  action: () => void;
}

export const SHORTCUT_DEFINITIONS = [
  { key: 'z', ctrl: true, description: 'Undo last action' },
  { key: 'z', ctrl: true, shift: true, description: 'Redo last action' },
  { key: 'y', ctrl: true, description: 'Redo last action (alternate)' },
  { key: '=', ctrl: true, description: 'Zoom in' },
  { key: '-', ctrl: true, description: 'Zoom out' },
  { key: '0', ctrl: true, description: 'Reset zoom to 50%' },
  { key: 'h', ctrl: true, description: 'Split panel horizontally' },
  { key: 'j', ctrl: true, description: 'Split panel vertically' },
  { key: 'd', ctrl: true, description: 'Duplicate selected panel' },
  { key: 'Delete', description: 'Delete selected panel' },
  { key: 'Backspace', description: 'Delete selected panel (alternate)' },
  { key: 's', ctrl: true, description: 'Save project' },
  { key: 'n', ctrl: true, description: 'Add new page' },
  { key: 'Escape', description: 'Deselect current panel' },
];

interface UseKeyboardShortcutsProps {
  onUndo: () => void;
  onRedo: () => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onZoomReset: () => void;
  onSplitHorizontal: () => void;
  onSplitVertical: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
  onSave: () => void;
  onNewPage: () => void;
  onDeselect: () => void;
  enabled?: boolean;
}

export const useKeyboardShortcuts = ({
  onUndo,
  onRedo,
  onZoomIn,
  onZoomOut,
  onZoomReset,
  onSplitHorizontal,
  onSplitVertical,
  onDuplicate,
  onDelete,
  onSave,
  onNewPage,
  onDeselect,
  enabled = true,
}: UseKeyboardShortcutsProps) => {
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (!enabled) return;
    
    // Don't trigger shortcuts when typing in inputs
    const target = e.target as HTMLElement;
    if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
      return;
    }

    const ctrl = e.ctrlKey || e.metaKey;
    const shift = e.shiftKey;

    // Undo: Ctrl+Z
    if (ctrl && !shift && e.key === 'z') {
      e.preventDefault();
      onUndo();
      return;
    }

    // Redo: Ctrl+Shift+Z or Ctrl+Y
    if ((ctrl && shift && e.key === 'z') || (ctrl && e.key === 'y')) {
      e.preventDefault();
      onRedo();
      return;
    }

    // Zoom In: Ctrl+=
    if (ctrl && (e.key === '=' || e.key === '+')) {
      e.preventDefault();
      onZoomIn();
      return;
    }

    // Zoom Out: Ctrl+-
    if (ctrl && e.key === '-') {
      e.preventDefault();
      onZoomOut();
      return;
    }

    // Reset Zoom: Ctrl+0
    if (ctrl && e.key === '0') {
      e.preventDefault();
      onZoomReset();
      return;
    }

    // Split Horizontal: Ctrl+H
    if (ctrl && e.key === 'h') {
      e.preventDefault();
      onSplitHorizontal();
      return;
    }

    // Split Vertical: Ctrl+J
    if (ctrl && e.key === 'j') {
      e.preventDefault();
      onSplitVertical();
      return;
    }

    // Duplicate: Ctrl+D
    if (ctrl && e.key === 'd') {
      e.preventDefault();
      onDuplicate();
      return;
    }

    // Delete: Delete or Backspace
    if (e.key === 'Delete' || e.key === 'Backspace') {
      e.preventDefault();
      onDelete();
      return;
    }

    // Save: Ctrl+S
    if (ctrl && e.key === 's') {
      e.preventDefault();
      onSave();
      return;
    }

    // New Page: Ctrl+N
    if (ctrl && e.key === 'n') {
      e.preventDefault();
      onNewPage();
      return;
    }

    // Deselect: Escape
    if (e.key === 'Escape') {
      e.preventDefault();
      onDeselect();
      return;
    }
  }, [enabled, onUndo, onRedo, onZoomIn, onZoomOut, onZoomReset, onSplitHorizontal, onSplitVertical, onDuplicate, onDelete, onSave, onNewPage, onDeselect]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);
};
