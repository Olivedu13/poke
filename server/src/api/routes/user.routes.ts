import { Router, type IRouter } from 'express';
import { getUserProfile } from '../controllers/user.controller.js';

const router: IRouter = Router();

router.get('/me', getUserProfile);

export { router as userRouter };
