import express from 'express';
import users from '../Api/Users/users_route'
import requests from '../Api/Requests/requests_route'
import adminroutes from '../Api/Admin Users/admin_users_router'

const router = express.Router();

router.use('/users', users);
router.use('/requests',requests)
router.use('/admin-users',adminroutes)

export default router;