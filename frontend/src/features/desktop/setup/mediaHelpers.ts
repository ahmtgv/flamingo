import { openExternal } from '../bridge';

/**
 * Две мелочи шага 4, которым не место в компоненте.
 */

/**
 * Открыть системные настройки приватности — на нужном разделе.
 *
 * 🔴 Зачем вообще (промпт 21 §3.1): **если разрешение камеры однажды отклонили, macOS больше
 * НЕ СПРОСИТ.** Кнопка «проверить ещё раз» в этом состоянии бесполезна и врёт: сколько ни
 * жми, окно не появится. Единственный выход — системные настройки, и вести туда должны мы,
 * а не человек, вспоминающий, где это лежит.
 */
export function openSystemPrivacy(kind: 'camera' | 'microphone'): void {
  const pane = kind === 'camera' ? 'Privacy_Camera' : 'Privacy_Microphone';
  void openExternal(`x-apple.systempreferences:com.apple.preference.security?${pane}`);
}

/**
 * «Слышно себя» — короткий тон в выбранный динамик.
 *
 * Строка `setup.check.testSound` лежала в словаре с самого начала и числилась неиспользуемой
 * (AUDIT_STATIC §3). Это был не мусор, а доказательство, что кнопку задумали и не построили.
 *
 * Тон, а не запись: файл пришлось бы класть в сборку и тянуть по сети, а `AudioContext` уже
 * есть на этом экране ради индикатора уровня.
 */
export async function playTestSound(speakerId: string | null): Promise<boolean> {
  const Ctor =
    window.AudioContext ??
    (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctor) return false;
  const ctx = new Ctor();
  try {
    // `setSinkId` есть не везде; без него звук идёт в устройство по умолчанию — это лучше,
    // чем молчание, и честнее, чем отказ.
    const withSink = ctx as AudioContext & { setSinkId?: (id: string) => Promise<void> };
    if (speakerId && typeof withSink.setSinkId === 'function') {
      await withSink.setSinkId(speakerId).catch(() => {});
    }
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.value = 660;
    // Плавные края: щелчок на включении пугает сильнее, чем помогает сам сигнал.
    gain.gain.setValueAtTime(0, ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0.18, ctx.currentTime + 0.05);
    gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.6);
    osc.connect(gain).connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.65);
    await new Promise((r) => setTimeout(r, 800));
    return true;
  } catch {
    return false;
  } finally {
    void ctx.close().catch(() => {});
  }
}
