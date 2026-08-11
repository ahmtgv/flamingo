"""Evidence trail for the jurisdiction gate (docs/rnd/RND_01_JURISDICTION.md §6.4).

Two append-only ledgers answer the two questions a regulator actually asks:

* *"Prove the feature was unavailable to that tenant on that date."* → ``PolicyDecisionLog``
* *"Prove nobody quietly switched it on and off again."*             → ``PolicyChangeLog``

**These rows carry no measurements.** No attention values, no per-pupil signals, nothing
derived from a camera — only which feature was refused, to which tenant, under which policy
version. §6.4 is blunt about why: an audit trail stuffed with the very data whose processing
is in question turns the proof of compliance into the proof of the violation.
"""

from django.db import models

from common.models import BaseModel


class AppendOnlyModel(BaseModel):
    """Rows may be created, never edited or deleted.

    Enforced in Python rather than by a database grant because the ORM is the only writer
    we control here; a deployment that also wants storage-level WORM should revoke
    UPDATE/DELETE on these tables for the application role.
    """

    class Meta:
        abstract = True

    def save(self, *args, **kwargs):
        if not self._state.adding:
            raise RuntimeError(f"{type(self).__name__} is append-only: rows cannot be modified")
        return super().save(*args, **kwargs)

    def delete(self, *args, **kwargs):
        raise RuntimeError(f"{type(self).__name__} is append-only: rows cannot be deleted")


class PolicyDecisionLog(AppendOnlyModel):
    """One refused request for a jurisdiction-restricted feature.

    Only refusals are recorded — they are the evidential events. Permitted calls are
    established by the matrix version plus the tenant's jurisdiction record, and logging
    each one would mean a row every few seconds per pupil.
    """

    tenant_kind = models.CharField(max_length=16)  # institution | user | deployment
    tenant_id = models.UUIDField(null=True, blank=True)
    feature = models.CharField(max_length=64)
    allowed = models.BooleanField(default=False)
    reason = models.CharField(max_length=64)
    jurisdiction = models.CharField(max_length=16)
    jurisdiction_source = models.CharField(max_length=16)
    policy_version = models.CharField(max_length=32)

    class Meta:
        indexes = [
            models.Index(fields=["tenant_id", "feature", "created_at"]),
            models.Index(fields=["created_at"]),
        ]

    def __str__(self) -> str:
        return f"{self.feature}:{self.reason}@{self.policy_version}"


class PolicyChangeLog(AppendOnlyModel):
    """A version of the policy matrix that this deployment actually ran.

    The matrix is reviewed in git, but git proves what was *written*, not what was
    *deployed*. A row is appended the first time a version+hash is observed at runtime, so
    a silent edit between review and deployment shows up as a hash with no matching commit.
    """

    policy_version = models.CharField(max_length=32)
    matrix_sha256 = models.CharField(max_length=64)
    observed_by = models.CharField(max_length=32, default="runtime")  # runtime | deploy
    note = models.CharField(max_length=255, blank=True, default="")

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["policy_version", "matrix_sha256"], name="uniq_policy_version_hash"
            )
        ]

    def __str__(self) -> str:
        return f"{self.policy_version}/{self.matrix_sha256[:12]}"
