import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { 
  Menu, 
  User, 
  Calendar, 
  MessageSquare, 
  FileText, 
  LogOut 
} from "lucide-react";
import { useState, useEffect } from "react";

const Header = () => {
  const [location] = useLocation();
  const { user, isAuthenticated, logoutMutation, refetchUser } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  
  // Middleware intermedio para redirigir a pantalla adecuada según rol (si viene desde root)
  useEffect(() => {
    if (isAuthenticated && user && location === "/") {
      // Redirigir a página principal según tipo de usuario
      if (user.user_type === 'psychologist') {
        window.location.href = "/dashboard";
      } else {
        window.location.href = "/patient-dashboard";
      }
    }
  }, [isAuthenticated, user, location]);

  // Efecto para verificar el estado de autenticación cada vez que se muestra el Header
  // Esto ayuda a mantener la sesión actualizada y prevenir deslogueos inesperados
  useEffect(() => {
    const checkAuthentication = () => {
      if (refetchUser) {
        refetchUser().catch(err => {
          console.error("Error al refrescar datos de usuario en Header:", err);
        });
      }
    };
    
    // Verificar autenticación al montar el componente
    checkAuthentication();
    
    // Configurar verificación periódica
    const intervalId = setInterval(checkAuthentication, 60000); // Cada minuto
    
    // Limpiar intervalo al desmontar
    return () => clearInterval(intervalId);
  }, [refetchUser]);

  const handleLogout = () => {
    logoutMutation.mutate();
  };

  return (
    <header className="bg-white shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center py-4 md:justify-start md:space-x-10">
          <div className="flex justify-start lg:w-0 lg:flex-1">
            <Link href="/" className="flex items-center">
              <span className="text-primary text-2xl font-serif font-semibold">PsiConnect</span>
            </Link>
          </div>
          
          {/* Mobile menu button */}
          <div className="-mr-2 -my-2 md:hidden">
            <Button
              variant="ghost"
              className="p-2 inline-flex items-center justify-center text-neutral-800 hover:text-primary hover:bg-neutral-50"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-expanded={mobileMenuOpen}
            >
              <span className="sr-only">Abrir menú</span>
              <Menu className="h-6 w-6" />
            </Button>
          </div>
          
          {/* Desktop Navigation */}
          {!isAuthenticated && (
            <nav className="hidden md:flex space-x-10">
              <Link href="/#features" className="text-base font-medium text-neutral-800 hover:text-primary transition-colors">
                Funcionalidades
              </Link>
              <Link href="/#benefits" className="text-base font-medium text-neutral-800 hover:text-primary transition-colors">
                Beneficios
              </Link>
              <Link href="/#contact" className="text-base font-medium text-neutral-800 hover:text-primary transition-colors">
                Contacto
              </Link>
            </nav>
          )}
          
          <div className="hidden md:flex items-center justify-end md:flex-1 lg:w-0">
            {isAuthenticated ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="flex items-center gap-2">
                    <User className="h-4 w-4" />
                    <span>{user?.full_name || user?.username}</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  <DropdownMenuItem>
                    <div 
                      onClick={() => window.location.href = user?.user_type === 'psychologist' ? "/dashboard" : "/patient-dashboard"}
                      className="flex items-center gap-2 cursor-pointer w-full"
                    >
                      <User className="h-4 w-4" />
                      <span>Dashboard</span>
                    </div>
                  </DropdownMenuItem>
                  <DropdownMenuItem>
                    <div 
                      onClick={() => window.location.href = "/profile"}
                      className="flex items-center gap-2 cursor-pointer w-full"
                    >
                      <User className="h-4 w-4" />
                      <span>Perfil</span>
                    </div>
                  </DropdownMenuItem>
                  {user?.user_type === 'psychologist' && (
                    <>
                      <DropdownMenuItem>
                        <div 
                          onClick={() => window.location.href = "/appointments"}
                          className="flex items-center gap-2 cursor-pointer w-full"
                        >
                          <Calendar className="h-4 w-4" />
                          <span>Citas</span>
                        </div>
                      </DropdownMenuItem>
                      <DropdownMenuItem>
                        <div 
                          onClick={() => window.location.href = "/messages"}
                          className="flex items-center gap-2 cursor-pointer w-full"
                        >
                          <MessageSquare className="h-4 w-4" />
                          <span>Mensajes</span>
                        </div>
                      </DropdownMenuItem>
                      <DropdownMenuItem>
                        <div 
                          onClick={() => window.location.href = "/consent-forms"}
                          className="flex items-center gap-2 cursor-pointer w-full"
                        >
                          <FileText className="h-4 w-4" />
                          <span>Consentimientos</span>
                        </div>
                      </DropdownMenuItem>
                    </>
                  )}
                  <DropdownMenuItem onClick={handleLogout} className="flex items-center gap-2 text-red-500">
                    <LogOut className="h-4 w-4" />
                    <span>Cerrar sesión</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <>
                <Link href="/login" className="whitespace-nowrap text-base font-medium text-neutral-800 hover:text-primary transition-colors">
                  Iniciar sesión
                </Link>
                <Link href="/register" className="ml-8 whitespace-nowrap inline-flex items-center justify-center px-4 py-2 border border-transparent rounded-md shadow-sm text-base font-medium text-white bg-primary hover:bg-primary/90 transition-colors">
                  Registrarse
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
      
      {/* Mobile menu */}
      {mobileMenuOpen && (
        <div className="md:hidden">
          <div className="px-2 pt-2 pb-3 space-y-1">
            {!isAuthenticated && (
              <>
                <Link 
                  href="/#features" 
                  className="block px-3 py-2 rounded-md text-base font-medium text-neutral-800 hover:text-primary hover:bg-neutral-50"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Funcionalidades
                </Link>
                <Link 
                  href="/#benefits" 
                  className="block px-3 py-2 rounded-md text-base font-medium text-neutral-800 hover:text-primary hover:bg-neutral-50"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Beneficios
                </Link>
                <Link 
                  href="/#contact" 
                  className="block px-3 py-2 rounded-md text-base font-medium text-neutral-800 hover:text-primary hover:bg-neutral-50"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Contacto
                </Link>
              </>
            )}
            
            {isAuthenticated ? (
              <>
                <button 
                  className="block w-full text-left px-3 py-2 rounded-md text-base font-medium text-neutral-800 hover:text-primary hover:bg-neutral-50"
                  onClick={() => {
                    setMobileMenuOpen(false);
                    window.location.href = user?.user_type === 'psychologist' ? "/dashboard" : "/patient-dashboard";
                  }}
                >
                  Dashboard
                </button>
                <button 
                  className="block w-full text-left px-3 py-2 rounded-md text-base font-medium text-neutral-800 hover:text-primary hover:bg-neutral-50"
                  onClick={() => {
                    setMobileMenuOpen(false);
                    window.location.href = "/profile";
                  }}
                >
                  Perfil
                </button>
                {user?.user_type === 'psychologist' && (
                  <>
                    <button 
                      className="block w-full text-left px-3 py-2 rounded-md text-base font-medium text-neutral-800 hover:text-primary hover:bg-neutral-50"
                      onClick={() => {
                        setMobileMenuOpen(false);
                        window.location.href = "/appointments";
                      }}
                    >
                      Citas
                    </button>
                    <button 
                      className="block w-full text-left px-3 py-2 rounded-md text-base font-medium text-neutral-800 hover:text-primary hover:bg-neutral-50"
                      onClick={() => {
                        setMobileMenuOpen(false);
                        window.location.href = "/messages";
                      }}
                    >
                      Mensajes
                    </button>
                    <button 
                      className="block w-full text-left px-3 py-2 rounded-md text-base font-medium text-neutral-800 hover:text-primary hover:bg-neutral-50"
                      onClick={() => {
                        setMobileMenuOpen(false);
                        window.location.href = "/consent-forms";
                      }}
                    >
                      Consentimientos
                    </button>
                  </>
                )}
                <button 
                  onClick={() => {
                    handleLogout();
                    setMobileMenuOpen(false);
                  }}
                  className="block w-full text-left px-3 py-2 rounded-md text-base font-medium text-red-500 hover:bg-neutral-50"
                >
                  Cerrar sesión
                </button>
              </>
            ) : (
              <>
                <Link 
                  href="/login" 
                  className="block px-3 py-2 rounded-md text-base font-medium text-neutral-800 hover:text-primary hover:bg-neutral-50"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Iniciar sesión
                </Link>
                <Link 
                  href="/register" 
                  className="block px-3 py-2 rounded-md text-base font-medium text-white bg-primary hover:bg-primary/90 mt-2"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Registrarse
                </Link>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  );
};

export default Header;
