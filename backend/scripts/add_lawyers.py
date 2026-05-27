"""Добавить юристов из справочника «Юристы. ПП справочник.xlsx», которых ещё нет в БД.

Логика:
1. Загружаем 30 юристов из xlsx с привязкой к каноническому филиалу.
2. Из БД достаём текущих юристов; матчим по фамилии (первое слово + первая буква имени).
3. Кого не нашли — INSERT в users с ролью branch_lawyer (либо director для главы юр.деп.).
"""
from __future__ import annotations

import asyncio
import re
import sys
import unicodedata
from datetime import date

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

sys.path.insert(0, "/app")

from app.core.security import hash_password
from app.db.session import SessionLocal
from app.models import Branch, User


# (ФИО, branch_name, role)
LAWYERS_FROM_REGISTRY: list[tuple[str, str, str]] = [
    # ЦА Юридический департамент
    ("Абдуллин Руслан Сабитович",        "ЦА - Центральный аппарат",        "director"),
    ("Бекмагамбетова Динара Султановна", "ЦА - Центральный аппарат",        "branch_lawyer"),
    ("Ахатов Айдос Булатұлы",            "ЦА - Центральный аппарат",        "branch_lawyer"),
    ("Оралбеков Адильбек Нурланович",    "ЦА - Центральный аппарат",        "branch_lawyer"),
    ("Исаханова Луиза Фархатовна",       "ЦА - Центральный аппарат",        "branch_lawyer"),
    ("Сатканов Малик Серикович",         "ЦА - Центральный аппарат",        "branch_lawyer"),
    ("Хамзина Дина Маратовна",           "ЦА - Центральный аппарат",        "branch_lawyer"),
    ("Шахшамбаева Аяулым Нұржігітқызы",  "ЦА - Центральный аппарат",        "branch_lawyer"),
    ("Бекетова Малика Кайратовна",       "ЦА - Центральный аппарат",        "branch_lawyer"),
    # Сұңқар
    ("Нұрлан Меруерт",                   "Филиал «Сұңқар»",                  "branch_lawyer"),
    # Северный
    ("Аульбеков Айбек Мақсатұлы",        "РФ «Северный»",                    "branch_lawyer"),
    ("Алиева Алемгуль Сагдатовна",       "РФ «Северный»",                    "branch_lawyer"),
    # Экспресс
    ("Абдраимов Ернар Кайратович",       "Филиал «Экспресс»",                "branch_lawyer"),
    # Южный
    ("Кудайбергенов Хайдар Шаякенович",  "РФ «Южный»",                       "branch_lawyer"),
    ("Орманова Асель Болаткызы",         "РФ «Южный»",                       "branch_lawyer"),
    ("Әбсеметов Досбол Есенбайұлы",      "РФ «Южный»",                       "branch_lawyer"),
    # Пригородные перевозки
    ("Куанова Анара Асылбековна",        "Филиал «Пригородные перевозки»",   "branch_lawyer"),
    # Западный
    ("Амангельдинова Динара Амангелдықызы","РФ «Западный»",                  "branch_lawyer"),
    ("Малаев Іңкәрбек Бауыржанұлы",      "РФ «Западный»",                    "branch_lawyer"),
    # АО Вагонсервис (ЦА + Западный + Акмолинский + Алматинский — всё на одном филиале «АО «Вагонсервис»»)
    ("Аламан Асылбек Тұрсынұлы",         "АО «Вагонсервис»",                 "branch_lawyer"),
    ("Сейдалы Аделя Саятайқызы",         "АО «Вагонсервис»",                 "branch_lawyer"),
    ("Уразымбетова Гульзада Назибековна","АО «Вагонсервис»",                 "branch_lawyer"),
    ("Жумабекова Асель Кангереевна",     "АО «Вагонсервис»",                 "branch_lawyer"),
    ("Сырлыбаев Ержан Елтайұлы",         "АО «Вагонсервис»",                 "branch_lawyer"),
    ("Каракулов Бауыржан Куттыбаевич",   "АО «Вагонсервис»",                 "branch_lawyer"),
    ("Нағиева Жазира Түгелбайқызы",      "АО «Вагонсервис»",                 "branch_lawyer"),
    ("Салемгереева Анфиса Раисовна",     "АО «Вагонсервис»",                 "branch_lawyer"),
    ("Альмурзаева Айгерим Жолдасовна",   "АО «Вагонсервис»",                 "branch_lawyer"),
    ("Мусина Айгуль Ахметкадыровна",     "АО «Вагонсервис»",                 "branch_lawyer"),
    ("Патхоллина Еркегуль Жасаровна",    "АО «Вагонсервис»",                 "branch_lawyer"),
    # ── Юристы из ПИР-отчёта 2025, отсутствовавшие в справочнике ──
    ("Пономаренко Ирина Сергеевна",      "ЦА - Центральный аппарат",        "branch_lawyer"),
    ("Ибраева Камиля Серикқызы",          "ЦА - Центральный аппарат",        "branch_lawyer"),
    ("Кожина Виктория Александровна",     "ЦА - Центральный аппарат",        "branch_lawyer"),
    ("Сабырова Гульмира Серікқызы",       "ЦА - Центральный аппарат",        "branch_lawyer"),
    ("Гарифуллина Шакира Абдулловна",     "ЦА - Центральный аппарат",        "branch_lawyer"),
    ("Шешмуканов Ардак Амангелдинович",   "ЦА - Центральный аппарат",        "branch_lawyer"),
]


