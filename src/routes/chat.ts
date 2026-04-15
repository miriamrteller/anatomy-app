import { Router } from 'express';
import { asyncHandler } from '../middleware/asyncHandler';
import { chat } from '../controllers/chatController';

const router = Router();

/**
 * POST /api/chat
 *
 * Accepts a question and returns an SSE stream of tokens
 * Also sends source structure IDs for frontend highlighting
 *
 * Request body:
 * {
 *   "question": "What is the femur?"
 * }
 *
 * Response: Event stream with events:
 * - "sources": Array of structure IDs used as context
 * - "token": Individual response tokens (streamed)
 * - "done": Signals stream completion
 * - "error": If something goes wrong
 */
router.post('/chat', asyncHandler(chat));

export default router;
