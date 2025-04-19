import { Link, useLocation } from "wouter";
import { useAuth } from "@/providers/AuthProvider";
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
import { useState } from "react";

const Header = () => {
  const [location] = useLocation();
  const { isAuthenticated, user, logout } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <header className="bg-white shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center py-4 md:justify-start md:space-x-10">
          <div className="flex justify-start lg:w-0 lg:flex-1">
            <Link href="/" className="flex items-center">
              <span className="text-primary-500 text-2xl font-serif font-semibold">PsiConnect</span>
            </Link>
          </div>
          
          {/* Mobile menu button */}
          <div className="-mr-2 -my-2 md:hidden">
            <Button
              variant="ghost"
              className="p-2 inline-flex items-center justify-center text-neutral-800 hover:text-primary-500 hover:bg-neutral-50"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-expanded={mobileMenuOpen}
            >
              <span className="sr-only">Abrir menú</span>
              <Menu className="h-6 w-6" />
            </Button>
          </div>
          
          {/* Desktop Navigation */}
          <nav className="hidden md:flex space-x-10">
            <Link href="/#features" className="text-base font-medium text-neutral-800 hover:text-primary-500 transition-colors">
              Funcionalidades
            </Link>
            <Link href="/#benefits" className="text-base font-medium text-neutral-800 hover:text-primary-500 transition-colors">
              Beneficios
            </Link>
            <Link href="/#contact" className="text-base font-medium text-neutral-800 hover:text-primary-500 transition-colors">
              Contacto
            </Link>
          </nav>
          
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
                  <DropdownMenuItem asChild>
                    <Link href="/dashboard" className="flex items-center gap-2">
                      <User className="h-4 w-4" />
                      <span>Dashboard</span>
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/profile" className="flex items-center gap-2">
                      <User className="h-4 w-4" />
                      <span>Perfil</span>
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/appointments" className="flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      <span>Citas</span>
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/messages" className="flex items-center gap-2">
                      <MessageSquare className="h-4 w-4" />
                      <span>Mensajes</span>
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/consent-forms" className="flex items-center gap-2">
                      <FileText className="h-4 w-4" />
                      <span>Consentimientos</span>
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={logout} className="flex items-center gap-2 text-red-500">
                    <LogOut className="h-4 w-4" />
                    <span>Cerrar sesión</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <>
                <Link href="/login" className="whitespace-nowrap text-base font-medium text-neutral-800 hover:text-primary-500 transition-colors">
                  Iniciar sesión
                </Link>
                <Link href="/register" className="ml-8 whitespace-nowrap inline-flex items-center justify-center px-4 py-2 border border-transparent rounded-md shadow-sm text-base font-medium text-white bg-primary-500 hover:bg-primary-600 transition-colors">
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
            <Link 
              href="/#features" 
              className="block px-3 py-2 rounded-md text-base font-medium text-neutral-800 hover:text-primary-500 hover:bg-neutral-50"
              onClick={() => setMobileMenuOpen(false)}
            >
              Funcionalidades
            </Link>
            <Link 
              href="/#benefits" 
              className="block px-3 py-2 rounded-md text-base font-medium text-neutral-800 hover:text-primary-500 hover:bg-neutral-50"
              onClick={() => setMobileMenuOpen(false)}
            >
              Beneficios
            </Link>
            <Link 
              href="/#contact" 
              className="block px-3 py-2 rounded-md text-base font-medium text-neutral-800 hover:text-primary-500 hover:bg-neutral-50"
              onClick={() => setMobileMenuOpen(false)}
            >
              Contacto
            </Link>
            
            {isAuthenticated ? (
              <>
                <Link 
                  href="/dashboard" 
                  className="block px-3 py-2 rounded-md text-base font-medium text-neutral-800 hover:text-primary-500 hover:bg-neutral-50"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Dashboard
                </Link>
                <Link 
                  href="/profile" 
                  className="block px-3 py-2 rounded-md text-base font-medium text-neutral-800 hover:text-primary-500 hover:bg-neutral-50"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Perfil
                </Link>
                <Link 
                  href="/appointments" 
                  className="block px-3 py-2 rounded-md text-base font-medium text-neutral-800 hover:text-primary-500 hover:bg-neutral-50"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Citas
                </Link>
                <Link 
                  href="/messages" 
                  className="block px-3 py-2 rounded-md text-base font-medium text-neutral-800 hover:text-primary-500 hover:bg-neutral-50"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Mensajes
                </Link>
                <Link 
                  href="/consent-forms" 
                  className="block px-3 py-2 rounded-md text-base font-medium text-neutral-800 hover:text-primary-500 hover:bg-neutral-50"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Consentimientos
                </Link>
                <button 
                  onClick={() => {
                    logout();
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
                  className="block px-3 py-2 rounded-md text-base font-medium text-neutral-800 hover:text-primary-500 hover:bg-neutral-50"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Iniciar sesión
                </Link>
                <Link 
                  href="/register" 
                  className="block px-3 py-2 rounded-md text-base font-medium text-white bg-primary-500 hover:bg-primary-600 mt-2"
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
