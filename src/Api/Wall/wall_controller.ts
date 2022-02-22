import { Response } from 'express';
import { ObjectIdWithErrorHandler } from '../../Mongodb/helpers';
import service from './wall_service';

// export const fetchWallPosts = async (
//     req: any,
//     res: Response
// ) => {
//     try {
//         const { db } = req.app.locals;
//         let posts = await service.sendOTP(db, req.body.number)
//         res.status(200).send({
//             message: 'Post retrived',
//             data: posts
//         })
//     }
//     catch (e: any) {
//         console.log(e)
//         res.status(e.status || 500).send({
//             status: e.status || 500,
//             code: e.status ? e.code : 'UNKNOWN_ERROR',
//             error: e.status ? e.message : 'Something went wrong'
//         });
//     }
// }

export const createPost = async (req: any, res: Response) => {
  try {
    const { db } = req.app.locals;
    await service.createPost(db, req.body, req.user._id, req.file);
    res.status(200).send({
      message: 'Post created',
    });
  } catch (e: any) {
    console.log(e);
    res.status(e.status || 500).send({
      status: e.status || 500,
      code: e.status ? e.code : 'UNKNOWN_ERROR',
      error: e.status ? e.message : 'Something went wrong',
    });
  }
};

export const createChallenge = async (req: any, res: Response) => {
  try {
    const { db } = req.app.locals;
    await service.createChallenge(db, req.body, req.user._id, req.file);
    res.status(200).send({
      message: 'Post created',
    });
  } catch (e: any) {
    console.log(e);
    res.status(e.status || 500).send({
      status: e.status || 500,
      code: e.status ? e.code : 'UNKNOWN_ERROR',
      error: e.status ? e.message : 'Something went wrong',
    });
  }
};

export const deletePost = async (req: any, res: Response) => {
  try {
    const { db } = req.app.locals;
    await service.deletePost(db, req.user._id, ObjectIdWithErrorHandler(req.query.id));
    res.status(200).send({
      message: 'Post deleted',
    });
  } catch (e: any) {
    console.log(e);
    res.status(e.status || 500).send({
      status: e.status || 500,
      code: e.status ? e.code : 'UNKNOWN_ERROR',
      error: e.status ? e.message : 'Something went wrong',
    });
  }
};

export const likePost = async (req: any, res: Response) => {
  try {
    const { db } = req.app.locals;
    await service.likePost(db, req.user._id, ObjectIdWithErrorHandler(req.query.id));
    res.status(200).send({
      message: 'Post Liked',
    });
  } catch (e: any) {
    console.log(e);
    res.status(e.status || 500).send({
      status: e.status || 500,
      code: e.status ? e.code : 'UNKNOWN_ERROR',
      error: e.status ? e.message : 'Something went wrong',
    });
  }
};

export const addComment = async (req: any, res: Response) => {
  try {
    const { db } = req.app.locals;
    await service.addComment(db, req.user._id, req.body);
    res.status(200).send({
      message: 'Comment Added',
    });
  } catch (e: any) {
    console.log(e);
    res.status(e.status || 500).send({
      status: e.status || 500,
      code: e.status ? e.code : 'UNKNOWN_ERROR',
      error: e.status ? e.message : 'Something went wrong',
    });
  }
};

export const editComment = async (req: any, res: Response) => {
  try {
    const { db } = req.app.locals;
    await service.editComment(db, req.user._id, req.body);
    res.status(200).send({
      message: 'Comment Edited',
    });
  } catch (e: any) {
    console.log(e);
    res.status(e.status || 500).send({
      status: e.status || 500,
      code: e.status ? e.code : 'UNKNOWN_ERROR',
      error: e.status ? e.message : 'Something went wrong',
    });
  }
};

export const deleteComment = async (req: any, res: Response) => {
  try {
    const { db } = req.app.locals;
    await service.deleteComment(db, req.user._id, ObjectIdWithErrorHandler(req.query.postId), parseInt(req.query.commentId));
    res.status(200).send({
      message: 'Comment Deleted',
    });
  } catch (e: any) {
    console.log(e);
    res.status(e.status || 500).send({
      status: e.status || 500,
      code: e.status ? e.code : 'UNKNOWN_ERROR',
      error: e.status ? e.message : 'Something went wrong',
    });
  }
};

export const addCommentThread = async (req: any, res: Response) => {
  try {
    const { db } = req.app.locals;
    await service.addCommentThread(db, req.user._id, req.body);
    res.status(200).send({
      message: 'Comment Thread Added',
    });
  } catch (e: any) {
    console.log(e);
    res.status(e.status || 500).send({
      status: e.status || 500,
      code: e.status ? e.code : 'UNKNOWN_ERROR',
      error: e.status ? e.message : 'Something went wrong',
    });
  }
};

export const editCommentThread = async (req: any, res: Response) => {
  try {
    const { db } = req.app.locals;
    await service.editCommentThread(db, req.user._id, req.body);
    res.status(200).send({
      message: 'Comment Thread Edited',
    });
  } catch (e: any) {
    console.log(e);
    res.status(e.status || 500).send({
      status: e.status || 500,
      code: e.status ? e.code : 'UNKNOWN_ERROR',
      error: e.status ? e.message : 'Something went wrong',
    });
  }
};

export const deleteCommentThread = async (req: any, res: Response) => {
  try {
    const { db } = req.app.locals;
    await service.deleteCommentThread(
      db,
      req.user._id,
      ObjectIdWithErrorHandler(req.query.postId),
      parseInt(req.query.commentId),
      parseInt(req.query.threadCommentId)
    );
    res.status(200).send({
      message: 'Comment Thread Deleted',
    });
  } catch (e: any) {
    console.log(e);
    res.status(e.status || 500).send({
      status: e.status || 500,
      code: e.status ? e.code : 'UNKNOWN_ERROR',
      error: e.status ? e.message : 'Something went wrong',
    });
  }
};
