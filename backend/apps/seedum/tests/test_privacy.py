"""Privacy invariant (CLAUDE.md §2/§7, 152-FZ): the server never accepts raw media.

These tests fail loudly if anyone ever adds a video/audio/frame/landmark field or
widens AttentionInput beyond the aggregate. This is an architecture guarantee, not
a style check.
"""

import re

from api.schema import schema

SDL = schema.as_str()


def test_attention_input_is_aggregate_only():
    block = re.search(r"input AttentionInput \{([^}]*)\}", SDL, re.S).group(1)
    fields = set(re.findall(r"(\w+)\s*:", block))
    assert fields == {"sessionId", "bucketStart", "avgAttention"}, fields


def test_no_raw_media_anywhere_in_schema():
    haystack = SDL.lower()
    for forbidden in ["frame", "landmark", "biometric", "rawvideo", "rawaudio", "videodata"]:
        assert forbidden not in haystack, f"forbidden raw-media token in schema: {forbidden!r}"


def test_report_attention_is_the_only_attention_ingress():
    # Exactly one mutation accepts AttentionInput, and it returns Boolean.
    mutation_block = re.search(r"type Mutation \{(.*?)\n\}", SDL, re.S).group(1)
    ingress = [ln for ln in mutation_block.splitlines() if "AttentionInput" in ln]
    assert len(ingress) == 1
    assert "reportAttention" in ingress[0] and "Boolean" in ingress[0]
