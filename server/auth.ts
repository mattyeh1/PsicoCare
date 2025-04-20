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
  const [hashed, salt] = stored.split(".");
  const hashedBuf = Buffer.from(hashed, "hex");
  const suppliedBuf = (await scryptAsync(supplied, salt, 64)) as Buffer;
  return timingSafeEqual(hashedBuf, suppliedBuf);
}

export function setupAuth(app: Express) {
  // Mejorar los ajustes de la sesión para mayor estabilidad
  const isDev = process.env.NODE_ENV !== "production";
  console.log("Configurando sesión en modo:", isDev ? "DESARROLLO" : "PRODUCCIÓN");
  
  const sessionSettings: session.SessionOptions = {
    secret: process.env.SESSION_SECRET || "j5ts2B6nMVGsdnvbFzEZ",
    resave: true, // En desarrollo, mejor guardar siempre para asegurar persistencia
    saveUninitialized: true, // En desarrollo, guardar incluso sesiones sin inicializar
    store: storage.sessionStore,
    cookie: {
      maxAge: 1000 * 60 * 60 * 24 * 30, // 30 días para mayor persistencia
      httpOnly: true,
      secure: false, // En desarrollo, no usar secure para permitir HTTP
      sameSite: 'lax',
      path: '/' // Asegura que la cookie sea válida para toda la aplicación
    },
    rolling: true, // Renovar la cookie en cada respuesta
    name: 'psiconnect.sid' // Nombre específico para evitar conflictos
  };

  app.set("trust proxy", 1);
  app.use(session(sessionSettings));
  app.use(passport.initialize());
  app.use(passport.session());

  passport.use(
    new LocalStrategy(async (username, password, done) => {
      try {
        const user = await storage.getUserByUsername(username);
        if (!user || !(await comparePasswords(password, user.password))) {
          return done(null, false);
        } else {
          return done(null, user);
        }
      } catch (err) {
        return done(err);
      }
    }),
  );

  passport.serializeUser((user, done) => {
    // Serializar solo el ID del usuario para mayor seguridad
    console.log(`Serializando usuario con ID: ${user.id}`);
    done(null, user.id);
  });
  
  passport.deserializeUser(async (id: number, done) => {
    try {
      console.log(`Intentando deserializar usuario con ID: ${id}`);
      const user = await storage.getUser(id);
      
      if (!user) {
        console.warn(`❌ Usuario ID ${id} no encontrado durante deserialización`);
        // Si el usuario no se encuentra, rechazar la deserialización
        return done(null, false);
      }
      
      // Actualizar timestamp de último login
      try {
        await storage.recordUserLogin(id);
      } catch (updateErr) {
        console.warn(`No se pudo actualizar último login para usuario ${id}:`, updateErr);
        // Continuamos aunque falle la actualización del timestamp
      }
      
      console.log(`✅ Usuario ID ${id} deserializado correctamente`);
      // Usuario encontrado, continuar
      done(null, user);
    } catch (err) {
      // Manejar errores durante la deserialización
      console.error(`❌ Error al deserializar usuario ID ${id}:`, err);
      done(err);
    }
  });

  app.post("/api/register", async (req, res, next) => {
    try {
      const existingUser = await storage.getUserByUsername(req.body.username);
      if (existingUser) {
        return res.status(400).json({ error: "El nombre de usuario ya existe" });
      }

      const user = await storage.createUser({
        ...req.body,
        password: await hashPassword(req.body.password),
      });

      req.login(user, (err) => {
        if (err) return next(err);
        // Omite el campo password en la respuesta
        const { password, ...userWithoutPassword } = user;
        res.status(201).json(userWithoutPassword);
      });
    } catch (err) {
      next(err);
    }
  });

  app.post("/api/login", (req, res, next) => {
    console.log("Intento de login para usuario:", req.body.username);
    
    passport.authenticate("local", (err: any, user: any, info: any) => {
      if (err) {
        console.error("Error durante autenticación:", err);
        return next(err);
      }
      
      if (!user) {
        console.warn(`Credenciales inválidas para usuario: ${req.body.username}`);
        return res.status(401).json({ error: "Credenciales inválidas" });
      }
      
      console.log(`Usuario autenticado correctamente: ${user.username} (ID: ${user.id})`);
      
      req.login(user, (err: any) => {
        if (err) {
          console.error("Error en req.login:", err);
          return next(err);
        }
        
        // Registrar sesión
        console.log(`Sesión iniciada para ${user.username}, ID de sesión: ${req.sessionID}`);
        
        // Omite el campo password en la respuesta
        const { password, ...userWithoutPassword } = user;
        
        // Utilizar cookie explícita para reforzar la persistencia de sesión
        res.cookie('session_active', 'true', { 
          maxAge: 30 * 24 * 60 * 60 * 1000, // 30 días
          httpOnly: false,
          path: '/',
          secure: false
        });
        
        res.status(200).json(userWithoutPassword);
      });
    })(req, res, next);
  });

  app.post("/api/logout", (req, res, next) => {
    console.log("Solicitud de cierre de sesión recibida. Datos de sesión:", {
      sessionID: req.sessionID,
      isAuthenticated: req.isAuthenticated(),
      userID: req.user?.id
    });
    
    if (!req.isAuthenticated() || !req.user) {
      console.log("Intento de cerrar sesión sin estar autenticado");
      return res.status(200).json({ message: "No hay sesión activa" });
    }
    
    const userId = req.user.id;
    const username = req.user.username;
    
    req.logout((err) => {
      if (err) {
        console.error('Error al cerrar sesión:', err);
        return next(err);
      }
      
      console.log(`Logout exitoso para usuario ${username} (ID: ${userId})`);
      
      // Destruir sesión al cerrar sesión para mayor seguridad
      req.session.destroy((err) => {
        if (err) {
          console.error('Error al destruir la sesión:', err);
          return next(err);
        }
        
        // Limpiar todas las cookies
        res.clearCookie('psiconnect.sid', { path: '/' });
        res.clearCookie('session_active', { path: '/' });
        
        console.log("Sesión destruida y cookies eliminadas");
        
        // Enviar respuesta exitosa
        res.status(200).json({ message: "Sesión cerrada correctamente" });
      });
    });
  });

  app.get("/api/user", async (req, res) => {
    console.log("GET /api/user - Estado de autenticación:", { 
      isAuthenticated: req.isAuthenticated(),
      hasUser: !!req.user,
      sessionID: req.sessionID
    });
    
    // Verificar autenticación
    if (!req.isAuthenticated() || !req.user) {
      console.log("Usuario no autenticado en /api/user");
      return res.status(401).json({ error: "No autenticado" });
    }
    
    // Verificar que el usuario existe
    if (!req.user.id) {
      console.warn("Sesión inválida: Usuario sin ID");
      // Sesión inválida, cerrarla
      req.logout((err) => {
        if (err) console.error('Error al cerrar sesión de usuario inválido:', err);
        req.session.destroy((err) => {
          if (err) console.error('Error al destruir sesión inválida:', err);
        });
      });
      return res.status(401).json({ error: "Sesión inválida" });
    }
    
    try {
      // Verificar que el usuario existe en la base de datos
      const userId = req.user.id;
      const freshUser = await storage.getUser(userId);
      
      if (!freshUser) {
        console.warn(`Usuario ID ${userId} ya no existe en la base de datos`);
        req.logout((err) => {
          if (err) console.error(`Error al cerrar sesión de usuario que ya no existe:`, err);
          req.session.destroy((err) => {
            if (err) console.error(`Error al destruir sesión de usuario inexistente:`, err);
          });
        });
        return res.status(401).json({ error: "Usuario no encontrado" });
      }
      
      // Actualizar datos de sesión con los más recientes
      req.user = freshUser;
      
      console.log(`Usuario ID ${userId} autenticado correctamente`);
      
      // Omite el campo password en la respuesta
      const { password, ...userWithoutPassword } = freshUser;
      res.json(userWithoutPassword);
    } catch (error) {
      console.error("Error al verificar usuario:", error);
      res.status(500).json({ error: "Error al verificar usuario" });
    }
  });
}