def _surname_initial(full_name: str) -> str:
    """Возвращает «фамилия + 1-2 буквы имени» в lowercase. Например, «Ахатов А.Б.» -> «ахатов аб»."""
    if not full_name:
        return ""
    s = str(full_name).strip()
    if "Ахатов А.А" in s:
        s = "Ахатов А.Б"
    s = s.lower()
    # Заменяем казахские буквы для унификации
    s = s.replace("і", "и").replace("ң", "н").replace("қ", "к").replace("ғ", "г").replace("ү", "у").replace("ұ", "у").replace("ә", "а").replace("ө", "о")
    s = re.sub(r"\.", " ", s)
    s = re.sub(r"\s+", " ", s).strip()
    parts = s.split()
    if not parts:
        return ""
    surname = parts[0]
    initials = "".join(p[0] for p in parts[1:3] if p)
    return f"{surname} {initials}".strip()


_RU_TO_LAT = {
    "а": "a", "б": "b", "в": "v", "г": "g", "д": "d", "е": "e", "ё": "yo", "ж": "zh",
    "з": "z", "и": "i", "й": "y", "к": "k", "л": "l", "м": "m", "н": "n", "о": "o",
    "п": "p", "р": "r", "с": "s", "т": "t", "у": "u", "ф": "f", "х": "kh", "ц": "ts",
    "ч": "ch", "ш": "sh", "щ": "sch", "ъ": "", "ы": "y", "ь": "", "э": "e", "ю": "yu",
    "я": "ya",
    # казахские
    "ә": "a", "ғ": "g", "қ": "k", "ң": "n", "ө": "o", "ұ": "u", "ү": "u", "һ": "h", "і": "i",
}


def _translit(text: str) -> str:
    text = text.lower()
    out = []
    for ch in text:
        if ch in _RU_TO_LAT:
            out.append(_RU_TO_LAT[ch])
        elif ch.isalnum() or ch in " -":
            out.append(ch)
    return "".join(out)


def _email_from_name(full_name: str, taken: set[str]) -> str:
    parts = full_name.strip().split()
    surname = _translit(parts[0]) if parts else "user"
    first = _translit(parts[1]) if len(parts) > 1 else ""
    base = f"{surname}.{first}".strip(".") if first else surname
    base = re.sub(r"[^a-z0-9.]", "", base)
    candidate = f"{base}@company.kz"
    i = 2
    while candidate in taken:
        candidate = f"{base}{i}@company.kz"
        i += 1
    taken.add(candidate)
    return candidate


async def main() -> None:
    async with SessionLocal() as db:  # type: AsyncSession
        # Загружаем branches и users
        branches = {b.name: b for b in (await db.execute(select(Branch))).scalars().all()}
        users = (await db.execute(select(User))).scalars().all()
        existing_keys = {_surname_initial(u.full_name) for u in users}
        taken_emails = {u.email.lower() for u in users}

        added = 0
        skipped = 0
        for full_name, branch_name, role in LAWYERS_FROM_REGISTRY:
            key = _surname_initial(full_name)
            if key in existing_keys:
                skipped += 1
                continue
            br = branches.get(branch_name)
            if br is None:
                print(f"!! Не нашёл филиал {branch_name!r} для {full_name!r}, пропускаю.")
                continue
            email = _email_from_name(full_name, taken_emails)
            new_user = User(
                email=email,
                password_hash=hash_password("legalhub123"),
                full_name=full_name,
                role=role,
                branch_id=br.id,
                is_active=True,
            )
            db.add(new_user)
            existing_keys.add(key)
            print(f"+ {full_name:40}  | {branch_name:35} | {email:35} | role={role}")
            added += 1

        await db.commit()

        print(f"\nДобавлено: {added}, уже было: {skipped}")
        print("Временный пароль для новых: legalhub123")


if __name__ == "__main__":
    asyncio.run(main())
