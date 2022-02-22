import express from 'express';
import auth from '../../Middleware/auth';
import adminauth from '../../Middleware/admin_auth';
import { upload } from '../../Middleware/FileUpload';
import {
  verificationviaEmail,
  newCollegeRequest,
  getRequests,
  updateRequest,
  verifyEmail,
  verificationviaId,
} from './requests_controller';

const router = express.Router();

router.post('/verificationviaEmail', auth(), verificationviaEmail);
router.post('/verificationviaId', auth(), upload.single('upload'), verificationviaId);
router.post('/newCollegeRequest', auth(), newCollegeRequest);
router.post('/get', adminauth(), getRequests);
router.post('/update', adminauth(), updateRequest);
router.get('/verifyEmail', verifyEmail);

export default router;
