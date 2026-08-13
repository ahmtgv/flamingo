"""How strict chat is, for this tenant, right now.

**There is not a single country name in this module, and there must never be one.** The
engineering requirement from §6.3 is that adding a country means editing ``matrix.json``, not
editing chat. So strictness is composed from exactly two sources:

* the jurisdiction gate — ``is_feature_allowed(subject, 'peer_chat')``, which fails closed;
* the institution's own settings — ``InstitutionChatSettings``, whose defaults are the base
  mode (§6.3): pupils may write to people in their own groups, every conversation carries
  «пожаловаться», and a group teacher can open a conversation once it has been reported.

Anything stricter — permanent teacher visibility, pre-moderation, stop-words, no direct
messages at all — is an option somebody turns on, never a constant somebody ships. A test
(`test_no_jurisdiction_branches_in_chat`) greps this whole app for country literals, because
a rule that can be re-implemented locally eventually will be.
"""

from __future__ import annotations

from dataclasses import dataclass, field

from common.compliance.policy import is_feature_allowed

PEER_CHAT_FEATURE = "peer_chat"


@dataclass(frozen=True)
class ChatPolicy:
    """The resolved rules for one viewer in one institution."""

    #: Pupil↔pupil conversations exist at all (jurisdiction gate).
    peer_chat: bool
    #: Direct conversations are offered (institution switch, on by default).
    direct_messages: bool
    #: A group teacher sees pupil conversations without a complaint (off by default).
    teacher_visible_always: bool
    #: Messages wait for approval before anyone else sees them (off by default).
    premoderation: bool
    #: Words that block a message outright (empty by default).
    stopwords: tuple[str, ...] = field(default_factory=tuple)
    #: Why peer chat is off, when it is — a machine-readable reason from the PDP.
    peer_chat_reason: str = ""

    @property
    def peer_direct_allowed(self) -> bool:
        """Whether one pupil may open a conversation with another."""
        return self.peer_chat and self.direct_messages


def _settings_for(institution):
    from .models import InstitutionChatSettings

    if institution is None:
        return None
    return InstitutionChatSettings.objects.filter(institution=institution).first()


def resolve_policy(user, institution=None) -> ChatPolicy:
    """Compose the rules for this viewer.

    The jurisdiction subject is the INSTITUTION when there is one — the school is the tenant
    the regime attaches to (RND_01 §6.1), not the child's device. A self-paced learner with
    no institution is judged on their own record, and an unknown regime fails closed inside
    the PDP, not here.
    """
    decision = is_feature_allowed(institution or user, PEER_CHAT_FEATURE)
    settings = _settings_for(institution)

    return ChatPolicy(
        peer_chat=decision.allowed,
        peer_chat_reason="" if decision.allowed else decision.reason,
        direct_messages=True if settings is None else settings.direct_messages_enabled,
        teacher_visible_always=False if settings is None else settings.teacher_visible_always,
        premoderation=False if settings is None else settings.premoderation,
        stopwords=tuple(settings.stopwords) if settings and settings.stopwords else (),
    )


def blocked_by_stopword(text: str, policy: ChatPolicy) -> str | None:
    """The stop-word that blocks this text, if the institution configured any.

    Case-insensitive substring matching: the option exists so an institution can enforce its
    own rules, and the list it supplies is the whole of the rule. We do not add words.
    """
    lowered = text.lower()
    for word in policy.stopwords:
        if word and word.lower() in lowered:
            return word
    return None
