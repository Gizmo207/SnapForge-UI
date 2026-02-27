import type { Request, Response, NextFunction } from 'express';
import { clearSessionCookie, getSessionTokensFromRequest, getUserFromSessionToken, type AuthUser } from './authService.js';

export type RequestWithAuth = Request & {
  authUser?: AuthUser;
  sessionToken?: string;
};

export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  try {
    const sessionTokens = getSessionTokensFromRequest(req);
    if (sessionTokens.length === 0) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }

    let sessionToken: string | undefined;
    let user: AuthUser | null = null;

    // Prefer the latest cookie value when duplicates exist.
    for (let i = sessionTokens.length - 1; i >= 0; i -= 1) {
      const candidate = sessionTokens[i];
      const resolvedUser = await getUserFromSessionToken(candidate);
      if (resolvedUser) {
        sessionToken = candidate;
        user = resolvedUser;
        break;
      }
    }

    if (!user) {
      clearSessionCookie(res);
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }

    const request = req as RequestWithAuth;
    request.authUser = user;
    request.sessionToken = sessionToken;
    next();
  } catch (err: unknown) {
    res.status(500).json({
      success: false,
      message: err instanceof Error ? err.message : 'Auth check failed',
    });
  }
}
