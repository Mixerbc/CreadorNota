# agent.md

## Proyecto
Aplicación web de notas (tipo bloc de notas) con interfaz moderna, responsive y persistencia local usando `localStorage`.

## Objetivo principal
Construir una app web simple y funcional que permita:
- Crear notas
- Editar notas
- Eliminar notas
- Duplicar notas
- Buscar notas
- Compartir notas (sin backend, usando hash/base64)
- Importar una nota compartida desde URL
- Exportar notas a JSON

## Stack (obligatorio)
- HTML
- CSS
- JavaScript vanilla (sin frameworks)
- `localStorage` como persistencia

## Restricciones importantes
- ❌ No usar backend
- ❌ No usar librerías/frameworks (React, Vue, jQuery, etc.)
- ❌ No romper funcionalidades existentes al hacer cambios
- ✅ Hacer cambios incrementales
- ✅ Mantener código legible y modular
- ✅ Mantener compatibilidad entre HTML/CSS/JS al renombrar IDs o clases

## Estilo visual (UI)
- Tema oscuro moderno
- Color principal: `#de313c`
- Diseño responsive:
  - Desktop: 2 columnas (formulario + listado)
  - Mobile: 1 columna
- UX limpia, clara y rápida
- Botones con estados visuales (hover/focus/active)
- Toasts para feedback (guardado, eliminado, copiado, error, etc.)

## Estructura sugerida de archivos
- `index.html`
- `styles.css`
- `app.js`

> Si inicialmente se construye en un solo archivo, luego separar en estos 3 archivos sin romper comportamiento.

---

## Modelo de datos (nota)
Cada nota debe seguir esta estructura:

```js
{
  id: string,
  title: string,
  content: string,
  tags: string[],
  author: string,
  isPublic: boolean,
  pinned: boolean,
  createdAt: string, // ISO
  updatedAt: string  // ISO
}