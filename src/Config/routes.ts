import express from 'express';
import users from '../Api/Users/users_route'

const router = express.Router();

router.use('/users', users);

export default router;