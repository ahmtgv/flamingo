import { useCallback } from 'react';

import { type UploadPurpose, useRequestUploadMutation } from '@/entities/graphql/generated';

/**
 * Presigned-upload helper. `upload(file, purpose)`:
 *  1. asks the API for a presigned PUT URL + object key (`requestUpload`),
 *  2. PUTs the bytes DIRECTLY to S3 (never through GraphQL) with the same Content-Type the
 *     server signed,
 *  3. resolves to the `fileKey` to hand to the consuming mutation (submitHomework, …).
 *
 * The Content-Type sent MUST match the one signed, or S3 rejects the PUT (403). Authorization
 * (role/size/type) is enforced server-side at requestUpload and at bind time.
 */
export function useUpload() {
  const [requestUpload] = useRequestUploadMutation();

  const upload = useCallback(
    async (file: File, purpose: UploadPurpose): Promise<string> => {
      // TEMPORARY: preview (VITE_PREVIEW=1) has no backend/S3 — resolve to a synthetic key
      // WITHOUT any network (no requestUpload, no PUT), so nothing leaves the device.
      if (import.meta.env.VITE_PREVIEW === '1') {
        return `preview/${purpose.toLowerCase()}/${file.name}`;
      }
      const contentType = file.type || 'application/octet-stream';
      const { data } = await requestUpload({
        variables: { input: { filename: file.name, contentType, purpose } },
      });
      const ticket = data?.requestUpload;
      if (!ticket) throw new Error('upload-request-failed');

      const res = await fetch(ticket.uploadUrl, {
        method: 'PUT',
        body: file,
        headers: { 'Content-Type': contentType },
      });
      if (!res.ok) throw new Error('upload-failed');
      return ticket.fileKey;
    },
    [requestUpload],
  );

  return { upload };
}
