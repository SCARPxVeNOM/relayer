/**
 * Session API - Mission Control Session Management
 * 
 * This endpoint manages control sessions.
 * No blockchain actions - just session state.
 */

import { createLogger } from '../utils/logger.js';
import { sendJson } from './http.js';

const logger = createLogger("SessionAPI");

const activeSessions = new Map(); // In-memory session store

/**
 * POST /api/session/init
 * Initialize control session
 * 
 * Marks control session as active.
 * No blockchain action - just session management.
 */
export async function initSession(req, res) {
  try {
    // Generate session ID
    const sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Store session
    activeSessions.set(sessionId, {
      sessionId,
      active: true,
      createdAt: Date.now(),
    });

    logger.info('Session initialized', { sessionId });

    sendJson(res, 200, { sessionId, active: true });
  } catch (error) {
    logger.error('Failed to initialize session', error);
    sendJson(res, 500, { error: error?.message || 'Internal server error' });
  }
}

/**
 * GET /api/session/:sessionId
 * Get session status
 */
export async function getSession(req, res) {
  try {
    // Not currently wired; kept for future use.
    const sessionId = null;
    const session = activeSessions.get(sessionId);
    
    if (!session) {
      sendJson(res, 404, { error: 'Session not found' });
      return;
    }

    sendJson(res, 200, session);
  } catch (error) {
    logger.error('Failed to get session', error);
    sendJson(res, 500, { error: error?.message || 'Internal server error' });
  }
}

