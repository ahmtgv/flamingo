"""Shared abstract models. Every domain model builds on these."""

import uuid

from django.db import models
from django.utils import timezone

from common.enums import Jurisdiction, JurisdictionSource, choices


class UUIDModel(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    class Meta:
        abstract = True


class TimeStampedModel(models.Model):
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        abstract = True


class BaseModel(UUIDModel, TimeStampedModel):
    """uuid primary key + created/updated timestamps."""

    class Meta:
        abstract = True


class JurisdictionMixin(models.Model):
    """Jurisdiction attached to a TENANT (institution; for B2C, the user themself) —
    never to a session, request or IP (docs/rnd/RND_01_JURISDICTION.md §6.1: a pupil on a
    VPN does not move their school). An empty ``jurisdiction`` means *not declared*: the
    resolver then falls back to the deployment contour, and an undeclared contour resolves
    to UNKNOWN → strictest profile.

    ``jurisdiction_source`` decides whether this record may lower strictness (§6.2): only
    CONTRACT / KYC_VERIFIED may. A claim (SELF_DECLARED / INFERRED) can only make the
    profile stricter.
    """

    jurisdiction = models.CharField(
        max_length=16, choices=choices(Jurisdiction), blank=True, default=""
    )
    jurisdiction_source = models.CharField(
        max_length=16, choices=choices(JurisdictionSource), blank=True, default=""
    )
    jurisdiction_verified_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        abstract = True


class SoftDeleteQuerySet(models.QuerySet):
    def delete(self):
        return super().update(deleted_at=timezone.now())

    def hard_delete(self):
        return super().delete()


class SoftDeleteManager(models.Manager):
    """Default manager that hides soft-deleted rows."""

    def get_queryset(self) -> SoftDeleteQuerySet:
        return SoftDeleteQuerySet(self.model, using=self._db).filter(deleted_at__isnull=True)


class SoftDeleteModel(BaseModel):
    """User-facing content (course, lesson, homework) soft-deletes."""

    # A-H2: every read filters deleted_at IS NULL (SoftDeleteManager) — index it so the
    # soft-delete predicate never forces a seq scan on hot content tables.
    deleted_at = models.DateTimeField(null=True, blank=True, db_index=True)

    objects = SoftDeleteManager()
    all_objects = models.Manager()

    class Meta:
        abstract = True

    def delete(self, using=None, keep_parents=False):
        self.deleted_at = timezone.now()
        self.save(update_fields=["deleted_at"])

    def hard_delete(self, using=None, keep_parents=False):
        super().delete(using=using, keep_parents=keep_parents)
