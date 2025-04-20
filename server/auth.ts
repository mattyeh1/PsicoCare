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
      const user = await storage.getUserByUsername(username);
      if (!user || !(await comparePasswords(password, user.password))) {
        return done(null, false);
      } else {
        return done(null, user);
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
    const existingUser = await storage.getUserByUsername(req.body.username);
    if (existingUser) {
      return res.status(400).send("Username already exists");
    }

    const user = await storage.createUser({
      ...req.body,
      password: await hashPassword(req.body.password),
    });

    req.login(user, (err) => {
      if (err) return next(err);
      // Remover el password antes de enviar la respuesta
      const { password, ...userWithoutPassword } = user;
      res.status(201).json(userWithoutPassword);
    });
  });

  app.post("/api/login", passport.authenticate("local"), (req, res) => {
    // La autenticación fue exitosa, el usuario está en req.user
    // Remover el password antes de enviar la respuesta
    const { password, ...userWithoutPassword } = req.user as SelectUser;
    res.status(200).json(userWithoutPassword);
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