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
import { failureKind } from '@/shared/lib/requestFailure';
import { useUpload } from '@/shared/lib/useUpload';
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

// Порядок листа «Доска»: сначала «взять и передвинуть», потом «нарисовать», потом «положить».
const TOOLS: Tool[] = ['select', 'hand', 'pen', 'shape', 'link', 'text', 'sticker'];

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
/**
 * Это штрих или случайное движение мышью? (наряд 47 §5)
 *
 * 🔴 Порог был «два пункта»: любое протаскивание мышью по холсту — даже на три пикселя, даже
 * `onPointerLeave` при выходе курсора за край — коммитило ПОСТОЯННЫЙ элемент. На новом курсе
 * с нулём учеников доска оказалась покрыта штрихами, которых никто не рисовал. Очистки доски
 * в продукте нет ни одной мутацией, а `MAX_ELEMENTS = 2000` показывает, что накопление
 * задумано как норма, — значит каждый случайный штрих живёт вечно.
 *
 * Порог: минимум три точки И минимум шесть мировых пикселей пути. Осмысленная линия проходит
 * его всегда, дрожание руки — нет.
 *
 * ⚠️ Это МИНИМУМ, а не решение вопроса. Сама доска привязана к УРОКУ (`board/models.py`:
 * `lesson = OneToOneField`), то есть переживает свои проведения: второе занятие того же урока
 * откроет холст первого. Так задумано (комментарий в `LiveRoomScreen`), и вопрос владельцу
 * записан отдельно — см. `docs/handoff/OWNER_QUESTIONS.md`.
 */
const MIN_STROKE_POINTS = 3;
const MIN_STROKE_LENGTH = 6;

function isRealStroke(stroke: number[] | null): stroke is number[] {
  if (!stroke || stroke.length < MIN_STROKE_POINTS * 2) return false;
  let travelled = 0;
  for (let i = 2; i < stroke.length; i += 2) {
    travelled += Math.hypot(stroke[i] - stroke[i - 2], stroke[i + 1] - stroke[i - 1]);
    if (travelled >= MIN_STROKE_LENGTH) return true;
  }
  return false;
}

