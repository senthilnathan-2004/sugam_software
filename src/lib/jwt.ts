import jwt, { SignOptions, JwtPayload } from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET ?? 'sugam-hms-secret-dev-key-change-in-production';
const JWT_EXPIRES_IN = '24h';

export interface TokenPayload {
  userId: string;
  email: string;
  role: string;
  name: string;
}

/**
 * Signs a JWT token with the payload.
 */
export function signToken(payload: TokenPayload): string {
  const options: SignOptions = { expiresIn: JWT_EXPIRES_IN };
  return jwt.sign(payload, JWT_SECRET, options);
}

/**
 * Verifies and decodes a JWT token.
 * Returns null if invalid or expired.
 */
export function verifyToken(token: string): (TokenPayload & JwtPayload) | null {
  try {
    return jwt.verify(token, JWT_SECRET) as TokenPayload & JwtPayload;
  } catch {
    return null;
  }
}
