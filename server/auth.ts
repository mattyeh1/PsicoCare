import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { Express } from "express";
import session from "express-session";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";
import { storage } from "./storage";
import { User as SelectUser } from "@shared/schema";

declare global {
  namespace Express {
    interface User extends SelectUser {}
  }
}

const scryptAsync = promisify(scrypt);

async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

async function comparePasswords(supplied: string, stored: string) {
  try {
    // Verificar que el formato almacenado sea correcto
    if (!stored.includes(".")) {
      console.error("Formato de password almacenado incorrecto:", stored);
      return false;
    }
    
    const [hashed, salt] = stored.split(".");
    const hashedBuf = Buffer.from(hashed, "hex");
    const suppliedBuf = (await scryptAsync(supplied, salt, 64)) as Buffer;
    
    const result = timingSafeEqual(hashedBuf, suppliedBuf);
    console.log(`Comparación de contraseñas: ${result ? 'exitosa' : 'fallida'}`);
    return result;
  } catch (error) {
    console.error("Error al comparar contraseñas:", error);
    return false;
  }
}

export function setupAuth(app: Express) {
  const sessionSettings: session.SessionOptions = {
    secret: process.env.SESSION_SECRET || "secure-session-secret-development-only",
    resave: true, // Cambiado a true para asegurar que la sesión se guarde
    saveUninitialized: false,
    store: storage.sessionStore,
    name: 'psiconnect.sid', // Nombre personalizado para la cookie de sesión
    cookie: {
      httpOnly: true,
      maxAge: 30 * 24 * 60 * 60 * 1000, // 30 días 
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      path: '/',
    }
  };

  app.set("trust proxy", 1);
  app.use(session(sessionSettings));
  app.use(passport.initialize());
  app.use(passport.session());

  passport.use(
    new LocalStrategy(async (username, password, done) => {
      try {
        console.log(`Verificando usuario: ${username}`);
        const user = await storage.getUserByUsername(username);
        
        if (!user) {
          console.log(`Usuario no encontrado: ${username}`);
          return done(null, false);
        }
        
        // Verificar contraseña
        console.log(`Verificando contraseña para: ${username}`);
        const passwordValid = await comparePasswords(password, user.password);
        
        if (!passwordValid) {
          console.log(`Contraseña incorrecta para: ${username}`);
          return done(null, false);
        } 
        
        console.log(`Autenticación exitosa para: ${username}`);
        return done(null, user);
      } catch (error) {
        console.error("Error en estrategia de autenticación:", error);
        return done(error as Error);
      }
    }),
  );

  passport.serializeUser((user, done) => done(null, user.id));
  passport.deserializeUser(async (id: number, done) => {
    try {
      const user = await storage.getUser(id);
      done(null, user);
    } catch (err) {
      done(err, null);
    }
  });

  app.post("/api/register", async (req, res, next) => {
    try {
      // Validar que el cuerpo de la solicitud tenga los campos requeridos
      if (!req.body || !req.body.username || !req.body.password) {
        return res.status(400).json({ error: "Datos incompletos" });
      }

      const existingUser = await storage.getUserByUsername(req.body.username);
      if (existingUser) {
        return res.status(400).json({ error: "El nombre de usuario ya existe" });
      }

      const user = await storage.createUser({
        ...req.body,
        password: await hashPassword(req.body.password),
      });

      req.login(user, (err) => {
        if (err) {
          console.error("Error en req.login:", err);
          return next(err);
        }
        // Remover el password antes de enviar la respuesta
        const { password, ...userWithoutPassword } = user;
        res.status(201).json(userWithoutPassword);
      });
    } catch (error) {
      console.error("Error en registro:", error);
      res.status(500).json({ error: "Error interno del servidor" });
    }
  });

  app.post("/api/login", (req, res, next) => {
    // Log para depuración
    console.log("Intento de login:", req.body.username);
    
    passport.authenticate("local", (err: Error | null, user: SelectUser | false, info: any) => {
      if (err) {
        console.error("Error en autenticación:", err);
        return next(err);
      }
      
      if (!user) {
        console.log("Usuario no autenticado:", req.body.username);
        return res.status(401).json({ error: "Credenciales incorrectas" });
      }
      
      // Si la autenticación es exitosa, establecer la sesión
      req.login(user, (loginErr: Error | null) => {
        if (loginErr) {
          console.error("Error en login:", loginErr);
          return next(loginErr);
        }
        
        console.log("Login exitoso para:", user.username);
        // Remover el password antes de enviar la respuesta
        const { password, ...userWithoutPassword } = user as SelectUser;
        
        // Tocar la sesión para actualizarla
        if (req.session) {
          req.session.touch();
        }
        
        return res.status(200).json(userWithoutPassword);
      });
    })(req, res, next);
  });

  app.post("/api/logout", (req, res, next) => {
    req.logout((err) => {
      if (err) return next(err);
      res.sendStatus(200);
    });
  });

  app.get("/api/user", (req, res) => {
    // Verificar si hay un token CSRF en las cabeceras y mantener consistencia
    const csrfToken = req.headers['x-csrf-token'];
    
    // Verificar autenticación normal de Passport
    if (!req.isAuthenticated()) {
      // Verificar si el cliente tiene una sesión local
      const hasLocalSession = req.headers['x-has-session'] === 'true';
      console.log(`[GET /api/user] No autenticado. Cliente indica sesión local: ${hasLocalSession}`);
      
      return res.sendStatus(401);
    }
    
    // Si la sesión existe, actualizar la cookie para prolongar su duración
    if (req.session) {
      req.session.touch();
    }
    
    // Remover el password antes de enviar la respuesta
    const { password, ...userWithoutPassword } = req.user as SelectUser;
    res.json(userWithoutPassword);
  });
}