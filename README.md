# VideoBoard AI

La plataforma de planificación audiovisual más completa del mercado.  
De idea a proyecto completamente organizado, sin editar un solo fotograma.

## Stack

- **Frontend:** React 18 + TypeScript + TailwindCSS + React Flow + Zustand + Framer Motion
- **Backend:** Node.js + Express + TypeScript + Drizzle ORM
- **Base de datos:** PostgreSQL 15
- **Auth/Storage:** Supabase

## Inicio rápido

```bash
# Instalar dependencias
npm install

# Iniciar PostgreSQL (requiere Docker)
docker compose up -d

# Configurar variables de entorno
cp .env.example .env
# Editar .env con tus credenciales de Supabase

# Generar migraciones
npm run db:generate
npm run db:migrate

# Iniciar desarrollo
npm run dev
```

## Estructura

```
videoboard-ai/
├── packages/
│   ├── shared/      # Tipos y constantes compartidas
│   ├── backend/     # API REST (Express + Drizzle)
│   └── frontend/    # SPA (React + Vite + TailwindCSS)
```
