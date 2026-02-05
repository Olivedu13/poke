import { Router, type IRouter } from 'express';
import { getUserProfile, updateConfig } from '../controllers/user.controller.js';

const router: IRouter = Router();

router.get('/me', getUserProfile);
router.put('/config', updateConfig);

export { router as userRouter };
