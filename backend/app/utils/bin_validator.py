"""Валидация казахстанского БИН/ИИН (12 цифр + контрольная сумма)."""
from __future__ import annotations

_W1 = (1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11)
_W2 = (3, 4, 5, 6, 7, 8, 9, 10, 11, 1, 2)


def is_valid_bin_checksum(bin_str: str | None) -> bool:
    """True если БИН/ИИН валиден по официальному алгоритму контрольной суммы РК.

    Алгоритм (приказ ГосДоходов): первые 11 цифр умножаются на веса w1; остаток
    от деления суммы на 11 даёт контрольную цифру. Если остаток равен 10 — повторяем
    с весами w2; если и тогда 10 — БИН/ИИН недействителен.
    """
    if not bin_str:
        return False
    s = "".join(c for c in str(bin_str) if c.isdigit())
    if len(s) != 12:
        return False
    digits = [int(c) for c in s]
    check = digits[11]
    s1 = sum(digits[i] * _W1[i] for i in range(11)) % 11
    if s1 != 10:
        return s1 == check
    s2 = sum(digits[i] * _W2[i] for i in range(11)) % 11
    if s2 == 10:
        return False
    return s2 == check


def validate_bin_format(bin_str: str | None) -> tuple[bool, str | None]:
    """Возвращает (is_valid, error_message)."""
    if not bin_str:
        return False, "БИН/ИИН обязателен"
    s = "".join(c for c in str(bin_str) if c.isdigit())
    if len(s) != 12:
        return False, "БИН/ИИН должен содержать ровно 12 цифр"
    if not is_valid_bin_checksum(s):
        return False, "Неверная контрольная сумма БИН/ИИН"
    return True, None
