import { ShieldCheck, Upload, XCircle } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import {
  type MeQuery,
  useSubmitVerificationDocumentMutation,
  useUploadPolicyQuery,
} from '@/entities/graphql/generated';
import { useUpload } from '@/shared/lib/useUpload';
import { acceptAttribute, formatBytes, kindKeys, refuse } from '@/shared/lib/uploadLimits';

import styles from './cabinet.module.css';

type TeacherProfile = NonNullable<NonNullable<MeQuery['me']>['teacherProfile']>;

/**
 * Верификация преподавателя — сторона преподавателя (находка владельца 15.08, п.4).
 *
 * 🔴 Что чинится. Баннер «Документы на проверке» висел у КАЖДОГО преподавателя, потому что
 * `verificationStatus` рождается со значением PENDING. Человек, не загрузивший ничего, читал,
 * что его документы проверяют, — и, естественно, ждал. Загрузить было негде: мутация в схеме
 * была, кнопки не было нигде.
 *
 * Четыре состояния вместо трёх, и первое — новое:
 * **не загружал** (скажи, что нужно, и дай кнопку) · **ждёт решения** · **отказ** (с причиной
 * словами) · **подтверждён** (молчим — лист 03 чист на счастливом пути).
 */
export function VerificationBanner({ profile }: { profile: TeacherProfile | null | undefined }) {
  const { t } = useTranslation('cabinet');
  const { upload } = useUpload();
  const [submit, { loading: submitting }] = useSubmitVerificationDocumentMutation();
  const [error, setError] = useState<string | null>(null);
  const { data: policyData } = useUploadPolicyQuery({ variables: { purpose: 'VERIFICATION' } });
  const policy = policyData?.uploadPolicy ?? null;

  const status = profile?.verificationStatus ?? 'PENDING';
  const documents = profile?.verificationDocuments ?? [];
  const latest = documents[0];

  // Подтверждён — не говорим ничего: счастливый путь листа 03 чист.
  if (status === 'APPROVED') return null;

  async function pick(file: File | null) {
    setError(null);
    if (!file) return;
    const refusal = refuse(file, policy);
    if (refusal) {
      const kinds = policy
        ? kindKeys(policy.contentTypes)
            .map((k) => t(`upload:kinds.${k}`, { ns: 'upload' }))
            .join(', ')
        : '';
      setError(
        refusal.reason === 'too-large'
          ? t('upload:tooLargeNamed', {
              ns: 'upload',
              name: file.name,
              size: formatBytes(refusal.size),
              max: formatBytes(refusal.max),
            })
          : t('upload:typeNotAllowedNamed', {
              ns: 'upload',
              name: file.name,
              type: refusal.type,
              kinds,
            }),
      );
      return;
    }
    try {
      const fileKey = await upload(file, 'VERIFICATION');
      await submit({ variables: { fileKey }, refetchQueries: ['Me'] });
    } catch {
      setError(t('teacher.verify.uploadError'));
    }
  }

  // 🔴 Тот самый случай: статус PENDING, а документов нет. Это «ещё не загружал», а не
  // «проверяем» — и разница в том, ждёт человек или должен что-то сделать.
  const nothingSubmitted = documents.length === 0;
  const rejected = status === 'REJECTED';

  return (
    <div
      className={`${styles.banner} ${rejected ? styles.bannerErr : styles.bannerWarn}`}
      role="status"
      style={{ marginTop: 'var(--space-4)' }}
    >
      {rejected ? <XCircle /> : <ShieldCheck />}
      <span>
        {rejected
          ? t('teacher.verify.rejected')
          : nothingSubmitted
            ? t('teacher.verify.none')
            : t('teacher.verify.pending')}
        {/* Отказ без причины — это молчание. Причина приходит с решением и печатается здесь. */}
        {rejected && latest?.reason && (
          <span className={styles.bannerWhy}>
            {t('teacher.verify.rejectedWhy', { reason: latest.reason })}
          </span>
        )}
        {!rejected && !nothingSubmitted && latest && (
          <span className={styles.bannerWhy}>
            {t('teacher.verify.submitted', { name: latest.filename })}
            {latest.reason ? ` · ${latest.reason}` : ''}
          </span>
        )}
        {policy && (nothingSubmitted || rejected) && (
          <span className={styles.bannerWhy}>
            {t('upload:limits', {
              ns: 'upload',
              size: formatBytes(policy.maxBytes),
              kinds: kindKeys(policy.contentTypes)
                .map((k) => t(`upload:kinds.${k}`, { ns: 'upload' }))
                .join(', '),
            })}
          </span>
        )}
        {error && <span className={styles.bannerWhy}>{error}</span>}
      </span>

      {(nothingSubmitted || rejected) && (
        <label className={styles.bannerAction}>
          <Upload size={14} />
          {submitting
            ? t('teacher.verify.pending')
            : rejected
              ? t('teacher.verify.again')
              : t('teacher.verify.noneCta')}
          <input
            type="file"
            className={styles.fileInput}
            accept={policy ? acceptAttribute(policy.contentTypes) : undefined}
            onChange={(e) => void pick(e.target.files?.[0] ?? null)}
          />
        </label>
      )}
    </div>
  );
}
