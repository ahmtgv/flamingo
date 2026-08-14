"""How a pupil's file gets from the teacher's laptop to the meeting point (Р5.3).

This module exists to answer one question the prompt asked to answer **by fact**, before
throwing `boto3` out of the desktop bundle: *чем десктоп грузит файлы работ в точку встречи?*

The answer, and the reason it matters:

* the **server** signs. `requestUpload` already mints a presigned PUT (`apps/files`), and
  signing is the only step that needs an AWS SDK;
* the **sidecar** PUTs. A presigned URL is an ordinary HTTPS request with the credential in
  the query string — `urllib` does it in four lines;
* so the bytes go **straight into object storage**, never through Django or GraphQL
  (CLAUDE.md §5), and the desktop needs **no boto3 at all**.

That is the fact. `requirements-desktop.txt` drops botocore on the strength of it, and
`test_desktop_runtime.py` asserts that importing this module with the local storage backend
leaves `boto3` out of `sys.modules` — a comment claiming it would be worth nothing.

⚠️ If a later phase ever needs the sidecar to *sign* something itself — a direct multipart
upload of a large file, say — the fact changes and so does the dependency list. That is why
this is written down as a fact with a reason rather than as a line in a requirements file.
"""

from __future__ import annotations

import urllib.error
import urllib.request
from pathlib import Path

#: Big enough for a pupil's work over a home connection, small enough that a hung server does
#: not stall the lesson the teacher is running at the same time.
UPLOAD_TIMEOUT_SECONDS = 120


def put_file(presigned_url: str, path: str | Path, *, content_type: str = "") -> bool:
    """Send one file to a presigned URL. Returns False rather than raising.

    A failed copy must never cost a pupil the record it belongs to — the caller writes the
    work either way and leaves the attachment out (see `mirror._attachments`). Losing an essay
    because an upload timed out would be the exact failure this whole path exists to prevent.
    """
    source = Path(path)
    if not source.is_file():
        return False
    try:
        with source.open("rb") as handle:
            request = urllib.request.Request(
                presigned_url,
                data=handle.read(),
                method="PUT",
                headers={"Content-Type": content_type} if content_type else {},
            )
            with urllib.request.urlopen(request, timeout=UPLOAD_TIMEOUT_SECONDS) as response:
                return 200 <= response.status < 300
    except (urllib.error.URLError, OSError, ValueError):
        return False
