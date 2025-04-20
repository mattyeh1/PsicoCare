# PsiConnect: Plataforma de Gestión para Psicólogos

PsiConnect es una plataforma integral diseñada específicamente para profesionales de la psicología, enfocada en optimizar la gestión de pacientes, citas y comunicaciones a través de una interfaz moderna e intuitiva.

## 📱 Características Principales

### Experiencia del Psicólogo
- **Dashboard completo** con resumen de citas, pacientes y mensajes pendientes
- **Gestión de pacientes** con historial clínico, notas y seguimiento
- **Agenda inteligente** con calendario interactivo y gestión de disponibilidad
- **Generación asistida de mensajes** con plantillas personalizables
- **Formularios digitales** para consentimientos, evaluaciones y seguimiento
- **Reportes y estadísticas** para análisis de práctica profesional

### Experiencia del Paciente
- **Portal personalizado** con acceso a citas programadas
- **Mensajería segura** para comunicación directa con su psicólogo
- **Recordatorios automáticos** de citas y seguimientos
- **Visualización de historial** de sesiones y documentos compartidos
- **Formularios digitales** para completar antes de las sesiones

### Comunicación en Tiempo Real
- **Sistema de mensajería instantánea** mediante WebSockets
- **Notificaciones en tiempo real** de nuevos mensajes y actualizaciones
- **Diferenciación de tipos de mensajes** para mejor organización
- **Panel de chat intuitivo** con pestañas de mensajes enviados y recibidos

## 🛠️ Arquitectura Tecnológica

### Frontend
- **React 18** con TypeScript
- **TailwindCSS** para estilos responsivos
- **Shadcn UI** para componentes consistentes
- **TanStack Query** para gestión eficiente de estado y caché
- **WebSockets** para comunicación en tiempo real

### Backend
- **Express.js** con arquitectura RESTful
- **WebSocket Server** para mensajería instantánea
- **Sistema de autenticación** basado en sesiones con Passport.js
- **Validación de datos** con Zod y TypeScript

### Base de Datos
- **PostgreSQL** con modelo relacional optimizado
- **Drizzle ORM** para interacción tipo-segura con la base de datos
- **Caché integrada** para consultas frecuentes
- **Migraciones automatizadas** para evolución del esquema

## 🔧 Estructura del Proyecto

```
├── client/                # Aplicación React (Frontend)
│   ├── src/
│   │   ├── components/    # Componentes reutilizables
│   │   ├── hooks/         # Custom hooks (incluyendo WebSocket)
│   │   ├── lib/           # Utilidades y configuración
│   │   ├── pages/         # Páginas principales
│   │   └── providers/     # Contextos y proveedores
│
├── server/                # Aplicación Express (Backend)
│   ├── db.ts              # Configuración de base de datos
│   ├── routes.ts          # Rutas de API y WebSocket
│   ├── storage.ts         # Capa de acceso a datos
│   └── auth.ts            # Lógica de autenticación
│
├── shared/                # Código compartido
│   └── schema.ts          # Definiciones de tipos y esquemas
```

## 🗃️ Modelo de Datos

### Principales Entidades
- **Users**: Psicólogos y pacientes con datos de autenticación
- **Patients**: Información detallada de pacientes y relación con psicólogo
- **Appointments**: Citas programadas con estado y metadatos
- **Messages**: Sistema de comunicación bidireccional
- **Availability**: Slots de tiempo disponibles para citas
- **ConsentForms**: Documentación legal y administrativa

## 🚀 Características WebSocket

El sistema de mensajería en tiempo real implementa:

- **Autenticación de conexiones** para seguridad
- **Tipado de mensajes** para distinguir notificaciones, confirmaciones y mensajes
- **Broadast selectivo** a los usuarios específicos
- **Reconexión automática** ante pérdidas de conexión
- **Sincronización de estado** con el servidor
- **Notificaciones** para nuevos mensajes recibidos
- **Confirmaciones** para mensajes enviados

## 📊 Panel de Administración

El dashboard ofrece:

- Vista unificada de citas, pacientes y mensajes
- Estadísticas de práctica profesional
- Acceso rápido a las funciones principales
- Personalización de la experiencia
- Calendario integrado con visualización diaria/semanal/mensual

## 📱 Versión Responsive

La plataforma está optimizada para:
- Computadoras de escritorio
- Tablets
- Dispositivos móviles (Android e iOS)

## 🔒 Seguridad

- Autenticación segura con sesiones
- Encriptación de datos sensibles
- Validación de entrada en frontend y backend
- Protección contra ataques comunes (CSRF, XSS)
- Registro de actividad para auditoría

## 🔄 Ciclo de Desarrollo

El proyecto sigue un desarrollo iterativo con:
- CI/CD para despliegue continuo
- Pruebas automatizadas
- Feedback constante de usuarios
- Mejoras incrementales basadas en uso real

## 📞 Sistema de Mensajería

El sistema de mensajería incluye:
- Interfaz de usuario intuitiva con vista de conversaciones
- Diferenciación clara entre mensajes enviados y recibidos
- Notificaciones en tiempo real mediante WebSockets
- Confirmación de lectura de mensajes
- Plantillas predefinidas para comunicaciones frecuentes
- Historial completo de conversaciones