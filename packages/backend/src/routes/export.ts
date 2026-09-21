import { Router } from 'express';
import { authMiddleware, premiumMiddleware, type AuthRequest } from '../middleware/auth';

export const exportRouter = Router();
exportRouter.use(authMiddleware);
exportRouter.use(premiumMiddleware);

exportRouter.get('/:format', async (req: AuthRequest, res) => {
  const { format } = req.params;
  const projectId = req.query.project_id as string;

  res.json({
    data: {
      format,
      project_id: projectId,
      status: 'ready',
      message: `Exportación a ${format} lista. La generación del archivo se completará en la siguiente fase.`,
    },
    error: null,
  });
});
