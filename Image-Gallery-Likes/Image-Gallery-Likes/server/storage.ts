import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { eq, and, sql, count } from "drizzle-orm";
import {
  admins, images, likes,
  type Admin, type InsertAdmin,
  type Image, type InsertImage,
  type Like, type InsertLike,
  type ImageWithLikes,
  type UpdateProfileInput,
} from "@shared/schema";
import bcrypt from "bcryptjs";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
export const db = drizzle(pool);

export interface IStorage {
  getAdminByUsername(username: string): Promise<Admin | undefined>;
  getAdminById(id: string): Promise<Admin | undefined>;
  createAdmin(admin: InsertAdmin): Promise<Admin>;
  getAdminCount(): Promise<number>;
  updateAdmin(id: string, data: Partial<{ username: string; password: string; profilePicture: string | null }>): Promise<Admin | undefined>;

  createImage(image: InsertImage): Promise<Image>;
  getImages(): Promise<ImageWithLikes[]>;
  getImageById(id: string): Promise<Image | undefined>;
  deleteImage(id: string): Promise<void>;

  createLike(like: InsertLike): Promise<Like>;
  getLikeByEmail(email: string): Promise<Like | undefined>;
  getLikeByImageAndEmail(imageId: string, email: string): Promise<Like | undefined>;
  getLikesByImageId(imageId: string): Promise<Like[]>;
}

export class DatabaseStorage implements IStorage {
  async getAdminByUsername(username: string): Promise<Admin | undefined> {
    const [admin] = await db.select().from(admins).where(eq(admins.username, username));
    return admin;
  }

  async getAdminById(id: string): Promise<Admin | undefined> {
    const [admin] = await db.select().from(admins).where(eq(admins.id, id));
    return admin;
  }

  async createAdmin(admin: InsertAdmin): Promise<Admin> {
    const hashedPassword = await bcrypt.hash(admin.password, 10);
    const [created] = await db.insert(admins).values({ ...admin, password: hashedPassword }).returning();
    return created;
  }

  async getAdminCount(): Promise<number> {
    const [result] = await db.select({ count: count() }).from(admins);
    return result.count;
  }

  async updateAdmin(id: string, data: Partial<{ username: string; password: string; profilePicture: string | null }>): Promise<Admin | undefined> {
    const updateData: Record<string, any> = {};
    if (data.username !== undefined) updateData.username = data.username;
    if (data.password !== undefined) updateData.password = await bcrypt.hash(data.password, 10);
    if (data.profilePicture !== undefined) updateData.profilePicture = data.profilePicture;

    if (Object.keys(updateData).length === 0) return this.getAdminById(id);

    const [updated] = await db.update(admins).set(updateData).where(eq(admins.id, id)).returning();
    return updated;
  }

  async createImage(image: InsertImage): Promise<Image> {
    const [created] = await db.insert(images).values(image).returning();
    return created;
  }

  async getImages(): Promise<ImageWithLikes[]> {
    const allImages = await db.select().from(images).orderBy(images.createdAt);
    const result: ImageWithLikes[] = [];

    for (const img of allImages) {
      const [likeResult] = await db.select({ count: count() }).from(likes).where(eq(likes.imageId, img.id));
      const admin = await this.getAdminById(img.uploadedBy);
      result.push({
        ...img,
        likeCount: likeResult.count,
        uploaderUsername: admin?.username,
        uploaderProfilePicture: admin?.profilePicture,
      });
    }

    return result;
  }

  async getImageById(id: string): Promise<Image | undefined> {
    const [image] = await db.select().from(images).where(eq(images.id, id));
    return image;
  }

  async deleteImage(id: string): Promise<void> {
    await db.delete(likes).where(eq(likes.imageId, id));
    await db.delete(images).where(eq(images.id, id));
  }

  async createLike(like: InsertLike): Promise<Like> {
    const [created] = await db.insert(likes).values(like).returning();
    return created;
  }

  async getLikeByEmail(email: string): Promise<Like | undefined> {
    const [existing] = await db.select().from(likes).where(eq(likes.email, email));
    return existing;
  }

  async getLikeByImageAndEmail(imageId: string, email: string): Promise<Like | undefined> {
    const [existing] = await db.select().from(likes).where(
      and(eq(likes.imageId, imageId), eq(likes.email, email))
    );
    return existing;
  }

  async getLikesByImageId(imageId: string): Promise<Like[]> {
    return await db.select().from(likes).where(eq(likes.imageId, imageId)).orderBy(likes.createdAt);
  }
}

export const storage = new DatabaseStorage();
