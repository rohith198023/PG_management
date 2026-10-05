import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { UserRole } from '@prisma/client'

function getSecret(name: string, fallbackDev: string): string {
  const secret = process.env[name]
  if (!secret) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error(`FATAL: ${name} environment variable must be set in production!`)
    }
    return fallbackDev
  }
  return secret
}

const JWT_SECRET = getSecret('JWT_SECRET', 'super-secret-jwt-token-key-change-this-in-production-32chars')
const REFRESH_TOKEN_SECRET = getSecret('REFRESH_TOKEN_SECRET', 'super-secret-refresh-token-key-change-this-in-production-32chars')

export interface JWTPayload {
  userId: string
  email: string
  role: UserRole
  workspaceId: string
}


export async function hashPassword(password: string): Promise<string> {
  const salt = await bcrypt.genSalt(12)
  return bcrypt.hash(password, salt)
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash)
}

export function signAccessToken(payload: JWTPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '1d' })
}

export function signRefreshToken(payload: JWTPayload): string {
  return jwt.sign(payload, REFRESH_TOKEN_SECRET, { expiresIn: '7d' })
}

export function verifyAccessToken(token: string): JWTPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as JWTPayload
  } catch (error) {
    return null
  }
}

export function verifyRefreshToken(token: string): JWTPayload | null {
  try {
    return jwt.verify(token, REFRESH_TOKEN_SECRET) as JWTPayload
  } catch (error) {
    return null
  }
}
