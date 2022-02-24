import express from 'express';
import users from '../Api/Users/users_route';
import requests from '../Api/Requests/requests_route';
import adminroutes from '../Api/Admin Users/admin_users_router';
import wall from '../Api/Wall/wall_route';

const router = express.Router();

router.use('/users', users);
router.use('/requests', requests);
router.use('/admin-users', adminroutes);
router.use('/wall', wall);

export default router;
