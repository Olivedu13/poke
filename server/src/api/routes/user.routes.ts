import { Router, type IRouter } from 'express';
import { authMiddleware } from '../middleware/auth.middleware.js';
import { getUserProfile, updateConfig } from '../controllers/user.controller.js';

const router: IRouter = Router();

router.get('/me', authMiddleware, getUserProfile);
router.put('/config', authMiddleware, updateConfig);

export { router as userRouter };
