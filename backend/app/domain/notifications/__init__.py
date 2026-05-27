"""Доменно-разбитый сервис уведомлений. Импорт через эти имена остаётся стабильным."""

from .constants import NOTIFICATION_TYPES
from .inbox import (
    clear_all_notifications,
    delete_notification,
    list_notifications,
    mark_all_notifications_read,
    mark_notification_read,
)
from .preferences import get_user_preferences, update_user_preferences
from .triggers import (
    create_inline_notification,
    force_sync_notifications,
    sync_notifications_for_user,
)

__all__ = [
    "NOTIFICATION_TYPES",
    "clear_all_notifications",
    "create_inline_notification",
    "delete_notification",
    "force_sync_notifications",
    "get_user_preferences",
    "list_notifications",
    "mark_all_notifications_read",
    "mark_notification_read",
    "sync_notifications_for_user",
    "update_user_preferences",
]
