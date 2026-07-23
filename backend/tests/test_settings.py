"""Prod-security fail-fast guard (A-settings-insecure-defaults)."""

import pytest
from django.core.exceptions import ImproperlyConfigured

from config.settings import _check_prod_security

STRONG = "x" * 40


def test_debug_mode_allows_dev_defaults():
    # In DEBUG, permissive dev defaults are fine (no raise).
    _check_prod_security(True, "dev-insecure-change-me", ["*"])


def test_prod_rejects_placeholder_or_weak_secret_key():
    with pytest.raises(ImproperlyConfigured):
        _check_prod_security(False, "dev-insecure-change-me", ["example.com"])
    with pytest.raises(ImproperlyConfigured):
        _check_prod_security(False, "short-key", ["example.com"])


def test_prod_rejects_wildcard_allowed_hosts():
    with pytest.raises(ImproperlyConfigured):
        _check_prod_security(False, STRONG, ["*"])


def test_prod_accepts_strong_key_and_explicit_hosts():
    _check_prod_security(False, STRONG, ["flamingo.example.ru"])
