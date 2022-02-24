import express from 'express';
import auth from '../../Middleware/auth';
import { upload } from '../../Middleware/FileUpload';
import {
  createPost,
  createChallenge,
  deletePost,
  likePost,
  addComment,
  addCommentThread,
  editComment,
  deleteComment,
  editCommentThread,
  deleteCommentThread,
} from './wall_controller';

const router = express.Router();

router.get('/', auth());
router.post('/createPost', auth(), upload.single('upload'), createPost);
router.post('/createChallenge', auth(), upload.single('upload'), createChallenge);
router.get('/trendingChallenges', auth());
router.delete('/post', auth(), deletePost);
router.post('/like', auth(), likePost);
router.delete('/like', auth());
router.post('/comment', auth(), addComment);
router.delete('/comment', auth(), deleteComment);
router.put('/comment', auth(), editComment);
router.post('/commentThread', auth(), addCommentThread);
router.delete('/commentThread', auth(), deleteCommentThread);
router.put('/commentThread', auth(), editCommentThread);

export default router;
