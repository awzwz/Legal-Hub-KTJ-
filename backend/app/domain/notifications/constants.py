"""Каталог типов уведомлений и общие константы."""

from __future__ import annotations

from uuid import UUID

# Источник правды по типам уведомлений: используется для проверки preferences
# и отдаётся фронту через `/preferences`.
NOTIFICATION_TYPES: dict[str, str] = {
    "hearing": "Заседания (за 3 дня, 1 день, сегодня)",
    "deadline_upcoming": "Процедурные дедлайны (за 7, 3, 1 день)",
    "deadline_overdue": "Просроченные процедурные действия",
    "case_assigned": "Назначения дел (когда дело назначают на вас)",
    "case_status_changed": "Смена исхода/статуса дела (для руководства)",
    "overdue": "Просрочка платежа",
    "status": "Дела высокого риска",
    "daily_digest": "Дневная сводка (для руководства)",
    "info": "Прочее",
}

PROCEDURAL_KIND_LABELS: dict[str, str] = {
    "response": "Отзыв на иск",
    "appeal": "Апелляция",
    "cassation": "Кассация",
    "petition": "Ходатайство",
    "complaint": "Жалоба",
    "other": "Иное действие",
}

# Минимальный интервал между авто-синхронизациями уведомлений для одного пользователя.
AUTO_SYNC_TTL_SECONDS = 300


def autosync_redis_key(user_id: UUID) -> str:
    return f"legalhub:notifications:autosync:v1:{user_id}"
