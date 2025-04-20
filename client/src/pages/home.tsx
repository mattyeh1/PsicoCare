import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Calendar, MessageSquare, Wallet, User, FileText, FileLock, Check } from "lucide-react";
import { StarRating } from "@/components/ui/star-rating";
import ContactForm from "@/components/forms/ContactForm";

const Home = () => {
  const scrollToSection = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <div>
      {/* Hero Section */}
      <section className="pt-10 pb-12 sm:pt-16 lg:pt-20 gradient-bg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="lg:grid lg:grid-cols-12 lg:gap-8">
            <div className="sm:text-center md:max-w-2xl md:mx-auto lg:col-span-6 lg:text-left">
              <h1 className="mt-4 text-4xl tracking-tight font-extrabold text-neutral-800 sm:mt-5 sm:text-5xl lg:mt-6">
                <span className="block">Simplifica tu práctica</span>
                <span className="block text-primary-500">profesional</span>
              </h1>
              <p className="mt-3 text-base text-neutral-800 sm:mt-5 sm:text-xl lg:text-lg xl:text-xl">
                Una plataforma minimalista y elegante diseñada específicamente para psicólogos que buscan optimizar la organización de turnos, mejorar la comunicación y reducir costos administrativos.
              </p>
              <div className="mt-8 sm:mt-10">
                <div className="sm:flex justify-start sm:justify-center lg:justify-start">
                  <div className="rounded-md shadow">
                    <Button 
                      onClick={() => scrollToSection("contact")}
                      size="lg" 
                      className="w-full sm:w-auto"
                    >
                      Solicitar acceso
                    </Button>
                  </div>
                  <div className="mt-3 sm:mt-0 sm:ml-3">
                    <Button 
                      onClick={() => scrollToSection("features")}
                      variant="outline" 
                      size="lg" 
                      className="w-full sm:w-auto"
                    >
                      Conocer más
                    </Button>
                  </div>
                </div>
              </div>
            </div>
            <div className="mt-12 relative sm:max-w-lg sm:mx-auto lg:mt-0 lg:max-w-none lg:mx-0 lg:col-span-6 lg:flex lg:items-center">
              <div className="relative mx-auto w-full rounded-lg shadow-lg lg:max-w-md">
                <div className="relative block w-full bg-white rounded-lg overflow-hidden">
                  <img className="w-full" src="https://images.unsplash.com/photo-1573497019707-1c04de26e58c?ixlib=rb-1.2.1&auto=format&fit=crop&w=1000&q=80" alt="Profesional usando la plataforma" />
                  <div className="absolute inset-0 w-full h-full flex items-center justify-center">
                    <div className="h-20 w-20 text-primary-500 flex items-center justify-center">
                      <div className="bg-white p-3 rounded-full opacity-90">
                        <svg className="h-14 w-14" fill="currentColor" viewBox="0 0 84 84">
                          <path d="M55 42L35 55V29L55 42Z"></path>
                        </svg>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-12 bg-white sm:py-16 lg:py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="lg:text-center">
            <p className="mt-2 text-3xl leading-8 font-extrabold tracking-tight text-neutral-800 sm:text-4xl font-serif">
              Una solución integral para profesionales
            </p>
            <p className="mt-4 max-w-2xl text-xl text-neutral-800 lg:mx-auto">
              Diseñada específicamente para responder a las necesidades reales de los psicólogos.
            </p>
          </div>

          <div className="mt-10">
            <div className="space-y-10 md:space-y-0 md:grid md:grid-cols-2 md:gap-x-8 md:gap-y-10">
              <div className="relative">
                <div>
                  <div className="absolute flex items-center justify-center h-12 w-12 rounded-md bg-primary-500 text-white">
                    <Calendar className="h-6 w-6" />
                  </div>
                  <p className="ml-16 text-lg leading-6 font-medium text-neutral-800">Organización de turnos</p>
                </div>
                <div className="mt-2 ml-16 text-base text-neutral-800">
                  Agenda online intuitiva con disponibilidad visible y reservas automáticas que facilita la gestión de tu tiempo.
                </div>
              </div>

              <div className="relative">
                <div>
                  <div className="absolute flex items-center justify-center h-12 w-12 rounded-md bg-primary-500 text-white">
                    <MessageSquare className="h-6 w-6" />
                  </div>
                  <p className="ml-16 text-lg leading-6 font-medium text-neutral-800">Comunicación empática</p>
                </div>
                <div className="mt-2 ml-16 text-base text-neutral-800">
                  Modelos de mensajes personalizados con IA para mantener la cercanía y empatía con tus pacientes.
                </div>
              </div>

              <div className="relative">
                <div>
                  <div className="absolute flex items-center justify-center h-12 w-12 rounded-md bg-primary-500 text-white">
                    <Wallet className="h-6 w-6" />
                  </div>
                  <p className="ml-16 text-lg leading-6 font-medium text-neutral-800">Reducción de costos</p>
                </div>
                <div className="mt-2 ml-16 text-base text-neutral-800">
                  Reemplazamos la figura del secretario tradicional con herramientas digitales simples y efectivas.
                </div>
              </div>

              <div className="relative">
                <div>
                  <div className="absolute flex items-center justify-center h-12 w-12 rounded-md bg-primary-500 text-white">
                    <User className="h-6 w-6" />
                  </div>
                  <p className="ml-16 text-lg leading-6 font-medium text-neutral-800">Valoración profesional</p>
                </div>
                <div className="mt-2 ml-16 text-base text-neutral-800">
                  Diseño claro, elegante y profesional que comunica tu valor como especialista.
                </div>
              </div>

              <div className="relative">
                <div>
                  <div className="absolute flex items-center justify-center h-12 w-12 rounded-md bg-primary-500 text-white">
                    <FileText className="h-6 w-6" />
                  </div>
                  <p className="ml-16 text-lg leading-6 font-medium text-neutral-800">Consentimientos digitales</p>
                </div>
                <div className="mt-2 ml-16 text-base text-neutral-800">
                  Integración de consentimiento informado digital que agiliza el proceso de documentación.
                </div>
              </div>

              <div className="relative">
                <div>
                  <div className="absolute flex items-center justify-center h-12 w-12 rounded-md bg-primary-500 text-white">
                    <FileLock className="h-6 w-6" />
                  </div>
                  <p className="ml-16 text-lg leading-6 font-medium text-neutral-800">Historia clínica segura</p>
                </div>
                <div className="mt-2 ml-16 text-base text-neutral-800">
                  Almacenamiento cifrado con acceso solo autorizado y controlado para mantener la confidencialidad.
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Demo Section */}
      <section id="benefits" className="py-12 bg-neutral-50 sm:py-16 lg:py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="lg:grid lg:grid-cols-12 lg:gap-8">
            <div className="lg:col-span-5">
              <h2 className="text-3xl font-extrabold text-neutral-800 tracking-tight sm:text-4xl font-serif">
                Simplifica tu agenda profesional
              </h2>
              <p className="mt-3 text-lg text-neutral-800">
                Nuestro sistema de agendamiento permite a tus pacientes reservar citas según tu disponibilidad real, evitando confusiones y optimizando tu tiempo.
              </p>
              
              <div className="mt-10 space-y-4">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <div className="flex items-center justify-center h-12 w-12 rounded-md bg-primary-500 text-white">
                      <Check className="h-6 w-6" />
                    </div>
                  </div>
                  <div className="ml-4">
                    <h3 className="text-lg leading-6 font-medium text-neutral-800">Disponibilidad en tiempo real</h3>
                    <p className="mt-2 text-base text-neutral-800">Los pacientes solo ven los horarios realmente disponibles, evitando superposiciones.</p>
                  </div>
                </div>

                <div className="flex">
                  <div className="flex-shrink-0">
                    <div className="flex items-center justify-center h-12 w-12 rounded-md bg-primary-500 text-white">
                      <Check className="h-6 w-6" />
                    </div>
                  </div>
                  <div className="ml-4">
                    <h3 className="text-lg leading-6 font-medium text-neutral-800">Recordatorios automáticos</h3>
                    <p className="mt-2 text-base text-neutral-800">Envío de notificaciones previas a la cita para reducir inasistencias.</p>
                  </div>
                </div>

                <div className="flex">
                  <div className="flex-shrink-0">
                    <div className="flex items-center justify-center h-12 w-12 rounded-md bg-primary-500 text-white">
                      <Check className="h-6 w-6" />
                    </div>
                  </div>
                  <div className="ml-4">
                    <h3 className="text-lg leading-6 font-medium text-neutral-800">Cancelaciones simplificadas</h3>
                    <p className="mt-2 text-base text-neutral-800">Proceso intuitivo para cancelar o reprogramar citas con notificaciones inmediatas.</p>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="mt-12 lg:mt-0 lg:col-span-7">
              <div className="bg-white rounded-lg shadow-lg overflow-hidden">
                <div className="px-4 py-5 sm:p-6">
                  <h3 className="text-lg font-medium text-neutral-800 mb-4">Calendario de mayo 2024</h3>
                  {/* Calendar header */}
                  <div className="grid grid-cols-7 gap-1 text-center text-xs leading-6 text-neutral-800 font-semibold">
                    <div>Lun</div>
                    <div>Mar</div>
                    <div>Mié</div>
                    <div>Jue</div>
                    <div>Vie</div>
                    <div>Sáb</div>
                    <div>Dom</div>
                  </div>
                  
                  {/* Calendar grid */}
                  <div className="grid grid-cols-7 gap-1 mt-2 text-sm">
                    {/* Week 1 */}
                    <div className="calendar-day calendar-day-disabled py-2 text-center text-neutral-400">29</div>
                    <div className="calendar-day calendar-day-disabled py-2 text-center text-neutral-400">30</div>
                    <div className="calendar-day py-2 text-center rounded hover:cursor-pointer">1</div>
                    <div className="calendar-day py-2 text-center rounded hover:cursor-pointer">2</div>
                    <div className="calendar-day py-2 text-center rounded hover:cursor-pointer">3</div>
                    <div className="calendar-day py-2 text-center rounded hover:cursor-pointer">4</div>
                    <div className="calendar-day py-2 text-center bg-neutral-100 text-neutral-400">5</div>
                    
                    {/* Week 2 */}
                    <div className="calendar-day py-2 text-center rounded hover:cursor-pointer">6</div>
                    <div className="calendar-day py-2 text-center rounded hover:cursor-pointer">7</div>
                    <div className="calendar-day py-2 text-center rounded hover:cursor-pointer">8</div>
                    <div className="calendar-day py-2 text-center rounded hover:cursor-pointer">9</div>
                    <div className="calendar-day py-2 text-center rounded hover:cursor-pointer">10</div>
                    <div className="calendar-day py-2 text-center rounded hover:cursor-pointer">11</div>
                    <div className="calendar-day py-2 text-center bg-neutral-100 text-neutral-400">12</div>
                    
                    {/* Week 3 */}
                    <div className="calendar-day py-2 text-center rounded hover:cursor-pointer">13</div>
                    <div className="calendar-day py-2 text-center bg-primary-100 border border-primary-500 text-primary-700 rounded">14</div>
                    <div className="calendar-day py-2 text-center rounded hover:cursor-pointer">15</div>
                    <div className="calendar-day py-2 text-center rounded hover:cursor-pointer">16</div>
                    <div className="calendar-day py-2 text-center rounded hover:cursor-pointer">17</div>
                    <div className="calendar-day py-2 text-center rounded hover:cursor-pointer">18</div>
                    <div className="calendar-day py-2 text-center bg-neutral-100 text-neutral-400">19</div>

                    {/* Week 4 */}
                    <div className="calendar-day py-2 text-center rounded hover:cursor-pointer">20</div>
                    <div className="calendar-day py-2 text-center rounded hover:cursor-pointer">21</div>
                    <div className="calendar-day py-2 text-center rounded hover:cursor-pointer">22</div>
                    <div className="calendar-day py-2 text-center rounded hover:cursor-pointer">23</div>
                    <div className="calendar-day py-2 text-center rounded hover:cursor-pointer">24</div>
                    <div className="calendar-day py-2 text-center rounded hover:cursor-pointer">25</div>
                    <div className="calendar-day py-2 text-center bg-neutral-100 text-neutral-400">26</div>

                    {/* Week 5 */}
                    <div className="calendar-day py-2 text-center rounded hover:cursor-pointer">27</div>
                    <div className="calendar-day py-2 text-center rounded hover:cursor-pointer">28</div>
                    <div className="calendar-day py-2 text-center rounded hover:cursor-pointer">29</div>
                    <div className="calendar-day py-2 text-center rounded hover:cursor-pointer">30</div>
                    <div className="calendar-day py-2 text-center rounded hover:cursor-pointer">31</div>
                    <div className="calendar-day calendar-day-disabled py-2 text-center text-neutral-400">1</div>
                    <div className="calendar-day calendar-day-disabled py-2 text-center text-neutral-400">2</div>
                  </div>
                  
                  {/* Time slots for selected date */}
                  <div className="mt-6">
                    <h4 className="text-sm font-medium text-neutral-800 mb-3">Horarios disponibles para el 14 de mayo:</h4>
                    <div className="grid grid-cols-4 gap-2 sm:grid-cols-6">
                      <div className="time-slot py-2 px-2 text-center bg-white border rounded text-sm hover:cursor-pointer">09:00</div>
                      <div className="time-slot py-2 px-2 text-center bg-white border rounded text-sm hover:cursor-pointer">10:00</div>
                      <div className="time-slot time-slot-disabled py-2 px-2 text-center bg-neutral-50 border rounded text-sm text-neutral-400">11:00</div>
                      <div className="time-slot py-2 px-2 text-center bg-white border rounded text-sm hover:cursor-pointer">12:00</div>
                      <div className="time-slot py-2 px-2 text-center bg-white border rounded text-sm hover:cursor-pointer">14:00</div>
                      <div className="time-slot py-2 px-2 text-center bg-white border rounded text-sm hover:cursor-pointer">15:00</div>
                      <div className="time-slot time-slot-disabled py-2 px-2 text-center bg-neutral-50 border rounded text-sm text-neutral-400">16:00</div>
                      <div className="time-slot py-2 px-2 text-center bg-white border rounded text-sm hover:cursor-pointer">17:00</div>
                      <div className="time-slot py-2 px-2 text-center bg-white border rounded text-sm hover:cursor-pointer">18:00</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Profile Section */}
      <section className="py-12 bg-white sm:py-16 lg:py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h2 className="text-3xl font-extrabold text-neutral-800 sm:text-4xl font-serif">
              Perfil profesional elegante
            </h2>
            <p className="mt-3 max-w-2xl mx-auto text-xl text-neutral-800 sm:mt-4">
              Muestra tu formación y experiencia con un diseño minimalista y profesional.
            </p>
          </div>

          <div className="mt-12 max-w-lg mx-auto lg:mt-16 lg:max-w-none">
            <div className="bg-white rounded-lg shadow-lg overflow-hidden lg:grid lg:grid-cols-2 lg:gap-4">
              <div className="pt-10 pb-12 px-6 sm:pt-16 sm:px-16 lg:py-16 lg:pr-0 xl:py-20 xl:px-20">
                <div className="lg:self-center">
                  <h3 className="text-2xl font-extrabold text-neutral-800 sm:text-3xl font-serif">
                    <span className="block">Dra. Ana Martínez</span>
                    <span className="block text-primary-500">Psicóloga Clínica</span>
                  </h3>
                  <p className="mt-4 text-lg leading-6 text-neutral-800">
                    Especializada en terapia cognitivo-conductual con más de 10 años de experiencia en tratamiento de trastornos de ansiedad y depresión.
                  </p>
                  <ul className="mt-6 space-y-3">
                    <li className="flex items-start">
                      <div className="flex-shrink-0">
                        <Check className="h-5 w-5 text-primary-500" />
                      </div>
                      <p className="ml-3 text-base text-neutral-800">Doctorado en Psicología Clínica - Universidad de Buenos Aires</p>
                    </li>
                    <li className="flex items-start">
                      <div className="flex-shrink-0">
                        <Check className="h-5 w-5 text-primary-500" />
                      </div>
                      <p className="ml-3 text-base text-neutral-800">Maestría en Neuropsicología - Universidad Complutense de Madrid</p>
                    </li>
                    <li className="flex items-start">
                      <div className="flex-shrink-0">
                        <Check className="h-5 w-5 text-primary-500" />
                      </div>
                      <p className="ml-3 text-base text-neutral-800">Certificación en Terapia EMDR</p>
                    </li>
                  </ul>
                  <div className="mt-8 flex flex-wrap gap-4">
                    <div className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-primary-100 text-primary-800">
                      Terapia de adultos
                    </div>
                    <div className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-primary-100 text-primary-800">
                      Trastornos de ansiedad
                    </div>
                    <div className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-primary-100 text-primary-800">
                      Depresión
                    </div>
                    <div className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-primary-100 text-primary-800">
                      Atención online
                    </div>
                  </div>
                </div>
              </div>
              <div className="relative -mt-6 lg:mt-0">
                <img className="relative inset-0 h-full w-full object-cover" src="https://images.unsplash.com/photo-1544717305-2782549b5136?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80" alt="Psychologist in their office" />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section className="py-12 bg-neutral-50 sm:py-16 lg:py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl mx-auto text-center">
            <h2 className="text-3xl font-extrabold text-neutral-800 sm:text-4xl font-serif">
              Lo que dicen los profesionales
            </h2>
            <p className="mt-3 text-xl text-neutral-800 sm:mt-4">
              Psicólogos que ya utilizan nuestra plataforma comparten su experiencia.
            </p>
          </div>
          <div className="mt-12 max-w-lg mx-auto grid gap-5 lg:grid-cols-3 lg:max-w-none">
            <div className="flex flex-col rounded-lg shadow-lg overflow-hidden">
              <div className="flex-1 bg-white p-6 flex flex-col justify-between">
                <div className="flex-1">
                  <div className="flex items-center">
                    <StarRating rating={5} />
                  </div>
                  <p className="mt-3 text-base text-neutral-800">
                    "La plataforma ha revolucionado mi práctica. Ahora dedico menos tiempo a tareas administrativas y más a lo que realmente importa: mis pacientes."
                  </p>
                </div>
                <div className="mt-6 flex items-center">
                  <div className="flex-shrink-0">
                    <img className="h-10 w-10 rounded-full" src="https://images.unsplash.com/photo-1494790108377-be9c29b29330?ixlib=rb-1.2.1&ixid=eyJhcHBfaWQiOjEyMDd9&auto=format&fit=facearea&facepad=2&w=256&h=256&q=80" alt="User testimonial avatar" />
                  </div>
                  <div className="ml-3">
                    <p className="text-sm font-medium text-neutral-800">Dr. Carlos Vega</p>
                    <p className="text-sm text-neutral-600">Psicólogo Clínico</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex flex-col rounded-lg shadow-lg overflow-hidden">
              <div className="flex-1 bg-white p-6 flex flex-col justify-between">
                <div className="flex-1">
                  <div className="flex items-center">
                    <StarRating rating={5} />
                  </div>
                  <p className="mt-3 text-base text-neutral-800">
                    "El sistema de agendamiento es impecable. Mis pacientes pueden reservar citas fácilmente y yo tengo control total sobre mi disponibilidad."
                  </p>
                </div>
                <div className="mt-6 flex items-center">
                  <div className="flex-shrink-0">
                    <img className="h-10 w-10 rounded-full" src="https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?ixlib=rb-1.2.1&ixid=eyJhcHBfaWQiOjEyMDd9&auto=format&fit=facearea&facepad=2&w=256&h=256&q=80" alt="User testimonial avatar" />
                  </div>
                  <div className="ml-3">
                    <p className="text-sm font-medium text-neutral-800">Dra. Laura Mendoza</p>
                    <p className="text-sm text-neutral-600">Psicoterapeuta</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex flex-col rounded-lg shadow-lg overflow-hidden">
              <div className="flex-1 bg-white p-6 flex flex-col justify-between">
                <div className="flex-1">
                  <div className="flex items-center">
                    <StarRating rating={5} />
                  </div>
                  <p className="mt-3 text-base text-neutral-800">
                    "Los modelos de mensajes con IA me han ayudado a mantener una comunicación cálida y profesional. Mis pacientes aprecian la atención personalizada."
                  </p>
                </div>
                <div className="mt-6 flex items-center">
                  <div className="flex-shrink-0">
                    <img className="h-10 w-10 rounded-full" src="https://images.unsplash.com/photo-1573497019940-1c28c88b4f3e?ixlib=rb-1.2.1&ixid=eyJhcHBfaWQiOjEyMDd9&auto=format&fit=facearea&facepad=2&w=256&h=256&q=80" alt="User testimonial avatar" />
                  </div>
                  <div className="ml-3">
                    <p className="text-sm font-medium text-neutral-800">Dr. Martín Torres</p>
                    <p className="text-sm text-neutral-600">Psicólogo Infantil</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Contact Section */}
      <section id="contact" className="py-12 bg-white sm:py-16 lg:py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-2xl mx-auto lg:max-w-none">
            <div className="text-center">
              <h2 className="text-3xl font-extrabold tracking-tight text-neutral-800 sm:text-4xl font-serif">
                Queremos escucharte
              </h2>
              <p className="mt-3 text-xl text-neutral-800">
                Estamos coordinando reuniones breves con profesionales para construir una plataforma que responda a sus necesidades reales.
              </p>
            </div>
            <div className="mt-12 lg:mt-16 lg:grid lg:grid-cols-2 lg:gap-8">
              <div className="relative">
                <div className="relative h-full bg-white rounded-lg shadow-lg p-8">
                  <div className="prose prose-indigo mx-auto">
                    <h3 className="text-2xl font-semibold text-neutral-800 font-serif">Queremos hablar contigo porque:</h3>
                    <ul className="mt-6 space-y-4 text-base">
                      <li className="flex items-center">
                        <div className="flex-shrink-0">
                          <Check className="text-primary-500 h-5 w-5" />
                        </div>
                        <p className="ml-3">Necesitamos validar que estemos resolviendo los problemas correctos</p>
                      </li>
                      <li className="flex items-center">
                        <div className="flex-shrink-0">
                          <Check className="text-primary-500 h-5 w-5" />
                        </div>
                        <p className="ml-3">Queremos escuchar tus ideas y sugerencias para incorporarlas</p>
                      </li>
                      <li className="flex items-center">
                        <div className="flex-shrink-0">
                          <Check className="text-primary-500 h-5 w-5" />
                        </div>
                        <p className="ml-3">Te ofrecemos la posibilidad de ser de los primeros en probar la herramienta</p>
                      </li>
                    </ul>
                    <div className="mt-8">
                      <p className="text-base text-neutral-800">
                        Las reuniones son breves (15-20 minutos) y totalmente adaptadas a tu disponibilidad.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
              <div className="mt-10 lg:mt-0">
                <div className="bg-white rounded-lg shadow-lg overflow-hidden">
                  <div className="px-6 py-8 sm:p-10">
                    <h3 className="text-xl font-medium text-neutral-800">Solicita información</h3>
                    <ContactForm />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Home;
