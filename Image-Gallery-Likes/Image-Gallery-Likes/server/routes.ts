import express, { type Express, type Request, type Response, type NextFunction } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import session from "express-session";
import multer from "multer";
import path from "path";
import fs from "fs";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { loginSchema, updateProfileSchema } from "@shared/schema";

declare module "express-session" {
  interface SessionData {
    adminId?: string;
  }
}

const UPLOAD_DIR = path.join(process.cwd(), "uploads");
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

const upload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, UPLOAD_DIR),
    filename: (_req, file, cb) => {
      const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
      const ext = path.extname(file.originalname);
      cb(null, uniqueSuffix + ext);
    },
  }),
  limits: { fileSize: 200 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype === "image/jpeg" || file.mimetype === "image/jpg") {
      cb(null, true);
    } else {
      cb(new Error("Apenas ficheiros JPEG sao permitidos."));
    }
  },
});

const profileUpload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, UPLOAD_DIR),
    filename: (_req, file, cb) => {
      const uniqueSuffix = "profile-" + Date.now() + "-" + Math.round(Math.random() * 1e9);
      const ext = path.extname(file.originalname);
      cb(null, uniqueSuffix + ext);
    },
  }),
  limits: { fileSize: 200 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith("image/")) {
      cb(null, true);
    } else {
      cb(new Error("Apenas ficheiros de imagem sao permitidos."));
    }
  },
});

function requireAdmin(req: Request, res: Response, next: NextFunction) {
  if (!req.session.adminId) {
    return res.status(401).json({ message: "Nao autenticado" });
  }
  next();
}

