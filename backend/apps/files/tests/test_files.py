"""Files module — presigned uploads. Covers the security-critical surface: per-purpose role
gate, owner-namespaced keys (no cross-user binding), content-type/size limits, presign shape.
Presigning is offline (no server); the real head() path is exercised via moto."""

from datetime import date

import boto3
import pytest
from django.conf import settings
from django.utils import timezone
from moto import mock_aws

from apps.accounts import services as accounts
from apps.files import services as files
from common import storage
from common.enums import Role, UploadPurpose
from common.exceptions import PermissionDenied, ValidationError

pytestmark = pytest.mark.django_db


def _student(email="s@e.com"):
    return accounts.register_user(
        email=email,
        password="strongpass1!",
        first_name="С",
        last_name="Т",
        role=Role.STUDENT,
        birth_date=date(2008, 1, 1),
        consent_152fz=True,
    )


def _teacher(email="t@e.com"):
    return accounts.register_user(
        email=email,
        password="strongpass1!",
        first_name="Т",
        last_name="П",
        role=Role.TEACHER,
        specialty="Математика",
    )


def _admin(email="a@e.com"):
    return accounts.register_user(
        email=email,
        password="strongpass1!",
        first_name="А",
        last_name="А",
        role=Role.ADMIN,
    )


def _req(user, purpose, *, filename="hw.pdf", content_type="application/pdf"):
    return files.request_upload(user, filename=filename, content_type=content_type, purpose=purpose)


def test_request_upload_role_gate_per_purpose():
    student, teacher, admin = _student(), _teacher(), _admin()
    # SUBMISSION: student yes, teacher no.
    _req(student, UploadPurpose.SUBMISSION)
    with pytest.raises(PermissionDenied):
        _req(teacher, UploadPurpose.SUBMISSION)
    # MATERIAL: teacher yes, student no.
    _req(teacher, UploadPurpose.MATERIAL)
    with pytest.raises(PermissionDenied):
        _req(student, UploadPurpose.MATERIAL)
    # INSTITUTION_LOGO: admin yes, teacher no.
    _req(admin, UploadPurpose.INSTITUTION_LOGO, filename="logo.png", content_type="image/png")
    with pytest.raises(PermissionDenied):
        _req(teacher, UploadPurpose.INSTITUTION_LOGO, filename="logo.png", content_type="image/png")
    # AVATAR: any authenticated user (student) is fine.
    _req(student, UploadPurpose.AVATAR, filename="me.png", content_type="image/png")


def test_request_upload_content_type_gate():
    student = _student()
    with pytest.raises(ValidationError):  # exe is not an allowed submission type
        _req(
            student,
            UploadPurpose.SUBMISSION,
            filename="x.exe",
            content_type="application/x-msdownload",
        )
    with pytest.raises(ValidationError):  # avatar must be an image
        _req(student, UploadPurpose.AVATAR, filename="x.pdf", content_type="application/pdf")


def test_key_is_owner_namespaced_and_unique():
    student = _student()
    _, k1, _ = _req(student, UploadPurpose.SUBMISSION, filename="A B.pdf")
    _, k2, _ = _req(student, UploadPurpose.SUBMISSION, filename="A B.pdf")
    assert k1.startswith(f"submission/{student.id}/")  # caller id baked into the prefix
    assert k1.endswith("/A_B.pdf")  # get_valid_filename sanitized the space
    assert k1 != k2  # the uuid segment makes every key unique


def test_presign_put_url_shape_and_ttl():
    student = _student()
    url, key, expires_at = _req(student, UploadPurpose.SUBMISSION)
    assert settings.S3["bucket"] in url and key.rsplit("/", 1)[-1] in url
    assert "X-Amz-Signature" in url and "X-Amz-Expires=600" in url  # signed, 10-min PUT TTL
    delta = (expires_at - timezone.now()).total_seconds()
    assert 590 <= delta <= 600


def test_assert_caller_key_blocks_cross_user_binding():
    a, b = _student("a@e.com"), _student("b@e.com")
    _, key_a, _ = _req(a, UploadPurpose.SUBMISSION)
    files.assert_caller_key(a, key_a, UploadPurpose.SUBMISSION)  # owner: ok
    with pytest.raises(PermissionDenied):
        files.assert_caller_key(b, key_a, UploadPurpose.SUBMISSION)  # someone else's key: denied


@mock_aws
def test_validate_uploaded_real_head_via_moto(monkeypatch):
    # Use the default AWS endpoint so moto intercepts cleanly.
    monkeypatch.setitem(settings.S3, "endpoint", "")
    bucket = settings.S3["bucket"]
    s3 = boto3.client("s3", region_name="us-east-1")
    s3.create_bucket(Bucket=bucket)
    student = _student()
    _, key, _ = _req(student, UploadPurpose.SUBMISSION)

    with pytest.raises(ValidationError):  # nothing uploaded yet → not found
        files.validate_uploaded(key, UploadPurpose.SUBMISSION)

    s3.put_object(Bucket=bucket, Key=key, Body=b"hello", ContentType="application/pdf")
    assert storage.head(key) == {"size": 5, "content_type": "application/pdf"}
    files.validate_uploaded(key, UploadPurpose.SUBMISSION)  # within limits → no raise


def test_validate_uploaded_rejects_oversized_and_wrong_type(monkeypatch):
    # Avoid writing a 25MB body — drive validate_uploaded off a stubbed head().
    monkeypatch.setattr(
        storage, "head", lambda key: {"size": 999 * 1024 * 1024, "content_type": "application/pdf"}
    )
    with pytest.raises(ValidationError):
        files.validate_uploaded("submission/x/y/big.pdf", UploadPurpose.SUBMISSION)
    monkeypatch.setattr(
        storage, "head", lambda key: {"size": 10, "content_type": "application/x-msdownload"}
    )
    with pytest.raises(ValidationError):
        files.validate_uploaded("submission/x/y/x.exe", UploadPurpose.SUBMISSION)
