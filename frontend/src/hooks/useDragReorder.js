import { useState, useRef, useCallback } from 'react';

/**
 * Native HTML5 drag-and-drop hook for reordering an array of items in place.
 * The caller passes the current list + an onReorder(newOrderedIds) callback that
 * persists to the backend. The hook returns the props to spread on each row plus
 * the current dragging id so the UI can highlight it.
 *
 * Usage:
 *   const { dragProps, draggingId, overId } = useDragReorder(items, onReorder);
 *   items.map(it => <div {...dragProps(it.id)}>...</div>)
 */
export const useDragReorder = (items, onReorder, { idKey = 'id' } = {}) => {
  const [draggingId, setDraggingId] = useState(null);
  const [overId, setOverId] = useState(null);
  const orderRef = useRef([]);

  const dragProps = useCallback((id) => ({
    draggable: true,
    onDragStart: (e) => {
      setDraggingId(id);
      orderRef.current = items.map(it => it[idKey]);
      try { e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setData('text/plain', String(id)); } catch (_) {}
    },
    onDragOver: (e) => {
      e.preventDefault();
      try { e.dataTransfer.dropEffect = 'move'; } catch (_) {}
      if (overId !== id) setOverId(id);
    },
    onDragLeave: () => { if (overId === id) setOverId(null); },
    onDrop: (e) => {
      e.preventDefault();
      const src = draggingId;
      const dst = id;
      setDraggingId(null); setOverId(null);
      if (!src || src === dst) return;
      const cur = orderRef.current.length ? [...orderRef.current] : items.map(it => it[idKey]);
      const from = cur.indexOf(src);
      const to = cur.indexOf(dst);
      if (from < 0 || to < 0) return;
      cur.splice(from, 1);
      cur.splice(to, 0, src);
      onReorder(cur);
    },
    onDragEnd: () => { setDraggingId(null); setOverId(null); },
  }), [items, draggingId, overId, idKey, onReorder]);

  return { dragProps, draggingId, overId };
};
