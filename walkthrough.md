# VideoBoard AI — Verificación de Funcionalidades

## Colaboración en Tiempo Real

### Arquitectura
WebSocket vía Socket.IO en `packages/backend/src/services/collaboration.ts`. Los clientes se conectan al mismo proyecto y sincronizan:

| Evento | Dirección | Propósito |
|--------|-----------|-----------|
| `join-room` | Cliente → Servidor | Registra usuario en sala del proyecto |
| `cursor-move` | Cliente → Servidor | Emite posición del cursor |
| `scene-update` / `scene-created` / `scene-deleted` | Cliente → Servidor | Emite cambios de escenas |
| `connection-created` / `connection-deleted` | Cliente → Servidor | Emite cambios de conexiones |
| `presence-update` | Servidor → Clientes | Lista de usuarios conectados |
| `cursor-update` | Servidor → Clientes | Cursores de otros usuarios |
| `scene-changed` / `scene-added` / `scene-removed` | Servidor → Clientes | Sincronización de escenas |
| `connection-added` / `connection-removed` | Servidor → Clientes | Sincronización de conexiones |

### Cómo Probar

```bash
# 1. Levantar backend
npx tsx packages/backend/src/index.ts

# 2. Ejecutar tests automatizados
npx tsx packages/backend/src/test_collaboration.ts

# 3. Probar manualmente
# Abrir 2 pestañas en http://localhost:5173, entrar al mismo proyecto
```

### Resultado de Tests
Se ejecutan 20 tests automatizados que verifican:
1. Creación de proyecto vía API
2. Conexión de 2 clientes Socket.IO
3. Unión a sala con presencia bidireccional
4. Movimiento de cursores
5. Sincronización de cambios en escenas
6. Creación de escena remota
7. Eliminación de escena remota
8. Creación y eliminación de conexiones entre escenas
9. Actualización de presencia al desconectar

---

## Gestión de Conexiones (Linkeos) entre Escenas

### Endpoints API
```
POST   /api/scenes/connections       → Crear conexión
GET    /api/scenes/connections       → Listar conexiones (filtro: ?project_id=)
DELETE /api/scenes/connections/:id   → Eliminar conexión
```

### Frontend — InfiniteCanvas

**Crear conexión:**
- Arrastrar de un handle (círculo en borde) de una escena a otra
- Prevención de duplicados: no se crean 2 conexiones iguales entre el mismo par
- Emite `emitConnectionCreated` para sincronizar vía WebSocket

**Borrar conexión:**
- Click en el edge (línea) → se selecciona
- Tecla `Delete` o `Backspace` → se elimina vía API + store + WebSocket

**Sincronización remota:**
Los receptores `__remoteConnectionAdd` y `__remoteConnectionRemove` (registrados en el `useEffect`) aplican cambios que otros usuarios realizan, con prevención de duplicados.

### Frontend — Hooks
```typescript
useCreateConnection()   // POST /api/scenes/connections
useDeleteConnection()   // DELETE /api/scenes/connections/:id
```

### Keyboard Shortcuts en Canvas
| Tecla | Acción |
|-------|--------|
| `Delete` / `Backspace` | Eliminar escenas y/o edges seleccionados |
| `Ctrl+D` | Duplicar escenas seleccionadas |
| `Ctrl+G` | Agrupar nodos |
| Espacio + arrastrar | Mover canvas (pan) |

---

## Verificación Rápida

```bash
# Backend
curl http://localhost:3001/api/health

# Frontend
curl http://localhost:5173/

# Tests de colaboración
npx tsx packages/backend/src/test_collaboration.ts
```
