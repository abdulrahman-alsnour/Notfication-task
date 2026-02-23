import bcrypt from "bcryptjs";
import {
  createToken,
  verifyToken,
  getAuthCookieName,
  getAuthCookieOptions,
} from "./jwt";

const SALT_ROUNDS = 10;

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

export async function verifyPassword(
  password: string,
  hash: string
): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export {
  createToken,
  verifyToken,
  getAuthCookieName,
  getAuthCookieOptions,
};
