import { useCallback, useEffect, useRef } from 'react';

import { useExportCabinetMutation, useThisDeviceQuery } from '@/entities/graphql/generated';

import { copyBackupOut, rememberCopyOut } from './backupCopy';
import { isDesktop } from './bridge';

/**
 * Расписание копий исполняет само приложение (Р5.5-В п.3).
 *
 * 🔴 **Таймера здесь нет и не будет.** Celery отложен решением (CLAUDE.md §5), заводить
 * планировщик ради одного правила дороже, а два момента, когда копию надо снять, уже
 * существуют в жизни приложения:
 *
 * * **при старте** — если `backupDue`, то есть с прошлой копии прошли сутки (§19.1);
 * * **по окончании занятия** — потому что работа, которая только что пришла, это ровно то,
 *   чего ещё нигде нет; ежедневная копия, пропускающая вечернюю домашку, — копия вчерашнего.
 *
 * Копия сразу же уезжает с машины: снятая и оставшаяся в папке кабинета не переживает того же
 * случая, что и оригинал (Р5.5-Б).
 */
export function useScheduledBackup() {
  const thisDevice = useThisDeviceQuery({ skip: !isDesktop() });
  const [exportCabinet] = useExportCabinetMutation();
  const running = useRef(false);

  const runBackup = useCallback(async () => {
    // Одна копия за раз: «занятие закончилось» и «приложение открылось» могут совпасть.
    if (!isDesktop() || running.current) return;
    running.current = true;
    try {
      const { data: made } = await exportCabinet();
      const name = made?.exportCabinet?.fileName;
      if (name) {
        const moved = await copyBackupOut(name);
        // Отмечаем только удавшийся перенос — см. `backupCopy.rememberCopyOut`.
        if (moved.ok) rememberCopyOut(moved.at);
      }
      await thisDevice.refetch();
    } catch {
      // Копия — обязательство продукта, но не повод уронить экран, на котором её ждали.
      // Настройки покажут, что последней копии нет, и это честнее модального окна при старте.
    } finally {
      running.current = false;
    }
  }, [exportCabinet, thisDevice]);

  // При старте — если пора.
  /**
   * 🔴 Та же ошибка, что на экране настроек (§2.1): `myDevices[0]` — не «эта машина», а
   * первая в списке, отсортированном по `-last_seen_at`; пустые отметки PostgreSQL в DESC
   * ставит первыми. Копию кабинета будили по расписанию ЧУЖОЙ машины.
   */
  const due = thisDevice.data?.thisDevice?.setup?.backupDue ?? false;
  const startedRef = useRef(false);
  useEffect(() => {
    if (!due || startedRef.current) return;
    startedRef.current = true;
    void runBackup();
  }, [due, runBackup]);

  return runBackup;
}
