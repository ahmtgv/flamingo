import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

import {
  type BoardElementKind,
  type BoardQuery,
  useBoardChangedSubscription,
  useBoardQuery,
  usePutBoardElementMutation,
  useRemoveBoardElementMutation,
  useSaveBoardMutation,
  useSetBoardOpenMutation,
} from '@/entities/graphql/generated';
import { Button } from '@/shared/ui';

import {
  type Corner,
  CORNERS,
  hitTest,
  linkEnds,
  panBy,
  resizeBox,
  strokeBounds,
  strokePath,
  toScreen,
  toWorld,
  type Viewport,
  zoomAt,
} from '../model/canvas';

import styles from './board.module.css';

type Element = BoardQuery['board']['elements'][number];
type Tool = 'select' | 'pen' | 'text' | 'sticker' | 'shape' | 'link' | 'hand';

const TOOLS: Tool[] = ['select', 'pen', 'text', 'sticker', 'shape', 'link', 'hand'];

/**
 * The lesson board — atlas sheet 02.
 *
 * An infinite canvas: there is no page, only a viewport onto world coordinates. Pen, text,
 * stickers, shapes and connectors all live on the same surface, which is what makes a
 * mind-map just a board with links on it rather than a separate mode.
 *
 * Writing is the teacher's to give: everyone always SEES the board (it is the lesson
 * happening), and the toolbar tells a learner whether it is open instead of letting them
 * discover it by a click that does nothing.
 *
 * Changes are optimistic. A local edit is applied immediately and the subscription reconciles
 * it; last write wins. A canvas that freezes while somebody is thinking is a worse failure
 * than a rare overwrite.
 */