async function seedAdmins() {
  const count = await storage.getAdminCount();
  if (count === 0) {
    await storage.createAdmin({ username: "admin1", password: "admin123" });
    await storage.createAdmin({ username: "admin2", password: "admin456" });
    console.log("Seed: 2 admin users created");
  }
}

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  const sessionSecret = process.env.SESSION_SECRET;
  if (!sessionSecret) {
    throw new Error("SESSION_SECRET environment variable is required");
  }

  const isProduction = process.env.NODE_ENV === "production" || process.env.REPLIT_DEPLOYMENT === "1";

  if (isProduction) {
    app.set("trust proxy", 1);
  }

  app.use(
    session({
      secret: sessionSecret,
      resave: false,
      saveUninitialized: false,
      cookie: {
        maxAge: 24 * 60 * 60 * 1000,
        httpOnly: true,
        sameSite: "lax",
        secure: isProduction,
      },
    })
  );

  app.use("/uploads", express.static(UPLOAD_DIR, {
    maxAge: "1d",
    setHeaders: (res, filePath) => {
      if (filePath.endsWith(".jpeg") || filePath.endsWith(".jpg")) {
        res.setHeader("Content-Type", "image/jpeg");
      }
    },
  }));

  try {
    await seedAdmins();
  } catch (err) {
    console.error("Database seed error:", err);
  }

  // Auth routes
  app.post("/api/auth/login", async (req, res) => {
    try {
      const { username, password } = loginSchema.parse(req.body);
      const admin = await storage.getAdminByUsername(username);

      if (!admin) {
        return res.status(401).json({ message: "Credenciais invalidas" });
      }

      const valid = await bcrypt.compare(password, admin.password);
      if (!valid) {
        return res.status(401).json({ message: "Credenciais invalidas" });
      }

      req.session.adminId = admin.id;
      res.json({ admin: { id: admin.id, username: admin.username, profilePicture: admin.profilePicture } });
    } catch (err) {
      res.status(400).json({ message: "Dados invalidos" });
    }
  });

  app.get("/api/auth/session", async (req, res) => {
    if (!req.session.adminId) {
      return res.status(401).json({ message: "Nao autenticado" });
    }
    const admin = await storage.getAdminById(req.session.adminId);
    if (!admin) {
      return res.status(401).json({ message: "Admin nao encontrado" });
    }
    res.json({ admin: { id: admin.id, username: admin.username, profilePicture: admin.profilePicture } });
  });

  app.post("/api/auth/logout", (req, res) => {
    req.session.destroy(() => {
      res.json({ ok: true });
    });
  });

  // Public images
  app.get("/api/images", async (_req, res) => {
    const imgs = await storage.getImages();
    res.json(imgs);
  });

  // Public like
  app.post("/api/images/:id/like", async (req, res) => {
    try {
      const { id } = req.params;
      const emailSchema = z.object({
        email: z.string().includes("@", { message: "O email deve conter @" }),
      });
      const { email } = emailSchema.parse(req.body);

      const image = await storage.getImageById(id);
      if (!image) {
        return res.status(404).json({ message: "Imagem nao encontrada" });
      }

      const existingLike = await storage.getLikeByEmail(email);
      if (existingLike) {
        return res.status(409).json({ message: "Este email ja deu like. Cada email so pode dar 1 like." });
      }

      const like = await storage.createLike({ imageId: id, email });
      res.json(like);
    } catch (err: any) {
      if (err.issues) {
        return res.status(400).json({ message: "Invalid email" });
      }
      res.status(500).json({ message: "Erro interno" });
    }
  });

  // Admin routes
  app.get("/api/admin/images", requireAdmin, async (_req, res) => {
    const imgs = await storage.getImages();
    res.json(imgs);
  });

  app.get("/api/admin/images/:id/likes", requireAdmin, async (req: Request, res: Response) => {
    const likes = await storage.getLikesByImageId(req.params.id as string);
    res.json(likes);
  });

  app.post("/api/admin/upload", requireAdmin, (req, res) => {
    upload.array("images", 10)(req, res, async (err) => {
      if (err) {
        if (err instanceof multer.MulterError) {
          if (err.code === "LIMIT_FILE_SIZE") {
            return res.status(400).json({ message: "Ficheiro demasiado grande. Maximo 200KB." });
          }
        }
        return res.status(400).json({ message: err.message || "Erro no upload" });
      }

      const files = req.files as Express.Multer.File[];
      if (!files || files.length === 0) {
        return res.status(400).json({ message: "Nenhum ficheiro selecionado" });
      }

      const created = [];
      for (const file of files) {
        const image = await storage.createImage({
          filename: file.filename,
          originalName: file.originalname,
          mimeType: file.mimetype,
          size: file.size,
          uploadedBy: req.session.adminId!,
        });
        created.push(image);
      }

      res.json(created);
    });
  });

  app.put("/api/admin/profile", requireAdmin, async (req: Request, res: Response) => {
    try {
      const adminId = req.session.adminId!;
      const data = updateProfileSchema.parse(req.body);
      const admin = await storage.getAdminById(adminId);
      if (!admin) {
        return res.status(404).json({ message: "Admin nao encontrado" });
      }

      const updateData: Partial<{ username: string; password: string; profilePicture: string | null }> = {};

      if (data.username && data.username !== admin.username) {
        const existing = await storage.getAdminByUsername(data.username);
        if (existing && existing.id !== adminId) {
          return res.status(409).json({ message: "Este nome de usuario ja esta em uso" });
        }
        updateData.username = data.username;
      }

      if (data.newPassword) {
        if (!data.currentPassword) {
          return res.status(400).json({ message: "Senha atual obrigatoria para alterar a senha" });
        }
        const validPassword = await bcrypt.compare(data.currentPassword, admin.password);
        if (!validPassword) {
          return res.status(401).json({ message: "Senha atual incorreta" });
        }
        updateData.password = data.newPassword;
      }

      const updated = await storage.updateAdmin(adminId, updateData);
      if (!updated) {
        return res.status(500).json({ message: "Erro ao atualizar perfil" });
      }

      res.json({ admin: { id: updated.id, username: updated.username, profilePicture: updated.profilePicture } });
    } catch (err: any) {
      if (err.issues) {
        return res.status(400).json({ message: err.issues[0]?.message || "Dados invalidos" });
      }
      res.status(500).json({ message: "Erro interno" });
    }
  });

  app.post("/api/admin/profile/picture", requireAdmin, (req: Request, res: Response) => {
    profileUpload.single("profilePicture")(req, res, async (err) => {
      if (err) {
        return res.status(400).json({ message: err.message || "Erro no upload" });
      }

      const file = req.file;
      if (!file) {
        return res.status(400).json({ message: "Nenhum ficheiro selecionado" });
      }

      const adminId = req.session.adminId!;
      const admin = await storage.getAdminById(adminId);

      if (admin?.profilePicture) {
        const oldPath = path.join(UPLOAD_DIR, admin.profilePicture);
        if (fs.existsSync(oldPath)) {
          fs.unlinkSync(oldPath);
        }
      }

      const updated = await storage.updateAdmin(adminId, { profilePicture: file.filename });
      if (!updated) {
        return res.status(500).json({ message: "Erro ao atualizar foto" });
      }

      res.json({ admin: { id: updated.id, username: updated.username, profilePicture: updated.profilePicture } });
    });
  });

  app.delete("/api/admin/profile/picture", requireAdmin, async (req: Request, res: Response) => {
    const adminId = req.session.adminId!;
    const admin = await storage.getAdminById(adminId);

    if (admin?.profilePicture) {
      const oldPath = path.join(UPLOAD_DIR, admin.profilePicture);
      if (fs.existsSync(oldPath)) {
        fs.unlinkSync(oldPath);
      }
    }

    const updated = await storage.updateAdmin(adminId, { profilePicture: null });
    if (!updated) {
      return res.status(500).json({ message: "Erro ao remover foto" });
    }

    res.json({ admin: { id: updated.id, username: updated.username, profilePicture: updated.profilePicture } });
  });

  app.delete("/api/admin/images/:id", requireAdmin, async (req: Request, res: Response) => {
    const id = req.params.id as string;
    const image = await storage.getImageById(id);
    if (!image) {
      return res.status(404).json({ message: "Imagem nao encontrada" });
    }

    const filePath = path.join(UPLOAD_DIR, image.filename);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    await storage.deleteImage(id);
    res.json({ ok: true });
  });

  return httpServer;
}