export function BoardCanvas({ lessonId }: { lessonId: string }) {
  const { t } = useTranslation('board');
  const surface = useRef<HTMLDivElement>(null);
  const wrap = useRef<HTMLDivElement>(null);
  const [view, setView] = useState<Viewport>({ x: 0, y: 0, zoom: 1 });
  /**
   * 🔴 ОТКРЫЛ ДОСКУ — УЖЕ РИСУЕШЬ (§28.2 п.1, требование владельца).
   *
   * Здесь стоял `'select'`: человек брал мел и обнаруживал, что мела в руке нет. На обычной
   * доске не выбирают сначала инструмент — берут и пишут. Выделение осталось отдельным
   * инструментом и первым в панели, так что дотянуться до него не дальше, чем было.
   *
   * ⚠️ Ученику, которому доска не открыта, перо ни к чему: `canWrite` у него false, и
   * рисование не начнётся. Ему по-прежнему доступны «выделить» и «рука» — то есть смотреть
   * и двигать холст. Поэтому умолчание зависит от права, а не одно на всех.
   */
  const [tool, setTool] = useState<Tool>('pen');
  const [local, setLocal] = useState<Element[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [linkFrom, setLinkFrom] = useState<string | null>(null);
  const { upload } = useUpload();
  const [uploading, setUploading] = useState(false);
  const [uploadFailed, setUploadFailed] = useState<string | null>(null);
  const [dropping, setDropping] = useState(false);
  /** Связь рвалась и состояние восстановлено — человеку об этом сказано, а не подменено молча. */
  const [resynced, setResynced] = useState<'reconnect' | 'return' | null>(null);
  const [fullscreen, setFullscreen] = useState(false);
  const [stroke, setStroke] = useState<number[] | null>(null);
  const [saved, setSaved] = useState(false);
  const [failed, setFailed] = useState(false);
  /**
   * 🔴 НАПИСАННОЕ ВО ВРЕМЯ ПРОВАЛА СВЯЗИ (RnD 18.08 §2.1-б, наряд 34 §2.1).
   *
   * Замер: преподаватель рисует штрих, пока связь на секунду пропала. Штрих не появлялся
   * даже у него самого, не уходил никому и не возвращался после связи — и **ему не говорили
   * ни слова**. Он продолжал вести урок, уверенный, что класс видит написанное.
   *
   * Причина была в одной строке `catch`: любой отказ считался отказом ДОСКИ («закрыли посреди
   * правки») и лечился перезапросом с сервера, то есть затиранием только что нарисованного.
   * Отказ доски и «запрос не дошёл» — разные события, и различать их продукт уже умеет
   * (`requestFailure.ts`), просто здесь не различал.
   *
   * Теперь не дошедшее ждёт в очереди и уходит, когда связь вернулась. Это не «оптимистичный
   * интерфейс»: человек ВИДИТ, что часть написанного ещё не ушла, — обещание молчанием было
   * бы хуже потери.
   */
  const pending = useRef<{ localId: string; element: Element }[]>([]);
  const [unsent, setUnsent] = useState(0);
  const drag = useRef<{ id: string; corner?: Corner; dx: number; dy: number } | null>(null);
  const panning = useRef<{ x: number; y: number } | null>(null);
  /**
   * 🔴 КУДА ЛОЖИТСЯ КАРТИНКА ИЗ БУФЕРА (наряд 53 §2, измерено).
   *
   * `paste` висит на `window` — у события нет координат, и картинка уходила в постоянную
   * точку `view + 80`. Замер: три вставки подряд легли в одно место (101,233) и накрыли
   * друг друга. Человек видит «вставилось не туда» или «не вставилось вовсе» — это и есть
   * «делает через раз».
   *
   * Помним последнюю точку указателя НАД ХОЛСТОМ (в мировых координатах) и кладём туда.
   */
  const lastPointer = useRef<{ x: number; y: number } | null>(null);
  /*
   * 🔴 НАДПИСЬ БЫЛО НЕВОЗМОЖНО НАПИСАТЬ (наряд 51 §2, замер владельца и прибор
   * `board-tools`). Инструмент «Текст» клал на холст слово-заглушку `t('newText')` и на этом
   * заканчивался: ввода не существовало ни при создании, ни по двойному щелчку.
   *
   * Правка идёт в обычном `<textarea>` поверх холста, а не внутри `<svg>`: `foreignObject`
   * в WebKit ведёт себя по-разному и роняет ввод с клавиатуры. Положение считается тем же
   * преобразованием, что и всё остальное (`toScreen`), поэтому поле стоит ровно на элементе
   * при любом сдвиге и масштабе.
   */
  const [editing, setEditing] = useState<{ id: string; text: string } | null>(null);

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

  // Право узнаём с ответом сервера, а не при первом рендере: до него `canWrite` ещё false,
  // и перо, выставленное сразу, оказалось бы выключенным у того, кто писать МОЖЕТ.
  useEffect(() => {
    setTool(canWrite ? 'pen' : 'select');
  }, [canWrite]);

  /**
   * 🔴 ДОСКА ДОСИНХРОНИЗИРУЕТСЯ ПОСЛЕ ОБРЫВА (§28.1.2).
   *
   * Подписка приносит ИЗМЕНЕНИЯ и не приносит того, что случилось, пока тебя не было.
   * Оборвалась связь на минуту — три штриха, нарисованные за эту минуту, не приезжали
   * никогда, и никто об этом не узнавал: у преподавателя на экране одно, у половины класса
   * другое, и оба уверены, что видят доску.
   *
   * Здесь два разных случая, и лечатся они по-разному:
   *   * `onComplete` — канал закрылся. Возвращаемся: перезапрашиваем состояние ЦЕЛИКОМ.
   *   * возврат вкладки/сцены — `visibilitychange`: подписка могла и не рваться, но пока
   *     вкладка спала, сообщения ушли в никуда.
   *
   * ⚠️ Молча подменять картинку нельзя. Преподаватель обязан понимать, что видит класс, —
   * поэтому после досинхронизации на доске появляется строка о том, что связь рвалась.
   */
  const resync = useCallback(
    async (why: 'reconnect' | 'return') => {
      const { data: fresh } = await refetch();
      if (!fresh?.board) return;
      setLocal(fresh.board.elements);
      setOpenForStudents(fresh.board.openForStudents);
      setResynced(why);
    },
    [refetch],
  );

  // Live: apply whatever arrives. No merge strategy beyond last-write-wins, by design.
  useBoardChangedSubscription({
    variables: { lessonId },
    onComplete: () => {
      // Канал закрылся — всё, что нарисовали без нас, мы не видели.
      void resync('reconnect');
    },
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

  /**
   * 🔴 КОЛЕСО И ЩИПОК (§28.2 п.2). `zoomAt` был написан и покрыт тестами — и не подключён
   * ни к одному событию: масштаб меняли только две кнопки ±20%, и те к ЦЕНТРУ ЭКРАНА.
   *
   * Масштаб идёт к точке под пальцами. Иначе холст «убегает»: приближаешь угол схемы, а
   * он уезжает за край, потому что растёт всё от середины.
   *
   * ⚠️ Слушатель вешаем руками с `passive: false`. React вешает `onWheel` пассивным, и
   * `preventDefault` в нём не работает — страница прокручивалась бы вместе с холстом.
   * На трекпаде щипок приходит тем же `wheel` с `ctrlKey`, поэтому отдельного кода для
   * трекпада нет: он тут уже есть.
   */
  useEffect(() => {
    const node = surface.current;
    if (!node) return undefined;
    const onWheel = (e: WheelEvent) => {
      if (!e.ctrlKey && !e.metaKey) return; // просто прокрутка — не наше дело
      e.preventDefault();
      const box = node.getBoundingClientRect();
      const at = { x: e.clientX - box.left, y: e.clientY - box.top };
      // Шаг мягкий: у трекпада событий много, и множитель 1.2 на каждое прыгал бы рывками.
      setView((v) => zoomAt(v, at, Math.exp(-e.deltaY / 300)));
    };
    node.addEventListener('wheel', onWheel, { passive: false });
    return () => node.removeEventListener('wheel', onWheel);
    /**
     * 🔴 ЗАВИСИМОСТЬ ЗДЕСЬ БЫЛА ПУСТАЯ, И ЩИПОК НЕ РАБОТАЛ НИ РАЗУ (наряд 34 §5).
     *
     * Замер 18.08: событие трекпада доходит до страницы (`deltaY=-240 ctrl=true` — проверено
     * прибором отдельно, чтобы не спутать с эмулятором), а масштаб не меняется.
     *
     * Причина: пока доска грузится, компонент отдаёт «…», и холста в разметке НЕТ. Эффект с
     * пустым списком отрабатывает ровно один раз — на этом самом первом рендере, — видит
     * `surface.current === null`, выходит и больше не возвращается. Когда холст появляется,
     * вешать слушатель уже некому.
     *
     * Ровно тот же механизм, что и во всём остальном этом заходе: код, который умеет
     * ответить, написан и проверен; доходит ли до него вопрос — нет.
     *
     * `data` в списке: приход доски — это и есть момент, когда холст появляется в разметке.
     */
  }, [data]);

  /**
   * 🔴 ПОЛНЫЙ ЭКРАН (§28.2 п.4, обещан владельцу 16.08 и не сделан).
   *
   * Просим у браузера настоящий полный экран — тогда уходит и рама приложения, и панель
   * задач. Если браузер отказал (политика, iOS Safari), доска всё равно раскрывается на
   * окно: свой режим лучше отсутствия, а `Esc` работает в обоих случаях.
   *
   * ⚠️ Состояние держим по СОБЫТИЮ браузера, а не по своему флажку: выйти из полного экрана
   * можно системным `Esc` мимо нашей кнопки, и тогда флажок врал бы.
   */
  useEffect(() => {
    const onChange = () => setFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener('fullscreenchange', onChange);
    return () => document.removeEventListener('fullscreenchange', onChange);
  }, []);

  const toggleFullscreen = useCallback(() => {
    const node = wrap.current;
    if (!node) return;
    if (document.fullscreenElement) {
      void document.exitFullscreen().catch(() => undefined);
      setFullscreen(false);
      return;
    }
    node.requestFullscreen?.().catch(() => undefined);
    // Свой режим — сразу, не дожидаясь браузера: если он откажет, доска всё равно
    // раскроется, а `fullscreenchange` поправит состояние, когда ответит.
    setFullscreen(true);
  }, []);

  /**
   * 🔴 ESC НЕ ВЫХОДИЛ ИЗ ПОЛНОГО ЭКРАНА (живой урок 18.08, наряд 37 §1.4).
   *
   * Владелец: «в приложении зависла доска на развёрнутом экране». Замер разобрал режим по
   * частям и оправдал четыре из пяти подозрений: холст растёт (771×360 → 1280×729), панель
   * видна, перо рисует, штрих доходит второму, щипок меняет масштаб (100 → 223 пикселя).
   * Не работало ровно одно — выход.
   *
   * Место названо: обработчик срабатывал ТОЛЬКО при `!document.fullscreenElement`, то есть
   * когда браузер уже вышел сам. В браузере Esc обрабатывает сам браузер, и до нас доходит
   * лишь уборка состояния. **Внутри приложения браузерной обёртки нет**: WKWebView Esc не
   * перехватывает, `document.fullscreenElement` остаётся, условие не выполняется — и доска
   * стоит развёрнутой без единого способа её свернуть с клавиатуры.
   *
   * Теперь Esc выходит АКТИВНО: зовём `exitFullscreen`, если браузер ещё в нём, и в любом
   * случае снимаем свой режим. В браузере это ничего не ломает — выход уже случился.
   */
  useEffect(() => {
    if (!fullscreen) return undefined;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      if (document.fullscreenElement) void document.exitFullscreen().catch(() => undefined);
      setFullscreen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [fullscreen]);

  const pointerWorld = useCallback(
    (e: { clientX: number; clientY: number }) => {
      const rect = surface.current?.getBoundingClientRect();
      return toWorld({ x: e.clientX - (rect?.left ?? 0), y: e.clientY - (rect?.top ?? 0) }, view);
    },
    [view],
  );

  /** Один и тот же вход мутации — и на первую отправку, и на повтор из очереди. */
  const inputOf = useCallback(
    (element: Partial<Element> & { kind: BoardElementKind }, id: string | null) => ({
      id,
      kind: element.kind,
      x: element.x ?? 0,
      y: element.y ?? 0,
      width: element.width ?? 0,
      height: element.height ?? 0,
      data: element.data ?? {},
    }),
    [],
  );

  /** Write through: optimistic locally, then persisted; the server broadcasts to everyone. */
  const commit = useCallback(
    async (element: Partial<Element> & { kind: BoardElementKind }, id?: string) => {
      setFailed(false);
      try {
        const { data: written } = await put({
          variables: { lessonId, input: inputOf(element, id ?? null) },
        });
        // Apply our own write at once. Waiting for the broadcast to come back would make the
        // canvas lag behind the hand holding the pen — and in a one-person room nothing ever
        // comes back at all.
        const saved = written?.putBoardElement;
        if (saved) {
          setLocal((prev) => [...prev.filter((e) => e.id !== saved.id), saved]);
        }
        // Возвращаем сохранённое: тому, кто создал надпись, она нужна сразу — открыть ввод.
        return saved ?? null;
      } catch (e) {
        if (failureKind(e) !== 'unreachable') {
          // Доска ОТКАЗАЛА (закрыли посреди правки) — вернуть правду сервера.
          setFailed(true);
          await refetch();
          return;
        }
        // 🔴 Запрос НЕ ДОШЁЛ. Написанное остаётся у автора на глазах и ждёт связи.
        // Затирать его перезапросом (как было) значит стереть работу человека молча.
        const localId = id ?? `unsent:${crypto.randomUUID()}`;
        const kept = { ...inputOf(element, localId), id: localId } as unknown as Element;
        setLocal((prev) => [...prev.filter((x) => x.id !== localId), kept]);
        pending.current = [...pending.current.filter((x) => x.localId !== localId), { localId, element: kept }];
        setUnsent(pending.current.length);
      }
    },
    [inputOf, lessonId, put, refetch],
  );

  /**
   * Досылка. Зовётся при возврате связи — и ДО перезапроса доски: перезапрос заменяет картину
   * серверной, а в ней неотправленного по определению нет.
   *
   * ⚠️ Останавливаемся на первом же не дошедшем: если связь ещё не вернулась, перебирать
   * остальные незачем, а терять их — тем более. Порядок сохраняется: доска — это то, что
   * писали по очереди.
   */
  const flushPending = useCallback(async () => {
    const queue = pending.current;
    if (queue.length === 0) return;
    for (let i = 0; i < queue.length; i += 1) {
      const item = queue[i];
      try {
        const { data: written } = await put({
          variables: { lessonId, input: inputOf(item.element, null) },
        });
        const saved = written?.putBoardElement;
        setLocal((prev) => [
          ...prev.filter((e) => e.id !== item.localId && e.id !== saved?.id),
          ...(saved ? [saved] : []),
        ]);
      } catch (e) {
        // Снова не дошло — оставляем этот и все следующие в очереди.
        pending.current = failureKind(e) === 'unreachable' ? queue.slice(i) : queue.slice(i + 1);
        setUnsent(pending.current.length);
        return;
      }
    }
    pending.current = [];
    setUnsent(0);
  }, [inputOf, lessonId, put]);

  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === 'visible') void resync('return');
    };
    /**
     * 🔴 ГЛАВНЫЙ СИГНАЛ — ВОЗВРАТ СЕТИ, И ЕГО ЗДЕСЬ НЕ БЫЛО (RnD 18.08, промпт 31 §2.1).
     *
     * Досинхронизацию я сделал в промпте 28 и проверил её СО СТОРОНЫ СЕРВЕРА: запрос доски
     * целиком действительно отдаёт всё, что нарисовали без тебя. Чего я не проверил —
     * дёргает ли клиент этот запрос на настоящем обрыве.
     *
     * Двухбраузерный заход показал: НЕ ДЁРГАЕТ. У ученика оборвали сеть, преподаватель
     * нарисовал три штриха, ученик вернулся — и остался с прежней картиной: 11 фигур против
     * 24 у преподавателя. Молча. Оба уверены, что смотрят на одну доску.
     *
     * Почему прежние сигналы молчат: вкладка не прячется (`visibilitychange` не приходит),
     * фокус не теряется (`focus` не приходит), а `graphql-ws` переподключается сам и
     * `onComplete` подписки не зовёт. То есть все три моих крючка мимо ровно того случая,
     * ради которого писались.
     *
     * `online` — событие самого браузера о том, что сеть вернулась. Прямой сигнал вместо
     * трёх косвенных.
     */
    /**
     * ⚠️ ПОРЯДОК ЗДЕСЬ — ЧАСТЬ ПОЧИНКИ, А НЕ ОФОРМЛЕНИЕ. Сначала досылаем СВОЁ, потом
     * забираем чужое: `resync` заменяет холст серверной картиной, и всё, что человек написал
     * без связи, пропало бы ровно в тот момент, когда связь вернулась.
     */
    const onBackOnline = () => void flushPending().then(() => resync('reconnect'));
    document.addEventListener('visibilitychange', onVisible);
    // Возврат на сцену доски внутри урока — то же самое: пока смотрели тест, доска ушла вперёд.
    window.addEventListener('focus', onVisible);
    window.addEventListener('online', onBackOnline);
    return () => {
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('focus', onVisible);
      window.removeEventListener('online', onBackOnline);
    };
  }, [flushPending, resync]);

  /**
   * 🔴 ЩИПОК ДВУМЯ ПАЛЬЦАМИ НА ПЛАНШЕТЕ (§28.2 п.2).
   *
   * `wheel` покрывает трекпад, но не сенсорный экран: там приходят два `pointer`-а. Держим
   * их сами, а не через жесты браузера — `touch-action: none` на холсте уже стоит, иначе
   * рисование конфликтовало бы с прокруткой страницы.
   *
   * Пока пальцев два, рисование не идёт: начатый штрих отменяется, чтобы от щипка не
   * оставалась случайная закорючка.
   */
  const pinch = useRef<Map<number, { x: number; y: number }>>(new Map());
  const pinchStart = useRef<{ dist: number; zoom: number } | null>(null);

  function pinchDistance(): number {
    const [a, b] = [...pinch.current.values()];
    return Math.hypot(a.x - b.x, a.y - b.y);
  }

  function pinchCentre(): { x: number; y: number } {
    const [a, b] = [...pinch.current.values()];
    const box = surface.current?.getBoundingClientRect();
    return { x: (a.x + b.x) / 2 - (box?.left ?? 0), y: (a.y + b.y) / 2 - (box?.top ?? 0) };
  }

  function onPointerDown(e: React.PointerEvent) {
    if (e.pointerType === 'touch') {
      pinch.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (pinch.current.size === 2) {
        pinchStart.current = { dist: pinchDistance(), zoom: view.zoom };
        setStroke(null); // от щипка не должно оставаться закорючки
        return;
      }
    }
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
        // Новая надпись создаётся ПУСТОЙ: слово-заглушка на холсте — это не текст, а мусор,
        // который человек потом стирает руками. Сразу открывается ввод.
        data: { text: tool === 'text' ? '' : t('newSticker') },
      }).then((saved) => {
        if (saved && tool === 'text') setEditing({ id: saved.id, text: '' });
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
    // Двойной щелчок по надписи — правка (поведение Freeform, §51.2).
    if (hit?.kind === 'TEXT' && e.detail === 2 && canWrite) {
      setEditing({ id: hit.id, text: String((hit.data as Record<string, unknown>)?.text ?? '') });
    }
  }

  function onPointerMove(e: React.PointerEvent) {
    lastPointer.current = pointerWorld(e);
    if (e.pointerType === 'touch' && pinch.current.has(e.pointerId)) {
      pinch.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (pinch.current.size === 2 && pinchStart.current) {
        const start = pinchStart.current;
        const factor = pinchDistance() / (start.dist || 1);
        // Масштаб считаем от НАЧАЛА щипка, а не накопительно: иначе к концу движения
        // множители перемножатся и холст улетит.
        const at = pinchCentre();
        setView((v) => zoomAt({ ...v, zoom: start.zoom }, at, factor));
        return;
      }
    }
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

  function onPointerUp(e?: React.PointerEvent) {
    if (e?.pointerType === 'touch') {
      pinch.current.delete(e.pointerId);
      if (pinch.current.size < 2) pinchStart.current = null;
    }
    panning.current = null;
    if (isRealStroke(stroke)) {
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

  /**
   * 🔴 КАРТИНКА ИДЁТ В ХРАНИЛИЩЕ, А НЕ В БАЗУ (§28.1.1).
   *
   * Здесь стоял `FileReader.readAsDataURL`, и base64 ложился прямо в `data` элемента — в
   * `JSONField`. Оттуда картинка уходила подпиской КАЖДОМУ в классе и лежала в каждом
   * ответе `board(lessonId:)`. Фотография с телефона — три-четыре мегабайта, в base64
   * около пяти: один вставленный снимок клал канал всему классу.
   *
   * Теперь путь тот же, что у любого файла продукта: `requestUpload` → подписанная ссылка →
   * клиент грузит в хранилище → в `data` ложится КЛЮЧ. По каналу летит ключ; ссылку на
   * показ выдаёт сервер (`resolved_data`), и живёт она минуты.
   *
   * Три двери, одна дорога: `Ctrl+V`, перетаскивание файла на холст и кнопка на панели.
   */
  const putImage = useCallback(
    async (file: File, at?: { x: number; y: number }) => {
      if (!file.type.startsWith('image/')) return;
      setUploading(true);
      setUploadFailed(null);
      try {
        const key = await upload(file, 'BOARD_IMAGE');
        await commit({
          kind: 'IMAGE' as BoardElementKind,
          x: at?.x ?? view.x + 80,
          y: at?.y ?? view.y + 80,
          width: 320,
          height: 240,
          data: { key },
        });
      } catch {
        // Молча проглоченная картинка — худший вид отказа: человек ждёт её на доске.
        setUploadFailed(t('image.failed'));
      } finally {
        setUploading(false);
      }
    },
    [commit, t, upload, view.x, view.y],
  );

  /*
   * 🔴 БУКВА НА КНОПКЕ БЕЗ КЛАВИШИ — ОБЕЩАНИЕ, КОТОРОГО НЕТ (наряд 53 §3).
   *
   * Лист рисует инструменты буквами горячих клавиш. Нарисовать букву и не привязать
   * клавишу — соврать на самом видном месте.
   *
   * ⚠️ Пока человек печатает (надпись на доске, чат, поле поиска), клавиши инструментов
   * молчат: иначе буква «T» посреди слова меняла бы инструмент.
   */
  useEffect(() => {
    if (!canWrite) return undefined;
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const node = document.activeElement;
      const typing =
        node instanceof HTMLInputElement ||
        node instanceof HTMLTextAreaElement ||
        (node instanceof HTMLElement && node.isContentEditable);
      if (typing) return;
      const next = TOOL_KEY[e.key.toLowerCase()];
      if (!next) return;
      setTool(next);
      setLinkFrom(null);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [canWrite]);

  useEffect(() => {
    if (!canWrite) return undefined;
    const onPaste = (e: ClipboardEvent) => {
      const file = [...(e.clipboardData?.items ?? [])]
        .find((i) => i.type.startsWith('image/'))
        ?.getAsFile();
      // Туда, где человек держит указатель; если он ни разу не был над холстом — как раньше.
      if (file) void putImage(file, lastPointer.current ?? undefined);
    };
    window.addEventListener('paste', onPaste);
    return () => window.removeEventListener('paste', onPaste);
  }, [canWrite, putImage]);

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
    <div className={styles.wrap} ref={wrap} data-fullscreen={fullscreen || undefined}>
      <div className={styles.toolbar} role="toolbar" aria-label={t('title')}>
        {TOOLS.map((id) => (
          <button
            key={id}
            type="button"
            className={styles.tool}
            /* 🔴 §51.2: метка для ЗАМЕРА, а не для стилей. Прошлый пробник угадывал
               строение холста (`svg g > *`) и в комнате находил первую попавшуюся иконку —
               отсюда «ноль узлов» на исправной доске. Метки убирают угадывание. */
            data-tool={id}
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
        <button
          type="button"
          className={styles.tool}
          aria-pressed={fullscreen}
          aria-label={t(fullscreen ? 'fullscreen.exit' : 'fullscreen.enter')}
          title={t(fullscreen ? 'fullscreen.exit' : 'fullscreen.enter')}
          onClick={toggleFullscreen}
        >
          {fullscreen ? '⤡' : '⤢'}
        </button>
        {/* Третья дверь: кнопка. `Ctrl+V` знают не все, перетащить можно не отовсюду. */}
        <label className={styles.tool} aria-label={t('image.add')} title={t('image.add')}>
          {uploading ? '…' : '🖼'}
          <input
            type="file"
            accept="image/*"
            hidden
            disabled={!canWrite || uploading}
            onChange={(e) => {
              const file = e.target.files?.[0];
              // Туда, где человек держит указатель; если он ни разу не был над холстом — как раньше.
      if (file) void putImage(file, lastPointer.current ?? undefined);
              e.target.value = '';
            }}
          />
        </label>
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

      {resynced && (
        <p className={styles.hint} role="status">
          {t(resynced === 'reconnect' ? 'resync.afterBreak' : 'resync.afterReturn')}{' '}
          <button type="button" className={styles.hintBtn} onClick={() => setResynced(null)}>
            {t('resync.ok')}
          </button>
        </p>
      )}

      {uploadFailed && (
        <p className={styles.hint} role="alert">
          {uploadFailed}
        </p>
      )}

      <div
        ref={surface}
        className={styles.surface}
        data-tool={tool}
        data-dropping={dropping || undefined}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerLeave={onPointerUp}
        onPointerCancel={onPointerUp}
        /* Вторая дверь для картинки (§28.2 п.3): перетащить файл прямо на холст.
           `preventDefault` на dragOver обязателен — без него браузер откроет файл вместо
           того, чтобы отдать его нам. */
        onDragOver={(e) => {
          if (!canWrite) return;
          e.preventDefault();
          setDropping(true);
        }}
        onDragLeave={() => setDropping(false)}
        onDrop={(e) => {
          if (!canWrite) return;
          e.preventDefault();
          setDropping(false);
          const file = e.dataTransfer.files[0];
          if (!file) return;
          // Кладём туда, куда отпустили, а не в угол: холст бесконечный, и «где-то там»
          // означает «ищи сам».
          const box = surface.current?.getBoundingClientRect();
          const at = box
            ? toWorld({ x: e.clientX - box.left, y: e.clientY - box.top }, view)
            : undefined;
          void putImage(file, at);
        }}
      >
        {editing &&
          (() => {
            const el = local.find((x) => x.id === editing.id);
            if (!el) return null;
            const at = toScreen({ x: el.x, y: el.y }, view);
            return (
              <textarea
                className={styles.textEdit}
                data-board-text-edit
                autoFocus
                value={editing.text}
                style={{
                  left: at.x,
                  top: at.y,
                  width: el.width * view.zoom,
                  height: Math.max(el.height, 40) * view.zoom,
                }}
                onChange={(ev) => setEditing({ ...editing, text: ev.target.value })}
                onKeyDown={(ev) => {
                  // Escape — уйти, не сохраняя. Enter без Shift — сохранить: надпись на доске
                  // редко бывает в несколько строк, а перенос доступен через Shift.
                  if (ev.key === 'Escape') setEditing(null);
                  if (ev.key === 'Enter' && !ev.shiftKey) {
                    ev.preventDefault();
                    (ev.target as HTMLTextAreaElement).blur();
                  }
                }}
                onBlur={() => {
                  const text = editing.text.trim();
                  setEditing(null);
                  // Пустая надпись не остаётся на холсте: это мусор, который никто не уберёт.
                  if (!text) {
                    void remove({ variables: { lessonId, elementId: el.id } });
                    setLocal((prev) => prev.filter((x) => x.id !== el.id));
                    return;
                  }
                  void commit({ ...el, data: { ...(el.data as object), text } }, el.id);
                }}
              />
            );
          })()}

        <svg className={styles.svg} role="presentation" data-board-canvas>
          <g
            /* Сдвиг и масштаб — наружу, чтобы их можно было прочесть, а не вывести. */
            data-board-viewport={`${Math.round(view.x)},${Math.round(view.y)},${view.zoom.toFixed(2)}`}
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
        <button
          type="button"
          className={styles.tool}
          aria-pressed={fullscreen}
          aria-label={t(fullscreen ? 'fullscreen.exit' : 'fullscreen.enter')}
          title={t(fullscreen ? 'fullscreen.exit' : 'fullscreen.enter')}
          onClick={toggleFullscreen}
        >
          {fullscreen ? '⤡' : '⤢'}
        </button>
        {/* Третья дверь: кнопка. `Ctrl+V` знают не все, перетащить можно не отовсюду. */}
        <label className={styles.tool} aria-label={t('image.add')} title={t('image.add')}>
          {uploading ? '…' : '🖼'}
          <input
            type="file"
            accept="image/*"
            hidden
            disabled={!canWrite || uploading}
            onChange={(e) => {
              const file = e.target.files?.[0];
              // Туда, где человек держит указатель; если он ни разу не был над холстом — как раньше.
      if (file) void putImage(file, lastPointer.current ?? undefined);
              e.target.value = '';
            }}
          />
        </label>
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
      {/*
        🔴 Не молчать о том, что написанное ещё не ушло (наряд 34 §2.1).
        Формулировка отвечает на вопрос, который у преподавателя ровно один: видит ли это класс.
      */}
      {unsent > 0 && (
        <p className={styles.failed} role="status">
          {t('unsent', { count: unsent })}
        </p>
      )}
      <p className={styles.hint}>{t('pasteHint')}</p>
    </div>
  );
}

/**
 * Буквы горячих клавиш вместо значков — лист «Доска» (наряд 53 §3).
 *
 * 🔴 Значки (↖ ✎ ▣ ▭ ↗ ✋) не сообщали ни имени, ни клавиши: человек угадывал по картинке,
 * а клавиша не была видна нигде. Буква говорит обе вещи разом, а имя инструмента живёт в
 * `aria-label` — там, где его прочтёт и читалка, и прибор.
 *
 * Порядок панели — по тому, что делает рука: взять и передвинуть · нарисовать · положить.
 */
const TOOL_GLYPH: Record<Tool, string> = {
  select: 'V',
  hand: 'H',
  pen: 'P',
  shape: 'R',
  link: 'L',
  text: 'T',
  sticker: 'S',
};

/** Клавиша → инструмент. Ровно те буквы, что нарисованы на кнопках. */
const TOOL_KEY: Record<string, Tool> = {
  v: 'select',
  h: 'hand',
  p: 'pen',
  r: 'shape',
  l: 'link',
  t: 'text',
  s: 'sticker',
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

  /** Метки для замера: вид и личность элемента читаются из DOM, а не угадываются. */
  const mark = { 'data-el': element.kind, 'data-el-id': element.id };

  if (element.kind === 'LINK') {
    const from = byId.get(String(data.from ?? ''));
    const to = byId.get(String(data.to ?? ''));
    if (!from || !to) return null;
    const ends = linkEnds(from, to);
    return <line className={styles.link} {...mark} {...ends} />;
  }

  if (element.kind === 'PEN') {
    return (
      <path
        {...mark}
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
    <g {...mark} data-selected={selected || undefined} data-linking={linking || undefined}>
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
