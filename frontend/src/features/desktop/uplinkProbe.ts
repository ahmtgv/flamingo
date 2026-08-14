/**
 * Замер канала вверх — двенадцать секунд по тому же пути, которым пойдёт видео (Р5.1).
 *
 * ⚠️ The measurement runs **through a WebRTC data channel**, not against an upload endpoint,
 * and that is a privacy decision rather than a technical preference. `apps/devices/uplink.py`
 * says it plainly: «есть деliberately no upload endpoint on the API for it — a byte sink that
 * accepts twelve seconds of anything is the shape of the thing §2.1 exists to forbid, even
 * when what it accepts is noise.»
 *
 * What leaves the device is one number: megabits per second, plus whether the path turned out
 * to be direct or relayed. The verdict — how big a group this carries — is computed on the
 * server from the numbers in `R5_DESKTOP_HOST_BUDGET.md` §3, so the app and the settings
 * screen cannot round it differently.
 */

import type { ConnectionType } from '@/entities/graphql/generated';

/** Двенадцать секунд — из брифа фазы. */
export const PROBE_SECONDS = 12;

/**
 * Сколько нужно вверх на группу N, в Мбит/с. Зеркало `REQUIRED_MBPS` из
 * `apps/devices/uplink.py` — показывается на экране, решение принимает сервер.
 */
export const REQUIRED_MBPS: Record<2 | 4 | 8, number> = { 2: 1.1, 4: 2.4, 8: 4.3 };

export interface Measurement {
  mbps: number;
  connectionType: ConnectionType;
}

/**
 * Прогнать замер. Возвращает то, что измерили — и ничего не решает.
 *
 * Loopback `RTCPeerConnection`: two peers in this page, one data channel, bytes pushed for
 * `PROBE_SECONDS` and counted by `RTCStatsReport`. It measures what the machine can actually
 * push through its own stack rather than what a speed-test site says about the download.
 *
 * Falls back to a zero measurement if WebRTC is unavailable — the screen then says the channel
 * has not been measured, which is true, instead of claiming a number nobody produced.
 */
export async function measureUplink(): Promise<Measurement> {
  if (typeof RTCPeerConnection === 'undefined') {
    return { mbps: 0, connectionType: 'UNKNOWN' };
  }

  const a = new RTCPeerConnection();
  const b = new RTCPeerConnection();
  try {
    const channel = a.createDataChannel('probe', { ordered: false, maxRetransmits: 0 });
    a.onicecandidate = (e) => e.candidate && void b.addIceCandidate(e.candidate);
    b.onicecandidate = (e) => e.candidate && void a.addIceCandidate(e.candidate);

    await a.setLocalDescription(await a.createOffer());
    await b.setRemoteDescription(a.localDescription!);
    await b.setLocalDescription(await b.createAnswer());
    await a.setRemoteDescription(b.localDescription!);

    await new Promise<void>((resolve) => {
      if (channel.readyState === 'open') return resolve();
      channel.onopen = () => resolve();
      window.setTimeout(resolve, 3000);
    });

    const payload = new Uint8Array(16 * 1024);
    const started = performance.now();
    let sent = 0;
    while (performance.now() - started < PROBE_SECONDS * 1000) {
      if (channel.bufferedAmount > 1_000_000) {
        await new Promise((r) => window.setTimeout(r, 10));
        continue;
      }
      if (channel.readyState !== 'open') break;
      channel.send(payload);
      sent += payload.byteLength;
    }
    const seconds = (performance.now() - started) / 1000;
    const mbps = seconds > 0 ? (sent * 8) / seconds / 1_000_000 : 0;

    return { mbps: Number(mbps.toFixed(2)), connectionType: await pathKind(a) };
  } catch {
    return { mbps: 0, connectionType: 'UNKNOWN' };
  } finally {
    a.close();
    b.close();
  }
}

/** Прямое соединение или через ретранслятор — преподаватель видит это словом в настройках. */
async function pathKind(pc: RTCPeerConnection): Promise<ConnectionType> {
  try {
    const stats = await pc.getStats();
    for (const report of stats.values()) {
      if (report.type === 'candidate-pair' && report.state === 'succeeded') {
        const local = stats.get(report.localCandidateId);
        return local?.candidateType === 'relay' ? 'RELAY' : 'DIRECT';
      }
    }
  } catch {
    /* the measurement still stands; only the path kind is unknown */
  }
  return 'UNKNOWN';
}
