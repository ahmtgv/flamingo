import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import {
  type MeQuery,
  useSubmitVerificationDocumentMutation,
  useUploadPolicyQuery,
} from '@/entities/graphql/generated';
import { useUpload } from '@/shared/lib/useUpload';
import { acceptAttribute, formatBytes, kindKeys, refuse } from '@/shared/lib/uploadLimits';

import styles from './account.module.css';

type TeacherProfile = NonNullable<NonNullable<MeQuery['me']>['teacherProfile']>;

/**
 * Проверка диплома — СТРОКОЙ В УЧЁТНОЙ ЗАПИСИ (наряд 50 §1, решение владельца §56).
 *
 * 🔴 Что чинится. Это была жёлтая плашка во всю ширину кабинета и стартовой — и читалась
 * как условие работы: «пока не проверим, вести нельзя». Владелец решал это уже дважды:
 * **проверка ничего не запрещает**. Она добавляет отметку в профиле, и только.
 *
 * Поэтому здесь: строка состояния там, где человек и ищет свои данные, без жёлтого фона и
 * без кнопки во всю ширину. Загрузить документ можно — но это предложение, а не требование.
 */
export function VerificationLine({ profile }: { profile: TeacherProfile | null | undefined }) {
  const { t } = useTranslation(['account', 'upload']);
  const { upload } = useUpload();
  const [submit, { loading }] = useSubmitVerificationDocumentMutation();
  const [failed, setFailed] = useState<string | null>(null);
  const { data: policyData } = useUploadPolicyQuery({ variables: { purpose: 'VERIFICATION' } });
  const policy = policyData?.uploadPolicy ?? null;

  if (!profile) return null;
  const status = profile.verificationStatus ?? 'PENDING';
  const documents = profile.verificationDocuments ?? [];
  const sent = documents.length > 0;
  const latest = documents[0];

  async function pick(file: File | null | undefined) {
    if (!file || !policy) return;
    setFailed(null);
    // Отказ произносится теми же словами, что и везде: один набор на продукт (`upload:*`).
    const no = refuse(file, policy);
    if (no) {
      setFailed(
        no.reason === 'too-large'
          ? t('upload:tooLargeNamed', {
              ns: 'upload',
              name: file.name,
              size: formatBytes(no.size),
              max: formatBytes(no.max),
            })
          : t('upload:typeNotAllowedNamed', {
              ns: 'upload',
              name: file.name,
              type: no.type,
              kinds: policy?.contentTypes ? kindKeys(policy.contentTypes).map((k) => t(`upload:kinds.${k}`, { ns: 'upload' })).join(', ') : '',
            }),
      );
      return;
    }
    try {
      const key = await upload(file, 'VERIFICATION');
      await submit({ variables: { fileKey: key } });
    } catch {
      setFailed(t('verification.failed'));
    }
  }

  /** Состояние словами: что уже произошло, а не что человеку теперь нельзя. */
  const state =
    status === 'APPROVED'
      ? t('verification.verified')
      : status === 'REJECTED'
        ? t('verification.rejected')
        : sent
          ? t('verification.waiting')
          : t('verification.none');

  return (
    <section className={styles.card}>
      <h2 className={styles.cardTitle}>{t('verification.title')}</h2>
      <p className={styles.line}>{state}</p>
      {/* Что именно отправлено и что ответили — иначе строка состояния сообщает половину:
          человек не знает, какой файл лежит и за что отказали. */}
      {sent && status !== 'APPROVED' && latest?.filename && (
        <p className={styles.note}>{latest.filename}</p>
      )}
      {status === 'REJECTED' && latest?.reason && (
        <p className={styles.note}>{latest.reason}</p>
      )}
      <p className={styles.note}>{t('verification.nothingBlocked')}</p>
      {status !== 'APPROVED' && (
        <label className={styles.fileRow}>
          <input
            type="file"
            className="fl-visually-hidden"
            accept={policy ? acceptAttribute(policy.contentTypes) : undefined}
            onChange={(e) => void pick(e.target.files?.[0])}
          />
          <span className={styles.fileBtn}>
            {loading ? t('verification.sending') : t('verification.attach')}
          </span>
        </label>
      )}
      {failed && (
        <p className={styles.failed} role="alert">
          {failed}
        </p>
      )}
    </section>
  );
}
