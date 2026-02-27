import type { Request, Response, NextFunction } from 'express';
import { clearSessionCookie, getSessionTokensFromRequest, getUserFromSessionTokens, type AuthUser } from './authService.js';

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

    const resolvedSession = await getUserFromSessionTokens(sessionTokens);
    const user: AuthUser | null = resolvedSession?.user ?? null;
    const sessionToken = resolvedSession?.sessionToken;

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
