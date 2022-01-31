import express from 'express';
import auth from '../../Middleware/auth';
import {
    sendOTP,
    verifyOTP,
    resendOTP,
    setPassword,
    resetPasswordOTP,
    login,
    verify
} from './users_controller'

const router = express.Router();

router.get('/verify',auth(),verify)
router.post('/sendOTP', sendOTP);
router.post('/verifyOTP',verifyOTP);
router.post('/resendOTP',resendOTP);
router.post('/resetPasswordOTP',resetPasswordOTP);
router.post('/setPassword',setPassword);
router.post('/login',login)


export default router;