export function BoardCanvas({ lessonId }: { lessonId: string }) {
  const { t } = useTranslation('board');
  const surface = useRef<HTMLDivElement>(null);
  const [view, setView] = useState<Viewport>({ x: 0, y: 0, zoom: 1 });
  const [tool, setTool] = useState<Tool>('select');
  const [local, setLocal] = useState<Element[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [linkFrom, setLinkFrom] = useState<string | null>(null);
  const [stroke, setStroke] = useState<number[] | null>(null);
  const [saved, setSaved] = useState(false);
  const [failed, setFailed] = useState(false);
  const drag = useRef<{ id: string; corner?: Corner; dx: number; dy: number } | null>(null);
  const panning = useRef<{ x: number; y: number } | null>(null);

  const { data, loading, error, refetch } = useBoardQuery({ variables: { lessonId } });
  const [put] = usePutBoardElementMutation();
  const [remove] = useRemoveBoardElementMutation();
  const [setOpen] = useSetBoardOpenMutation();
  const [saveBoard] = useSaveBoardMutation();

  const board = data?.board;
  const canWrite = board?.canWrite ?? false;
  const isTeacher = board?.isTeacher ?? false;
  // Held locally so the teacher's own switch answers immediately. A control that waits for a
  // round trip to show its new state reads as broken even when it worked.
  const [openForStudents, setOpenForStudents] = useState(false);

  useEffect(() => {
    if (!board) return;
    setLocal(board.elements);
    setOpenForStudents(board.openForStudents);
  }, [board]);

  // Live: apply whatever arrives. No merge strategy beyond last-write-wins, by design.
  useBoardChangedSubscription({
    variables: { lessonId },
    onData: ({ data: payload }) => {
      const change = payload.data?.boardChanged;
      if (!change) return;
      if (change.kind === 'removed' && change.elementId) {
        setLocal((prev) => prev.filter((e) => e.id !== change.elementId));
      } else if (change.element) {
        const incoming = change.element;
        setLocal((prev) => {
          const rest = prev.filter((e) => e.id !== incoming.id);
          return [...rest, incoming];
        });
      } else if (change.kind === 'access') {
        setOpenForStudents(Boolean(change.openForStudents));
        void refetch();
      }
    },
  });

  const pointerWorld = useCallback(
    (e: { clientX: number; clientY: number }) => {
      const rect = surface.current?.getBoundingClientRect();
      return toWorld({ x: e.clientX - (rect?.left ?? 0), y: e.clientY - (rect?.top ?? 0) }, view);
    },
    [view],
  );

  /** Write through: optimistic locally, then persisted; the server broadcasts to everyone. */
  const commit = useCallback(
    async (element: Partial<Element> & { kind: BoardElementKind }, id?: string) => {
      setFailed(false);
      try {
        const { data: written } = await put({
          variables: {
            lessonId,
            input: {
              id: id ?? null,
              kind: element.kind,
              x: element.x ?? 0,
              y: element.y ?? 0,
              width: element.width ?? 0,
              height: element.height ?? 0,
              data: element.data ?? {},
            },
          },
        });
        // Apply our own write at once. Waiting for the broadcast to come back would make the
        // canvas lag behind the hand holding the pen — and in a one-person room nothing ever
        // comes back at all.
        const saved = written?.putBoardElement;
        if (saved) {
          setLocal((prev) => [...prev.filter((e) => e.id !== saved.id), saved]);
        }
      } catch {
        // The board refused us (closed mid-edit) — put the server's truth back.
        setFailed(true);
        await refetch();
      }
    },
    [lessonId, put, refetch],
  );

  function onPointerDown(e: React.PointerEvent) {
    const world = pointerWorld(e);
    if (tool === 'hand' || e.button === 1) {
      panning.current = { x: e.clientX, y: e.clientY };
      return;
    }
    if (!canWrite) return;

    if (tool === 'pen') {
      setStroke([world.x, world.y]);
      return;
    }
    if (tool === 'text' || tool === 'sticker') {
      const kind = (tool === 'text' ? 'TEXT' : 'STICKER') as BoardElementKind;
      void commit({
        kind,
        x: world.x,
        y: world.y,
        width: 180,
        height: tool === 'text' ? 40 : 120,
        data: { text: tool === 'text' ? t('newText') : t('newSticker') },
      });
      setTool('select');
      return;
    }
    if (tool === 'shape') {
      void commit({
        kind: 'SHAPE' as BoardElementKind,
        x: world.x,
        y: world.y,
        width: 160,
        height: 100,
        data: {},
      });
      setTool('select');
      return;
    }

    const hit = hitTest(local as (Element & { id: string })[], world);
    if (tool === 'link') {
      // A connector is two clicks: pick one object, then the other.
      if (!hit) return;
      if (!linkFrom) {
        setLinkFrom(hit.id);
      } else if (linkFrom !== hit.id) {
        void commit({ kind: 'LINK' as BoardElementKind, data: { from: linkFrom, to: hit.id } });
        setLinkFrom(null);
        setTool('select');
      }
      return;
    }
    setSelected(hit?.id ?? null);
    if (hit) drag.current = { id: hit.id, dx: world.x - hit.x, dy: world.y - hit.y };
  }

  function onPointerMove(e: React.PointerEvent) {
    if (panning.current) {
      setView((v) => panBy(v, e.clientX - panning.current!.x, e.clientY - panning.current!.y));
      panning.current = { x: e.clientX, y: e.clientY };
      return;
    }
    const world = pointerWorld(e);
    if (stroke) {
      setStroke((s) => (s ? [...s, world.x, world.y] : s));
      return;
    }
    const active = drag.current;
    if (!active) return;
    setLocal((prev) =>
      prev.map((el) => {
        if (el.id !== active.id) return el;
        if (active.corner) return { ...el, ...resizeBox(el, active.corner, world) };
        return { ...el, x: world.x - active.dx, y: world.y - active.dy };
      }),
    );
  }

  function onPointerUp() {
    panning.current = null;
    if (stroke && stroke.length >= 4) {
      const bounds = strokeBounds(stroke);
      void commit({ kind: 'PEN' as BoardElementKind, ...bounds, data: { points: stroke } });
    }
    setStroke(null);
    const active = drag.current;
    drag.current = null;
    if (!active) return;
    const moved = local.find((e) => e.id === active.id);
    if (moved) void commit(moved, moved.id);
  }

  /** Ctrl+V puts an image straight on the canvas (sheet 02). */
  useEffect(() => {
    if (!canWrite) return undefined;
    const onPaste = (e: ClipboardEvent) => {
      const file = [...(e.clipboardData?.items ?? [])]
        .find((i) => i.type.startsWith('image/'))
        ?.getAsFile();
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        void commit({
          kind: 'IMAGE' as BoardElementKind,
          x: view.x + 80,
          y: view.y + 80,
          width: 320,
          height: 240,
          // The preview keeps the data URL; a real upload swaps it for an object key, which
          // is what the model stores — a board never holds a media stream.
          data: { src: String(reader.result) },
        });
      };
      reader.readAsDataURL(file);
    };
    window.addEventListener('paste', onPaste);
    return () => window.removeEventListener('paste', onPaste);
  }, [canWrite, commit, view.x, view.y]);

  if (loading && !data) return <p className={styles.hint}>…</p>;
  if (error && !data) {
    // A status, not an alert: the board is a scene behind whatever the person is doing, and
    // shouting over the thing in front of them (a camera error, say) is the wrong priority.
    return (
      <p className={styles.hint} role="status">
        {t('error')}
      </p>
    );
  }

  const byId = new Map(local.map((e) => [e.id, e]));

  return (
    <div className={styles.wrap}>
      <div className={styles.toolbar} role="toolbar" aria-label={t('title')}>
        {TOOLS.map((id) => (
          <button
            key={id}
            type="button"
            className={styles.tool}
            aria-pressed={tool === id}
            aria-label={t(`tool.${id}`)}
            disabled={!canWrite && id !== 'select' && id !== 'hand'}
            onClick={() => {
              setTool(id);
              setLinkFrom(null);
            }}
          >
            {TOOL_GLYPH[id]}
          </button>
        ))}
        <span className={styles.spacer} />
        <button
          type="button"
          className={styles.tool}
          aria-label={t('zoomOut')}
          onClick={() => setView((v) => zoomAt(v, { x: 0, y: 0 }, 1 / 1.2))}
        >
          −
        </button>
        <span className={styles.zoom}>{Math.round(view.zoom * 100)}%</span>
        <button
          type="button"
          className={styles.tool}
          aria-label={t('zoomIn')}
          onClick={() => setView((v) => zoomAt(v, { x: 0, y: 0 }, 1.2))}
        >
          +
        </button>
      </div>

      <div
        ref={surface}
        className={styles.surface}
        data-tool={tool}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerLeave={onPointerUp}
      >
        <svg className={styles.svg} role="presentation">
          <g
            transform={`translate(${-view.x * view.zoom} ${-view.y * view.zoom}) scale(${view.zoom})`}
          >
            {local.map((el) => (
              <ElementShape
                key={el.id}
                element={el}
                byId={byId}
                selected={selected === el.id}
                linking={linkFrom === el.id}
              />
            ))}
            {stroke && <path className={styles.penLive} d={strokePath(stroke)} fill="none" />}
          </g>
        </svg>

        {/* Handles live outside the SVG so they keep a constant screen size at any zoom. */}
        {selected &&
          byId.get(selected) &&
          canWrite &&
          CORNERS.map((corner) => {
            const el = byId.get(selected)!;
            const p = toScreen(
              {
                x: el.x + (corner === 'ne' || corner === 'se' ? el.width : 0),
                y: el.y + (corner === 'sw' || corner === 'se' ? el.height : 0),
              },
              view,
            );
            return (
              <button
                key={corner}
                type="button"
                className={styles.handle}
                style={{ left: p.x, top: p.y }}
                aria-label={`${t('tool.select')} ${corner}`}
                onPointerDown={(e) => {
                  e.stopPropagation();
                  drag.current = { id: el.id, corner, dx: 0, dy: 0 };
                }}
              />
            );
          })}
      </div>

      <div className={styles.footer}>
        {isTeacher ? (
          <Button
            size="sm"
            variant={openForStudents ? 'primary' : 'secondary'}
            onClick={() => {
              const next = !openForStudents;
              setOpenForStudents(next);
              void setOpen({ variables: { lessonId, isOpen: next } }).catch(() => {
                setOpenForStudents(!next);
                setFailed(true);
              });
            }}
          >
            {t(openForStudents ? 'openForStudents' : 'closedForStudents')}
          </Button>
        ) : (
          <span className={styles.state} role="status">
            {t(openForStudents ? 'openHint' : 'closedHint')}
          </span>
        )}
        {linkFrom && <span className={styles.hint}>{t('linkFirst')}</span>}
        {tool === 'link' && !linkFrom && <span className={styles.hint}>{t('linkHint')}</span>}
        <span className={styles.spacer} />
        {selected && canWrite && (
          <Button
            size="sm"
            variant="ghost"
            onClick={() => {
              void remove({ variables: { lessonId, elementId: selected } });
              setLocal((prev) => prev.filter((e) => e.id !== selected));
              setSelected(null);
            }}
          >
            {t('clear')}
          </Button>
        )}
        {isTeacher && (
          <Button
            size="sm"
            variant="secondary"
            onClick={() =>
              void saveBoard({ variables: { lessonId, title: null } })
                .then(() => setSaved(true))
                .catch(() => setFailed(true))
            }
          >
            {t('save')}
          </Button>
        )}
      </div>

      {saved && <p className={styles.saved}>{t('saved')}</p>}
      {failed && (
        <p className={styles.failed} role="alert">
          {t('saveFailed')}
        </p>
      )}
      <p className={styles.hint}>{t('pasteHint')}</p>
    </div>
  );
}

