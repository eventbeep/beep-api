import express from 'express';
import auth from '../../Middleware/auth';
import {
    sendOTP,
    verifyOTP,
    resendOTP,
    verify,
    updatePersonalInfo,
    fetchPersonalInfo,
    updateCollegeInfo,
    fetchCollegeInfo,
    followUser,
    unFollowUser,
    fetchUserInfo
} from './users_controller'

const router = express.Router();

router.get('/verify',auth(),verify)
router.post('/sendOTP', sendOTP);
router.post('/verifyOTP',verifyOTP);
router.post('/resendOTP',resendOTP)
router.post('/personalInfo',auth(),updatePersonalInfo);
router.get('/personalInfo',auth(),fetchPersonalInfo);
router.post('/collegeInfo',auth(),updateCollegeInfo);
router.get('/collegeInfo',auth(),fetchCollegeInfo)
router.get('/follow',auth(),followUser)
router.get('/unfollow',auth(),unFollowUser)
router.get('/UserInfo',auth(),fetchUserInfo)

export default router;
