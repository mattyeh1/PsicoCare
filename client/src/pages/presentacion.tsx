import React from 'react';
import PDFGenerator from '@/components/PDFGenerator';

const PresentacionPage = () => {
  return (
    <div className="container mx-auto py-8 px-4">
      <h1 className="text-3xl font-bold text-center mb-8 text-primary">Presentación de PsiConnect</h1>
      
      <PDFGenerator />
      
      <div id="pdf-content" className="max-w-4xl mx-auto bg-white p-8 rounded-lg shadow-lg">
        <div className="text-center mb-10">
          <h1 className="text-4xl font-bold text-primary mb-3">PsiConnect</h1>
          <p className="text-xl text-gray-600">Plataforma de Gestión para Psicólogos</p>
        </div>
        
        <div className="mb-10">
          <h2 className="text-2xl font-semibold text-primary mb-4 border-b pb-2">Transformando la Gestión de Consultas Psicológicas</h2>
          <p className="text-lg mb-4">
            <strong>PsiConnect</strong> es una plataforma integral diseñada específicamente para psicólogos y sus pacientes, que moderniza la gestión de consultas psicológicas a través de una solución tecnológica completa y segura.
          </p>
        </div>
        
        <div className="mb-10">
          <h2 className="text-2xl font-semibold text-primary mb-6 border-b pb-2">Funcionalidades Principales</h2>
          
          <h3 className="text-xl font-semibold text-primary-700 mb-4">Para Psicólogos</h3>
          
          <div className="grid md:grid-cols-2 gap-6 mb-8">
            <div className="bg-slate-50 p-6 rounded-lg shadow-sm border-l-4 border-primary">
              <h4 className="text-lg font-semibold text-primary-600 mb-3">Gestión de Pacientes</h4>
              <ul className="list-disc pl-5 space-y-2">
                <li><span className="font-medium">Vista completa de pacientes:</span> Panel visual con toda la información de los pacientes asignados</li>
                <li><span className="font-medium">Creación de cuentas para pacientes:</span> Capacidad de generar accesos para sus pacientes con código único de vinculación</li>
                <li><span className="font-medium">Expedientes digitales:</span> Almacenamiento seguro de historial, notas y documentación relevante</li>
                <li><span className="font-medium">Visualización de datos demográficos:</span> Acceso a información básica de cada paciente</li>
              </ul>
            </div>
            
            <div className="bg-slate-50 p-6 rounded-lg shadow-sm border-l-4 border-primary">
              <h4 className="text-lg font-semibold text-primary-600 mb-3">Administración de Citas</h4>
              <ul className="list-disc pl-5 space-y-2">
                <li><span className="font-medium">Calendario interactivo:</span> Vista integral de todas las citas programadas</li>
                <li><span className="font-medium">Gestión de disponibilidad:</span> Configuración de horarios disponibles para consultas</li>
                <li><span className="font-medium">Aprobación/rechazo de solicitudes:</span> Control total sobre las solicitudes de citas</li>
                <li><span className="font-medium">Historial de consultas:</span> Registro completo de todas las consultas realizadas</li>
              </ul>
            </div>
          </div>
          
          <div className="grid md:grid-cols-2 gap-6 mb-8">
            <div className="bg-slate-50 p-6 rounded-lg shadow-sm border-l-4 border-primary">
              <h4 className="text-lg font-semibold text-primary-600 mb-3">Comunicación Segura</h4>
              <ul className="list-disc pl-5 space-y-2">
                <li><span className="font-medium">Mensajería interna:</span> Sistema de comunicación directa con pacientes</li>
                <li><span className="font-medium">Plantillas de mensajes:</span> Creación y uso de plantillas para comunicaciones frecuentes</li>
                <li><span className="font-medium">Notificaciones:</span> Alertas sobre nuevas solicitudes o mensajes</li>
              </ul>
            </div>
            
            <div className="bg-slate-50 p-6 rounded-lg shadow-sm border-l-4 border-primary">
              <h4 className="text-lg font-semibold text-primary-600 mb-3">Documentación Legal</h4>
              <ul className="list-disc pl-5 space-y-2">
                <li><span className="font-medium">Formularios de consentimiento:</span> Creación y gestión de documentos legales</li>
                <li><span className="font-medium">Firma digital:</span> Capacidad para que los pacientes firmen documentos electrónicamente</li>
              </ul>
            </div>
          </div>
          
          <h3 className="text-xl font-semibold text-primary-700 mb-4">Para Pacientes</h3>
          
          <div className="grid md:grid-cols-2 gap-6 mb-8">
            <div className="bg-slate-50 p-6 rounded-lg shadow-sm border-l-4 border-primary">
              <h4 className="text-lg font-semibold text-primary-600 mb-3">Perfil Personal</h4>
              <ul className="list-disc pl-5 space-y-2">
                <li><span className="font-medium">Datos personales:</span> Gestión de información de contacto y perfil</li>
                <li><span className="font-medium">Visualización de psicólogo asignado:</span> Información sobre el profesional que los atiende</li>
              </ul>
            </div>
            
            <div className="bg-slate-50 p-6 rounded-lg shadow-sm border-l-4 border-primary">
              <h4 className="text-lg font-semibold text-primary-600 mb-3">Gestión de Citas</h4>
              <ul className="list-disc pl-5 space-y-2">
                <li><span className="font-medium">Solicitud de citas:</span> Interfaz para solicitar nuevas consultas</li>
                <li><span className="font-medium">Calendario de sesiones:</span> Visualización de próximas citas</li>
                <li><span className="font-medium">Subida de comprobantes de pago:</span> Capacidad para adjuntar recibos de pagos realizados</li>
              </ul>
            </div>
          </div>
          
          <div className="bg-slate-50 p-6 rounded-lg shadow-sm border-l-4 border-primary mb-8">
            <h4 className="text-lg font-semibold text-primary-600 mb-3">Comunicación</h4>
            <ul className="list-disc pl-5 space-y-2">
              <li><span className="font-medium">Mensajes directos:</span> Canal de comunicación directa con su psicólogo</li>
              <li><span className="font-medium">Historial de conversaciones:</span> Acceso al registro de comunicaciones previas</li>
            </ul>
          </div>
        </div>
        
        <div className="mb-10">
          <h2 className="text-2xl font-semibold text-primary mb-6 border-b pb-2">Características Técnicas</h2>
          
          <div className="grid md:grid-cols-2 gap-6 mb-8">
            <div className="bg-slate-50 p-6 rounded-lg shadow-sm border-l-4 border-primary">
              <h4 className="text-lg font-semibold text-primary-600 mb-3">Seguridad y Privacidad</h4>
              <ul className="list-disc pl-5 space-y-2">
                <li><span className="font-medium">Autenticación robusta:</span> Sistema seguro de inicio de sesión</li>
                <li><span className="font-medium">Separación de interfaces:</span> Entornos diferenciados para psicólogos y pacientes</li>
                <li><span className="font-medium">Protección de datos:</span> Cumplimiento con normativas de privacidad</li>
                <li><span className="font-medium">Control de acceso:</span> Roles claramente definidos con permisos específicos</li>
              </ul>
            </div>
            
            <div className="bg-slate-50 p-6 rounded-lg shadow-sm border-l-4 border-primary">
              <h4 className="text-lg font-semibold text-primary-600 mb-3">Diseño y Experiencia de Usuario</h4>
              <ul className="list-disc pl-5 space-y-2">
                <li><span className="font-medium">Interfaz moderna:</span> Diseño intuitivo y agradable visualmente</li>
                <li><span className="font-medium">Diseño responsivo:</span> Adaptación a diferentes dispositivos (móvil, tablet, escritorio)</li>
                <li><span className="font-medium">Experiencia optimizada:</span> Flujos de trabajo pensados para maximizar la eficiencia</li>
              </ul>
            </div>
          </div>
          
          <div className="bg-slate-50 p-6 rounded-lg shadow-sm border-l-4 border-primary">
            <h4 className="text-lg font-semibold text-primary-600 mb-3">Infraestructura</h4>
            <ul className="list-disc pl-5 space-y-2">
              <li><span className="font-medium">Plataforma web:</span> Acceso desde cualquier navegador sin necesidad de instalación</li>
              <li><span className="font-medium">Base de datos segura:</span> Almacenamiento cifrado de información sensible</li>
              <li><span className="font-medium">Arquitectura escalable:</span> Diseñado para crecer según las necesidades</li>
            </ul>
          </div>
        </div>
        
        <div className="mb-10 bg-primary/10 p-6 rounded-lg">
          <h2 className="text-2xl font-semibold text-primary mb-4">Beneficios para Profesionales</h2>
          <ol className="list-decimal pl-5 space-y-3">
            <li><span className="font-medium">Ahorro de tiempo:</span> Reducción drástica en tareas administrativas</li>
            <li><span className="font-medium">Mejora en la organización:</span> Todo centralizado en una única plataforma</li>
            <li><span className="font-medium">Profesionalización del servicio:</span> Imagen más moderna y eficiente</li>
            <li><span className="font-medium">Reducción de errores:</span> Eliminación de problemas derivados de la gestión manual</li>
            <li><span className="font-medium">Mejor experiencia para el paciente:</span> Mayor satisfacción y retención de clientes</li>
          </ol>
        </div>
        
        <div className="bg-primary text-white p-6 rounded-lg">
          <h2 className="text-2xl font-semibold mb-4 border-b border-white/20 pb-2">Contacto</h2>
          <p className="mb-4">Para más información o solicitar una demostración personalizada:</p>
          <div className="space-y-2">
            <p><strong>Email:</strong> info@psiconnect.com</p>
            <p><strong>Teléfono:</strong> +XX XXX-XXX-XXX</p>
            <p><strong>Web:</strong> www.psiconnect.com</p>
          </div>
        </div>
        
        <div className="text-center mt-10 text-gray-500 italic">
          <p>PsiConnect - Conectando profesionales con sus pacientes de manera eficiente</p>
        </div>
      </div>
    </div>
  );
};

export default PresentacionPage;