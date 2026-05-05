import uuid

from sqlalchemy import func, select
from sqlalchemy.dialects.postgresql import insert as pg_insert
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import hash_password
from app.models import Branch, Case, User

from app.services import demo_seed


async def run_seed_if_empty(session: AsyncSession) -> None:
    """Стартовый сид филиалов/пользователей и демо-дел.

    В проде с одной БД `svc-iam` и `svc-legal` стартуют параллельно и оба
    вызывают этот код — обычный add_all() даёт гонку на INSERT branches.
    Поэтому используем INSERT ... ON CONFLICT DO NOTHING по первичному ключу.
    """
    r = await session.execute(select(func.count()).select_from(User))
    if (r.scalar_one() or 0) == 0:
        b_hq = uuid.UUID("11111111-1111-1111-1111-111111111101")
        b_north = uuid.UUID("11111111-1111-1111-1111-111111111102")
        b_south = uuid.UUID("11111111-1111-1111-1111-111111111103")
        b_central_branch = uuid.UUID("11111111-1111-1111-1111-111111111104")
        b_west = uuid.UUID("11111111-1111-1111-1111-111111111105")
        b_express = uuid.UUID("11111111-1111-1111-1111-111111111106")

        await session.execute(
            pg_insert(Branch)
            .values(
                [
                    {"id": b_hq, "name": "Центральный аппарат", "city": "Астана"},
                    {"id": b_north, "name": "Северный", "city": "Астана"},
                    {"id": b_south, "name": "Южный", "city": "Алматы"},
                    {"id": b_central_branch, "name": "Центральный", "city": "Караганда"},
                    {"id": b_west, "name": "Западный", "city": "Актобе"},
                    {"id": b_express, "name": "Экспресс", "city": "Павлодар"},
                ]
            )
            .on_conflict_do_nothing(index_elements=[Branch.id])
        )

        pwd = hash_password("legalhub123")
        u_dir = uuid.UUID("22222222-2222-2222-2222-222222222201")
        u_north = uuid.UUID("22222222-2222-2222-2222-222222222202")
        u_south = uuid.UUID("22222222-2222-2222-2222-222222222203")
        u_ctr = uuid.UUID("22222222-2222-2222-2222-222222222204")
        u_acc = uuid.UUID("22222222-2222-2222-2222-222222222205")
        u_chief = uuid.UUID("22222222-2222-2222-2222-222222222206")
        u_bek = uuid.UUID("22222222-2222-2222-2222-222222222207")
        u_sag = uuid.UUID("22222222-2222-2222-2222-222222222208")

        await session.execute(
            pg_insert(User)
            .values(
                [
                    {
                        "id": u_dir,
                        "email": "director@company.kz",
                        "password_hash": pwd,
                        "full_name": "Директор",
                        "role": "director",
                        "branch_id": None,
                        "is_active": True,
                    },
                    {
                        "id": u_chief,
                        "email": "chief@company.kz",
                        "password_hash": pwd,
                        "full_name": "Главный юрист",
                        "role": "chief_lawyer",
                        "branch_id": None,
                        "is_active": True,
                    },
                    {
                        "id": u_north,
                        "email": "kasymov@company.kz",
                        "password_hash": pwd,
                        "full_name": "Касымов А.Б.",
                        "role": "branch_lawyer",
                        "branch_id": b_north,
                        "is_active": True,
                    },
                    {
                        "id": u_south,
                        "email": "nurlanova@company.kz",
                        "password_hash": pwd,
                        "full_name": "Нурланова Г.С.",
                        "role": "branch_lawyer",
                        "branch_id": b_south,
                        "is_active": True,
                    },
                    {
                        "id": u_ctr,
                        "email": "akhmetov@company.kz",
                        "password_hash": pwd,
                        "full_name": "Ахметов Д.К.",
                        "role": "branch_lawyer",
                        "branch_id": b_central_branch,
                        "is_active": True,
                    },
                    {
                        "id": u_bek,
                        "email": "bekmuratov@company.kz",
                        "password_hash": pwd,
                        "full_name": "Бекмуратов Е.Н.",
                        "role": "branch_lawyer",
                        "branch_id": b_west,
                        "is_active": True,
                    },
                    {
                        "id": u_sag,
                        "email": "sagitov@company.kz",
                        "password_hash": pwd,
                        "full_name": "Сагитов Р.М.",
                        "role": "branch_lawyer",
                        "branch_id": b_express,
                        "is_active": True,
                    },
                    {
                        "id": u_acc,
                        "email": "accountant@company.kz",
                        "password_hash": pwd,
                        "full_name": "Бухгалтер Иванова",
                        "role": "accountant",
                        "branch_id": None,
                        "is_active": True,
                    },
                ]
            )
            .on_conflict_do_nothing(index_elements=[User.id])
        )
        await session.commit()

    r2 = await session.execute(select(func.count()).select_from(Case))
    if (r2.scalar_one() or 0) == 0:
        await demo_seed.seed_demo_if_no_cases(session)
        await session.commit()
