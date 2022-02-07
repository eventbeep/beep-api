import express from 'express';
import auth from '../../Middleware/auth';
import {
    sendOTP,
    verifyOTP,
    resendOTP,
    setPassword,
    resetPasswordOTP,
    login,
    verify,
    updatePersonalInfo,
    fetchPersonalInfo,
    updateCollegeInfo,
    fetchCollegeInfo
} from './users_controller'

const router = express.Router();

router.get('/verify',auth(),verify)
router.post('/sendOTP', sendOTP);
router.post('/verifyOTP',verifyOTP);
router.post('/resendOTP',resendOTP);
router.post('/resetPasswordOTP',resetPasswordOTP);
router.post('/setPassword',setPassword);
router.post('/login',login);
router.post('/personalInfo',auth(),updatePersonalInfo);
router.get('/personalInfo',auth(),fetchPersonalInfo);
router.post('/collegeInfo',auth(),updateCollegeInfo);
router.get('/collegeInfo',auth(),fetchCollegeInfo)

export default router;
