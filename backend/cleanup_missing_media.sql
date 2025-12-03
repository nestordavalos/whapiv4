-- ============================================================
-- SQL para limpiar mensajes con archivos multimedia faltantes
-- ============================================================
-- Ejecuta esto en MySQL/phpMyAdmin para eliminar mensajes
-- con archivos que NO existen físicamente en backend/public/
-- ============================================================

-- PASO 1: Ver cuántos mensajes tienen archivos faltantes
-- (Ejecuta esto primero para ver qué se eliminará)

SELECT COUNT(*) as total_mensajes_con_archivos_faltantes
FROM Messages 
WHERE mediaUrl IS NOT NULL
AND mediaUrl IN (
    '1764444844215_logo_thumbnail_chat2one.png',
    '1764445044792_WhatsApp Image 2025-10-17 at 13.03.48.jpeg',
    '1764463610888_logo_thumbnail_chat2one.png',
    '1764463798860_logo_thumbnail_chat2one.png',
    '1764463899861_465855853_122212857122024669_4493564218937234082_n.jpg',
    '1764464262329_logo_thumbnail_chat2one.png',
    '1764464080726_ChatGPT Image 29 jul 2025, 11_00_13 p.m..png',
    '1764464590059.png',
    '1764464653542.png',
    '1764503760192.png',
    '1764503895340.png'
);

-- PASO 2: Ver los detalles de esos mensajes
-- (Para confirmar que son los correctos antes de eliminar)

SELECT id, ticketId, body, mediaUrl, mediaType, fromMe, createdAt
FROM Messages 
WHERE mediaUrl IS NOT NULL
AND mediaUrl IN (
    '1764444844215_logo_thumbnail_chat2one.png',
    '1764445044792_WhatsApp Image 2025-10-17 at 13.03.48.jpeg',
    '1764463610888_logo_thumbnail_chat2one.png',
    '1764463798860_logo_thumbnail_chat2one.png',
    '1764463899861_465855853_122212857122024669_4493564218937234082_n.jpg',
    '1764464262329_logo_thumbnail_chat2one.png',
    '1764464080726_ChatGPT Image 29 jul 2025, 11_00_13 p.m..png',
    '1764464590059.png',
    '1764464653542.png',
    '1764503760192.png',
    '1764503895340.png'
)
ORDER BY createdAt DESC;

-- PASO 3: ELIMINAR los mensajes con archivos faltantes
-- (⚠️ CUIDADO: Esta acción NO se puede deshacer)

-- Descomenta las siguientes líneas para ejecutar la eliminación:

/*
DELETE FROM Messages 
WHERE mediaUrl IS NOT NULL
AND mediaUrl IN (
    '1764444844215_logo_thumbnail_chat2one.png',
    '1764445044792_WhatsApp Image 2025-10-17 at 13.03.48.jpeg',
    '1764463610888_logo_thumbnail_chat2one.png',
    '1764463798860_logo_thumbnail_chat2one.png',
    '1764463899861_465855853_122212857122024669_4493564218937234082_n.jpg',
    '1764464262329_logo_thumbnail_chat2one.png',
    '1764464080726_ChatGPT Image 29 jul 2025, 11_00_13 p.m..png',
    '1764464590059.png',
    '1764464653542.png',
    '1764503760192.png',
    '1764503895340.png'
);

-- Verificar que se eliminaron correctamente
SELECT COUNT(*) as mensajes_restantes_con_problemas
FROM Messages 
WHERE mediaUrl IS NOT NULL
AND mediaUrl IN (
    '1764444844215_logo_thumbnail_chat2one.png',
    '1764445044792_WhatsApp Image 2025-10-17 at 13.03.48.jpeg',
    '1764463610888_logo_thumbnail_chat2one.png',
    '1764463798860_logo_thumbnail_chat2one.png',
    '1764463899861_465855853_122212857122024669_4493564218937234082_n.jpg',
    '1764464262329_logo_thumbnail_chat2one.png',
    '1764464080726_ChatGPT Image 29 jul 2025, 11_00_13 p.m..png',
    '1764464590059.png',
    '1764464653542.png',
    '1764503760192.png',
    '1764503895340.png'
);
*/
