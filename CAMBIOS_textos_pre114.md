# pre114 — Campos protegidos del panel

Fecha: 26/11/2026. Base: bdb423dba7527738b03a4f9f967e87400e92aec2.

Nombre comercial: 60 caracteres Unicode, sin emojis y con saltos convertidos en
espacios. Domicilios: hasta diez, 150 por línea. Contadores y rechazo de pegado
excesivo sin cortar texto. Los valores anteriores sin cambios pueden conservarse.
Validación de envío con las mismas reglas puras de functions/textoCampos.js,
exportadas como texto-campos.mjs. Backend vuelve a validar en administrarComercios.
No cambian diseño de solapas, selección de localidad/rubro ni acciones de negocio.

Sintaxis JS/módulo OK y cinco comprobaciones de reglas exportadas OK.
Pruebas de alta/perfil del backend incluidas en las 51 pruebas de pre114.
La comprobación visual/interactiva del panel en navegador queda pendiente.
Actualizar administrarComercios junto con el resto de funciones de pre114.
