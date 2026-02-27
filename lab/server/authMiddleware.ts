import type { Request, Response, NextFunction } from 'express';
import { clearSessionCookie, getUserFromSessionToken, SESSION_COOKIE_NAME, type AuthUser } from './authService.js';

export type RequestWithAuth = Request & {
  authUser?: AuthUser;
  sessionToken?: string;
};

export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  try {
    const sessionToken = req.cookies?.[SESSION_COOKIE_NAME] as string | undefined;
    if (!sessionToken) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }

    const user = await getUserFromSessionToken(sessionToken);
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

