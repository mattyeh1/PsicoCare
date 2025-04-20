# PsiConnect: Plataforma para Psicólogos

PsiConnect es una plataforma minimalista diseñada específicamente para psicólogos, enfocada en la gestión eficiente de pacientes, citas, comunicaciones y documentación.

## Características Principales

- **Gestión de Pacientes**: Registro y seguimiento de pacientes
- **Agenda de Citas**: Calendario interactivo con gestión de disponibilidad
- **Comunicaciones**: Sistema de plantillas de mensajes personalizables
- **Documentación**: Gestión de formularios de consentimiento
- **Interfaz Responsiva**: Diseño adaptable para todos los dispositivos

## Tecnologías Utilizadas

- **Frontend**: React + TypeScript, TailwindCSS, Shadcn UI
- **Backend**: Express.js, Node.js
- **Base de Datos**: PostgreSQL con Drizzle ORM
- **Autenticación**: Sistema de sesiones seguro

## Requisitos del Sistema

- Node.js 18+
- PostgreSQL

## Instalación

1. Clona el repositorio
2. Instala las dependencias:
```bash
npm install
```
3. Configura las variables de entorno
4. Inicializa la base de datos:
```bash
npm run db:push
```
5. Inicia el servidor de desarrollo:
```bash
npm run dev
```

## Estructura del Proyecto

```
├── client/          # Frontend React
├── server/          # Backend Express
├── shared/          # Código compartido
└── ...
```

## Estado Actual

### Implementado ✅
- Sistema de autenticación completo
- Gestión de perfiles de usuario
- Calendario de citas
- Sistema de mensajes
- Formularios de consentimiento
- Interfaz responsiva

### En Desarrollo 🚧
- Integración con IA para mensajes
- Sistema de notificaciones
- Reportes y estadísticas
- Sesiones remotas
- Mejoras de seguridad

## Licencia

Este proyecto está bajo la licencia MIT.

## Esquema de la Base de Datos

### Tablas

1. **users** (psicólogos):
   - id (serial, primary key)
   - username (texto, único)
   - password (texto)
   - email (texto, único)
   - full_name (texto)
   - specialty (texto)
   - bio (texto, opcional)
   - education (texto, opcional)
   - certifications (texto, opcional)
   - profile_image (texto, opcional)

2. **patients**:
   - id (serial, primary key)
   - psychologist_id (referencia a users.id)
   - name (texto)
   - email (texto)
   - phone (texto, opcional)
   - notes (texto, opcional)

3. **appointments**:
   - id (serial, primary key)
   - psychologist_id (referencia a users.id)
   - patient_id (referencia a patients.id)
   - date (timestamp)
   - duration (minutos)
   - status (enum: scheduled/completed/cancelled/missed)
   - notes (texto, opcional)

4. **availability**:
   - id (serial, primary key)
   - psychologist_id (referencia a users.id)
   - day_of_week (0-6 para domingo-sábado)
   - start_time (formato HH:MM)
   - end_time (formato HH:MM)

5. **message_templates**:
   - id (serial, primary key)
   - psychologist_id (referencia a users.id)
   - type (enum: appointment_reminder/follow_up/welcome/cancellation/rescheduling/custom)
   - title (texto)
   - content (texto)

6. **consent_forms**:
   - id (serial, primary key)
   - psychologist_id (referencia a users.id)
   - title (texto)
   - content (texto)

7. **patient_consents**:
   - id (serial, primary key)
   - patient_id (referencia a patients.id)
   - consent_form_id (referencia a consent_forms.id)
   - signed_at (timestamp)
   - signature (texto)

8. **contact_requests**:
   - id (serial, primary key)
   - name (texto)
   - email (texto)
   - specialty (texto)
   - message (texto, opcional)
   - created_at (timestamp con valor por defecto)

## Guía de Inicio Rápido

### Requisitos Previos

- Node.js 18+ instalado
- Una cuenta en Replit o entorno local configurado

### Instalación

1. Clona el repositorio:
   ```
   git clone <URL-del-repositorio>
   ```

2. Instala las dependencias:
   ```
   npm install
   ```

3. Crea una base de datos PostgreSQL y configura las variables de entorno.

4. Inicia la aplicación:
   ```
   npm run dev
   ```

### Estructura de Archivos

```
├── client/                # Frontend React
│   ├── src/
│   │   ├── components/    # Componentes reutilizables
│   │   ├── hooks/         # Custom hooks
│   │   ├── lib/           # Utilidades y configuración
│   │   ├── pages/         # Páginas de la aplicación
│   │   ├── providers/     # Contextos y proveedores
│   │   ├── App.tsx        # Componente principal
│   │   └── main.tsx       # Punto de entrada
├── server/                # Backend Express
│   ├── db.ts              # Configuración de la base de datos
│   ├── index.ts           # Punto de entrada del servidor
│   ├── routes.ts          # Definición de rutas API
│   ├── storage.ts         # Capa de acceso a datos
│   └── vite.ts            # Configuración de Vite
├── shared/                # Código compartido
│   └── schema.ts          # Esquemas de datos con Drizzle
├── drizzle.config.ts      # Configuración de Drizzle ORM
├── package.json           # Dependencias del proyecto
├── tailwind.config.ts     # Configuración de TailwindCSS
└── theme.json             # Tema personalizado
```

## Estado de la Interfaz

- **Inicio**: Página de presentación con secciones de funcionalidades, beneficios y contacto.
- **Registro**: Formulario funcional con validaciones para crear nuevas cuentas.
- **Login**: Sistema de autenticación funcional.
- **Dashboard**: Visualización de resumen de actividades (en desarrollo).
- **Perfil**: Gestión de información personal y profesional.
- **Citas**: Calendario y gestión de horarios disponibles.
- **Mensajes**: Plantillas y comunicación con pacientes.
- **Formularios**: Gestión de documentos de consentimiento.

## Próximos Pasos

1. Completar la integración con la base de datos PostgreSQL
2. Implementar las funciones de IA para la generación de mensajes personalizados
3. Desarrollar el sistema de encriptación para datos clínicos
4. Mejorar la experiencia de usuario en el calendario de citas
5. Agregar funcionalidades para la gestión de historias clínicas

## Tecnologías Utilizadas
- **Frontend**: React, TypeScript, TailwindCSS, TanStack Query
- **Backend**: Express, Node.js, Passport
- **Base de Datos**: PostgreSQL, Drizzle ORM
- **Estilo**: Shadcn UI, Lucide Icons
- **Autenticación**: Passport.js con sesiones