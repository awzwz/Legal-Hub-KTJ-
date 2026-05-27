-- Чистка дубликатов и мусорных записей в users после слияния со справочником.
BEGIN;

-- 1) Малаев: переносим 3 дела с сокращённой записи на полную, удаляем сокращённую.
UPDATE cases SET assigned_lawyer_id = (SELECT id FROM users WHERE full_name = 'Малаев Іңкәрбек Бауыржанұлы')
WHERE assigned_lawyer_id = (SELECT id FROM users WHERE full_name = 'Малаев И.Б.');
DELETE FROM users WHERE full_name = 'Малаев И.Б.';

-- 2) Жумабекова А.К (без точки): переносим 5 дел на «А.К.», удаляем дубликат.
UPDATE cases SET assigned_lawyer_id = (SELECT id FROM users WHERE full_name = 'Жумабекова А.К.')
WHERE assigned_lawyer_id = (SELECT id FROM users WHERE full_name = 'Жумабекова А.К');
DELETE FROM users WHERE full_name = 'Жумабекова А.К';

-- 3) Переименовываем «Жумабекова А.К.» в полное «Жумабекова Асель Кангереевна»
UPDATE users SET full_name = 'Жумабекова Асель Кангереевна'
WHERE full_name = 'Жумабекова А.К.';

-- 4) Малаев — теперь у нас полное имя в БД (Малаев Іңкәрбек Бауыржанұлы). Делать ничего не надо.

-- 5) «Салемгереева А.Р., Умаров Т.К.» — склейка. Переносим 1 дело на «Салемгереева А.Р.» и удаляем склейку.
UPDATE cases SET assigned_lawyer_id = (SELECT id FROM users WHERE full_name = 'Салемгереева А.Р.')
WHERE assigned_lawyer_id = (SELECT id FROM users WHERE full_name = 'Салемгереева А.Р., Умаров Т.К.');
DELETE FROM users WHERE full_name = 'Салемгереева А.Р., Умаров Т.К.';

-- 6) Тестовая запись.
DELETE FROM users WHERE full_name = 'Тест Юрист';

COMMIT;
