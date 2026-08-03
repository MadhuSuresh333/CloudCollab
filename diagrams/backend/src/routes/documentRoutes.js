import { Router } from 'express';
import {
  createDocument,
  getDocuments,
  getDocument,
  updateDocument,
  deleteDocument,
  addCollaborator,
} from '../controllers/documentController.js';
import { protect } from '../middleware/auth.js';

const router = Router();

// All document routes are protected
router.use(protect);

router.route('/').get(getDocuments).post(createDocument);
router.route('/:id').get(getDocument).put(updateDocument).delete(deleteDocument);
router.post('/:id/collaborators', addCollaborator);

export default router;
