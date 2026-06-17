import { renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const h = vi.hoisted(() => ({ mutate: vi.fn() }));
vi.mock('@/entities/graphql/generated', () => ({
  useRequestUploadMutation: () => [h.mutate, {}],
}));

import { useUpload } from './useUpload';

describe('useUpload', () => {
  beforeEach(() => {
    h.mutate.mockReset();
    vi.unstubAllGlobals();
  });

  it('requests a presigned URL, PUTs bytes with the signed Content-Type, returns the key', async () => {
    h.mutate.mockResolvedValue({
      data: {
        requestUpload: {
          uploadUrl: 'https://s3.example/put?sig=abc',
          fileKey: 'submission/u1/abc/hw.pdf',
          expiresAt: '2026-01-01T00:00:00Z',
        },
      },
    });
    const fetchMock = vi.fn().mockResolvedValue({ ok: true });
    vi.stubGlobal('fetch', fetchMock);

    const { result } = renderHook(() => useUpload());
    const file = new File([new Blob(['hi'])], 'hw.pdf', { type: 'application/pdf' });
    const key = await result.current.upload(file, 'SUBMISSION');

    // 1) presigned-URL request carries filename + content-type + purpose
    expect(h.mutate).toHaveBeenCalledWith({
      variables: {
        input: { filename: 'hw.pdf', contentType: 'application/pdf', purpose: 'SUBMISSION' },
      },
    });
    // 2) bytes go DIRECTLY to S3 via PUT with the matching (signed) Content-Type
    expect(fetchMock).toHaveBeenCalledWith(
      'https://s3.example/put?sig=abc',
      expect.objectContaining({ method: 'PUT', headers: { 'Content-Type': 'application/pdf' } }),
    );
    // 3) resolves to the key for the consuming mutation
    expect(key).toBe('submission/u1/abc/hw.pdf');
  });

  it('throws when the direct S3 PUT fails', async () => {
    h.mutate.mockResolvedValue({
      data: { requestUpload: { uploadUrl: 'https://s3.example/put', fileKey: 'k', expiresAt: 'x' } },
    });
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false }));
    const { result } = renderHook(() => useUpload());
    const file = new File(['x'], 'a.pdf', { type: 'application/pdf' });
    await expect(result.current.upload(file, 'SUBMISSION')).rejects.toThrow('upload-failed');
  });
});
