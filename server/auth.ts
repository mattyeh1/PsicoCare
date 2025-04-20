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
      // Debug para ver qué se recibe
      console.log("Recibida solicitud de registro:", {
        ...req.body,
        password: req.body.password ? '[REDACTED]' : undefined
      });
      
      // Validar campos básicos de cualquier usuario
      if (!req.body || !req.body.username || !req.body.password) {
        console.log("Datos de registro incompletos");
        return res.status(400).json({ error: "Datos incompletos" });
      }

      if (!req.body.email) {
        return res.status(400).json({ error: "El email es obligatorio" });
      }

      if (!req.body.full_name) {
        return res.status(400).json({ error: "El nombre completo es obligatorio" });
      }

      // Verificar si el usuario ya existe
      console.log("Verificando si el usuario ya existe:", req.body.username);
      const existingUser = await storage.getUserByUsername(req.body.username);
      
      if (existingUser) {
        console.log("Usuario ya existe:", req.body.username);
        return res.status(400).json({ error: "El nombre de usuario ya existe" });
      }

      // Verificar si el email ya existe
      const existingEmail = await storage.getUserByEmail(req.body.email);
      if (existingEmail) {
        console.log("Email ya existe:", req.body.email);
        return res.status(400).json({ error: "El email ya está registrado" });
      }

      const hashedPassword = await hashPassword(req.body.password);
      let userData = {
        ...req.body,
        password: hashedPassword,
      };

      // Verificamos el tipo de usuario que se está registrando
      if (req.body.user_type === 'psychologist') {
        // Si es psicólogo, validamos especialidad
        if (!req.body.specialty) {
          return res.status(400).json({ error: "La especialidad es obligatoria para psicólogos" });
        }
        
        // Generamos un código único de 4 dígitos para el psicólogo
        const uniqueCode = Math.floor(1000 + Math.random() * 9000).toString();
        userData.unique_code = uniqueCode;
        
        console.log("Creando nuevo psicólogo con código:", uniqueCode);
      } 
      else if (req.body.user_type === 'patient') {
        // Si es paciente, validamos el código del psicólogo
        if (!req.body.psychologist_code) {
          return res.status(400).json({ error: "El código del psicólogo es obligatorio" });
        }
        
        // Buscamos el psicólogo por el código
        const psychologist = await storage.getUserByUniqueCode(req.body.psychologist_code);
        
        if (!psychologist || psychologist.user_type !== 'psychologist') {
          return res.status(400).json({ error: "Código de psicólogo inválido" });
        }
        
        // Asociamos al paciente con el psicólogo
        userData.psychologist_id = psychologist.id;
        console.log("Creando nuevo paciente asociado al psicólogo ID:", psychologist.id);
      }
      else {
        return res.status(400).json({ error: "Tipo de usuario inválido" });
      }

      // Crear el usuario
      const user = await storage.createUser(userData);

      console.log("Usuario creado, iniciando sesión:", user.id);
      // Iniciar sesión automáticamente
      req.login(user, (err) => {
        if (err) {
          console.error("Error en req.login:", err);
          return next(err);
        }
        
        // Remover el password antes de enviar la respuesta
        const { password, ...userWithoutPassword } = user;
        
        // Tocar la sesión para actualizarla
        if (req.session) {
          req.session.touch();
        }
        
        console.log("Registro completado con éxito, enviando respuesta");
        return res.status(201).json(userWithoutPassword);
      });
    } catch (error) {
      console.error("Error en registro:", error);
      return res.status(500).json({ error: "Error interno del servidor" });
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