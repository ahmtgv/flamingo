"""Ворота свежести выката — проверяются нарочной поломкой.

🔴 Зачем проверка у шелл-скрипта. Выкат солгал дважды подряд (владелец, 22.08): образ
собрался, а контейнер остался на старом (`Running` вместо `Recreated`), и отдельно —
`COPY . . CACHED`, то есть rsync не доехал. Оба раза команда не упала, и «выкачено»
означало ровно это.

Ворота, которые теперь это ловят, срабатывают от силы раз в месяц — и именно в тот день,
когда всё горит. Караул, который никто не ломает, однажды тихо перестаёт ловить, поэтому
разбор трёх отпечатков вынесен в чистую функцию и ломается здесь нарочно, каждым прогоном.

Проверяется РЕШЕНИЕ, а не связь с сервером: `ssh` сюда не ходит и ходить не должен.
"""

from __future__ import annotations

import os
import subprocess
from pathlib import Path

import pytest

DEPLOY = Path(__file__).resolve().parents[2] / "deploy.sh"

HEAD = "89c5cd4cc2b5a77e7e058eef74c6576b116e2680"
OLD = "367f4d6aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"


def _run(*args: str, env: dict | None = None) -> tuple[int, str]:
    done = subprocess.run(
        ["bash", str(DEPLOY), *args],
        capture_output=True,
        text=True,
        timeout=30,
        env={**os.environ, **(env or {})},
    )
    return done.returncode, done.stdout + done.stderr


def verdict(want: str, disk: str, in_container: str) -> tuple[int, str]:
    return _run("verdict", want, disk, in_container)


def domain(served: str, expected: str) -> tuple[int, str]:
    return _run("verdict-domain", served, expected)


def test_the_gate_exists_at_all():
    # Без этого остальные проверки зеленели бы на пустом месте: «скрипт не запустился»
    # неотличимо от «скрипт всем доволен», если смотреть только на текст.
    assert DEPLOY.is_file()
    code, out = verdict(HEAD, HEAD, HEAD)
    assert code == 0, out
    assert "ровно то, что отправлено" in out


def test_a_stale_container_is_caught_and_named():
    """Случай первый: код доехал, контейнер работает на старом образе."""
    code, out = verdict(HEAD, HEAD, OLD)
    assert code == 1
    assert "КОНТЕЙНЕР работает на старом образе" in out
    # Названо ЧТО делать: пересоздать принудительно.
    assert "--force-recreate" in out


def test_code_that_never_arrived_is_caught_and_named():
    """Случай второй: rsync не доехал, сборка честно печатала COPY . . CACHED."""
    code, out = verdict(HEAD, OLD, OLD)
    assert code == 1
    assert "rsync не доехал" in out


def test_silence_is_not_taken_for_agreement():
    """Пустой ответ — это «не смогли спросить», а не «всё сходится»."""
    code, out = verdict(HEAD, HEAD, "")
    assert code == 1
    assert "не назвал свой отпечаток" in out


def test_a_dirty_tree_redeployed_is_not_mistaken_for_the_same_one():
    # Незакоммиченное rsync увозит, поэтому отпечаток несёт и хвост правок: два выката
    # одного коммита с разными правками — разные отпечатки, и старый не сойдёт за новый.
    code, _ = verdict(f"{HEAD}+dirty-aaaaaaaa", HEAD, HEAD)
    assert code == 1


@pytest.mark.parametrize("bad_pair", [(HEAD, OLD, HEAD), (HEAD, "", "")])
def test_every_mismatch_refuses(bad_pair):
    # Ни одно расхождение не проходит молча — в том числе редкое «на диске старое,
    # а в контейнере новое» (собрали не из того дерева).
    assert verdict(*bad_pair)[0] == 1


# --- четвёртый исход: домен отвечает не тем контейнером ----------------------
#
# Три проверки выше смотрят на контейнер, который выкат сам же и выбрал. Кто отвечает ПО
# АДРЕСУ — они не спрашивают, и такой случай сегодня не увидел бы никто.
FP_A = "a" * 64
FP_B = "b" * 64


def test_a_matching_domain_passes():
    code, out = domain(FP_A, FP_A)
    assert code == 0, out
    assert "тем самым контейнером" in out


def test_a_domain_served_by_someone_else_is_caught_and_named():
    code, out = domain(FP_B, FP_A)
    assert code == 1
    assert "НЕ ТЕМ контейнером" in out
    # Названо, где смотреть: второй стек или чужой апстрим.
    assert "Caddyfile" in out


def test_a_silent_domain_is_not_taken_for_agreement():
    code, out = domain("", FP_A)
    assert code == 1
    assert "домен не назвал отпечаток" in out


def test_json_null_is_read_as_silence_not_as_a_value():
    # `/healthz` отдаёт `"build": null`, когда отпечатка в образе нет. Прочитать это как
    # строку «null» и сравнивать с ней — значит однажды принять её за совпадение.
    assert domain("null", FP_A)[0] == 1


def test_without_an_expected_value_the_check_refuses_instead_of_passing():
    # Не смогли вычислить ожидаемое — проверка не состоялась. Молчание не согласие.
    code, out = domain(FP_A, "")
    assert code == 1
    assert "сверять не с чем" in out


def test_the_deploy_and_the_product_compute_the_same_fingerprint():
    """🔴 Обе стороны считают ОДНО И ТО ЖЕ — иначе ворота сравнивают несравнимое.

    Разойдись расчёт выката и расчёт `common/health.py` (другой алгоритм, другая
    кодировка, лишний перевод строки) — и ворота ругались бы «домен отвечает не тем»
    на совершенно здоровом домене, каждым выкатом, пока им не перестали бы верить.
    """
    from django.test import override_settings

    from common import health

    key = "k" * 50
    code, out = _run("fingerprint", HEAD, env={"SECRET_KEY": key})
    assert code == 0, out
    from_deploy = out.strip()

    health.build_fingerprint.cache_clear()
    stamp_dir = Path(__file__).resolve().parent / "_fp_tmp"
    stamp_dir.mkdir(exist_ok=True)
    (stamp_dir / "BUILD_COMMIT").write_text(HEAD + "\n")
    try:
        with override_settings(BASE_DIR=stamp_dir, SECRET_KEY=key):
            from_product = health.build_fingerprint()
    finally:
        (stamp_dir / "BUILD_COMMIT").unlink()
        stamp_dir.rmdir()
        health.build_fingerprint.cache_clear()

    assert from_deploy == from_product
