"""Обратно-совместимый re-export. Логика перенесена в ``app.domain.notifications``.

Все существующие импорты вида ``from app.domain.notification_service import X``
продолжают работать. Для нового кода предпочтительнее
``from app.domain.notifications import X``.
"""

from app.domain.notifications import (  # noqa: F401
    NOTIFICATION_TYPES,
    clear_all_notifications,
    create_inline_notification,
    delete_notification,
    force_sync_notifications,
    get_user_preferences,
    list_notifications,
    mark_all_notifications_read,
    mark_notification_read,
    sync_notifications_for_user,
    update_user_preferences,
)
