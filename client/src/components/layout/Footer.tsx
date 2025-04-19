import { Link } from "wouter";
import { 
  Instagram, 
  Twitter, 
  Linkedin 
} from "lucide-react";

const Footer = () => {
  return (
    <footer className="bg-neutral-800">
      <div className="max-w-7xl mx-auto py-12 px-4 overflow-hidden sm:px-6 lg:px-8">
        <div className="mt-8 flex justify-center space-x-6">
          <a href="#" className="text-neutral-50 hover:text-primary-400">
            <span className="sr-only">Instagram</span>
            <Instagram className="h-6 w-6" />
          </a>
          <a href="#" className="text-neutral-50 hover:text-primary-400">
            <span className="sr-only">Twitter</span>
            <Twitter className="h-6 w-6" />
          </a>
          <a href="#" className="text-neutral-50 hover:text-primary-400">
            <span className="sr-only">LinkedIn</span>
            <Linkedin className="h-6 w-6" />
          </a>
        </div>
        <nav className="mt-8 flex flex-wrap justify-center" aria-label="Footer">
          <div className="px-5 py-2">
            <a href="#" className="text-base text-neutral-50 hover:text-primary-400">Sobre nosotros</a>
          </div>
          <div className="px-5 py-2">
            <a href="#" className="text-base text-neutral-50 hover:text-primary-400">Blog</a>
          </div>
          <div className="px-5 py-2">
            <a href="#" className="text-base text-neutral-50 hover:text-primary-400">Precios</a>
          </div>
          <div className="px-5 py-2">
            <a href="#" className="text-base text-neutral-50 hover:text-primary-400">Ayuda</a>
          </div>
          <div className="px-5 py-2">
            <a href="#" className="text-base text-neutral-50 hover:text-primary-400">Política de privacidad</a>
          </div>
          <div className="px-5 py-2">
            <a href="#" className="text-base text-neutral-50 hover:text-primary-400">Términos y condiciones</a>
          </div>
        </nav>
        <p className="mt-8 text-center text-base text-neutral-50">
          &copy; {new Date().getFullYear()} PsiConnect. Todos los derechos reservados.
        </p>
      </div>
    </footer>
  );
};

export default Footer;
