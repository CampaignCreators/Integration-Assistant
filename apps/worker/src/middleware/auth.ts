import type { NextFunction, Request, Response } from "express";
import type { UserRole } from "@cc/shared";
import { supabase } from "../lib/supabase.js";

export interface AuthedUser {
  id: string;
  email: string;
  role: UserRole;
}

declare module "express-serve-static-core" {
  interface Request {
    user?: AuthedUser;
  }
}

/**
 * Verifies the Supabase session JWT sent by the Next.js app as a Bearer token
 * and attaches the internal user (with role) to the request.
 */
export async function requireAuth(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  const header = req.headers.authorization;
  const token = header?.startsWith("Bearer ") ? header.slice(7) : undefined;
  if (!token) {
    res.status(401).json({ error: "Missing bearer token" });
    return;
  }

  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data.user) {
    res.status(401).json({ error: "Invalid or expired session" });
    return;
  }

  const { data: profile, error: profileError } = await supabase
    .from("users")
    .select("id, email, role")
    .eq("id", data.user.id)
    .single();
  if (profileError || !profile) {
    res.status(403).json({ error: "No internal user profile" });
    return;
  }

  req.user = profile as AuthedUser;
  next();
}

export function isElevated(user: AuthedUser): boolean {
  return user.role === "reviewer" || user.role === "admin";
}

/** Gate for the admin surface: user management, settings, org-wide usage. */
export function requireAdmin(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  if (req.user?.role !== "admin") {
    res.status(403).json({ error: "Admin access required" });
    return;
  }
  next();
}
