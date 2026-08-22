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

import subprocess
from pathlib import Path

import pytest

DEPLOY = Path(__file__).resolve().parents[2] / "deploy.sh"

HEAD = "89c5cd4cc2b5a77e7e058eef74c6576b116e2680"
OLD = "367f4d6aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"


def verdict(want: str, disk: str, in_container: str) -> tuple[int, str]:
    done = subprocess.run(
        ["bash", str(DEPLOY), "verdict", want, disk, in_container],
        capture_output=True,
        text=True,
        timeout=30,
    )
    return done.returncode, done.stdout + done.stderr


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
