# Admin Home Messages Design

## Objetivo

Permitir que el admin gestione mensajes publicados en la pantalla principal de todos los usuarios, incluyendo los avisos de pago e instalacion de la app, sin depender de textos fijos en el codigo.

## Alcance

- Nueva tabla `home_messages` en Supabase.
- Nueva seccion `/admin/mensajes`.
- CRUD de mensajes desde admin: crear, editar, publicar/despublicar, fijar/desfijar y eliminar.
- Mensajes publicados y fijados visibles en `/porra`.
- Mensajes especiales editables para pago e instalacion, creados por migracion con claves estables.
- Notificacion interna para todos cuando se crea o edita un mensaje publicado.

## Modelo

`home_messages` tendra:

- `id uuid`
- `slug text unique`
- `title text`
- `body text`
- `link_label text`
- `link_href text`
- `tone text` con valores `info`, `payment`, `warning`, `success`
- `is_published boolean`
- `is_pinned boolean`
- `created_by uuid`
- `updated_by uuid`
- `created_at timestamptz`
- `updated_at timestamptz`

Las claves iniciales seran `payment-info` e `install-info`. El admin puede editarlas como cualquier otro mensaje. La home seguira mostrando datos de transferencia calculados si no hay mensaje de pago publicado.

## Flujo

La pagina `/porra` cargara `home_messages` publicados y fijados, ordenados por fecha de actualizacion descendente. Si hay un mensaje publicado con slug `payment-info`, sustituye el aviso de pago fijo. Si hay un mensaje publicado con slug `install-info`, sustituye el aviso de instalacion fijo. Otros mensajes publicados se muestran como avisos adicionales.

La seccion `/admin/mensajes` cargara todos los mensajes y permitira editarlos inline. Al guardar un mensaje publicado, se crearan filas en `notifications` con tipo `admin_update`, titulo del mensaje, cuerpo resumido y enlace `/porra`.

## Seguridad

RLS permite lectura de mensajes publicados a usuarios autenticados. Solo admins pueden insertar, editar o eliminar mensajes. La politica de notificaciones se ampliara para permitir `admin_update`.

## Pruebas

Se anadiran tests unitarios para:

- Construir el texto de notificacion de mensajes.
- Clasificar mensajes especiales de pago e instalacion.
- Mantener fallbacks cuando faltan mensajes publicados.
