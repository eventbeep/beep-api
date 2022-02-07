import express from "express";
import adminauth from "../../Middleware/admin_auth";
import {
    login
} from './admin_users_controller'

const router = express.Router();

router.post('/login',login);


export default router