const TOOL_GLYPH: Record<Tool, string> = {
  select: '↖',
  pen: '✎',
  text: 'T',
  sticker: '▣',
  shape: '▭',
  link: '↗',
  hand: '✋',
};

/** One element, drawn in world coordinates. Authorship is always on it (sheet 02). */
function ElementShape({
  element,
  byId,
  selected,
  linking,
}: {
  element: Element;
  byId: Map<string, Element>;
  selected: boolean;
  linking: boolean;
}) {
  const { t } = useTranslation('board');
  const label = t('author', { name: element.authorName });
  const data = (element.data ?? {}) as Record<string, unknown>;

  if (element.kind === 'LINK') {
    const from = byId.get(String(data.from ?? ''));
    const to = byId.get(String(data.to ?? ''));
    if (!from || !to) return null;
    const ends = linkEnds(from, to);
    return <line className={styles.link} {...ends} />;
  }

  if (element.kind === 'PEN') {
    return (
      <path
        className={styles.pen}
        d={strokePath((data.points as number[]) ?? [])}
        fill="none"
        data-selected={selected || undefined}
      >
        <title>{label}</title>
      </path>
    );
  }

  return (
    <g data-selected={selected || undefined} data-linking={linking || undefined}>
      {element.kind === 'IMAGE' ? (
        <image
          href={String(data.src ?? '')}
          x={element.x}
          y={element.y}
          width={element.width}
          height={element.height}
          preserveAspectRatio="xMidYMid slice"
        />
      ) : (
        <rect
          className={element.kind === 'STICKER' ? styles.sticker : styles.shape}
          x={element.x}
          y={element.y}
          width={element.width}
          height={element.height}
          rx={element.kind === 'STICKER' ? 4 : 8}
        />
      )}
      {'text' in data && (
        <text className={styles.text} x={element.x + 10} y={element.y + 24}>
          {String(data.text)}
        </text>
      )}
      <text className={styles.author} x={element.x + 10} y={element.y + element.height - 8}>
        {label}
      </text>
      <title>{label}</title>
    </g>
  );
}
