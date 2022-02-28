import { Db, ObjectId } from 'mongodb';
import envVars from '../../Config/envconfig';
import { COL } from '../../Mongodb/Collections';
import aws from 'aws-sdk';
import { ObjectIdWithErrorHandler } from '../../Mongodb/helpers';
import moment from 'moment';

const fetchWallPosts = async (db: Db, userId: ObjectId, index: number) => {
  let resp: any = {
    posts: [],
    next: true,
  };
  const following = await db
    .collection(COL.Followers)
    .aggregate([
      { $match: { follower: userId } },
      {
        $group: {
          _id: { follower: '$follower' },
          Users: { $push: '$User' },
        },
      },
    ])
    .toArray();

  const posts = await db
    .collection(COL.Posts)
    .aggregate([{ $match: { createdBy: { $in: following[0].Users } } }, { $skip: index }, { $limit: 10 }])
    .toArray();

  const totalposts = await db.collection(COL.PostComments).countDocuments({ createdBy: { $in: following[0].Users } });
  if (index + 10 >= totalposts) {
    resp.next = false;
  }
  for (let index = 0; index < posts.length; index++) {
    let post = posts[index];
    let postLikes: any = await db
      .collection(COL.PostCounts)
      .findOne({ id: post._id.toString() + '_Likes' }, { projection: { count: 1 } });
    let postComment: any = await db
      .collection(COL.PostCounts)
      .findOne({ id: post._id.toString() + '_Comments' }, { projection: { count: 1 } });
    let postShares: any = await db
      .collection(COL.PostCounts)
      .findOne({ id: post._id.toString() + '_Share' }, { projection: { count: 1 } });
    post['Likes'] = postLikes.count;
    post['Comments'] = postComment.count;
    post['Shares'] = postShares.count;
    post['Liked'] = false;
    if (await db.collection(COL.PostLikes).findOne({ postId: post._id, likedBy: userId })) {
      post['Liked'] = true;
    }
  }
  resp.posts = posts;
  return resp;
};

const createPost = async (db: Db, body: any, userId: ObjectId, file: any) => {
  const post = await db.collection(COL.Posts).insertOne({
    type: 'Post',
    createdBy: userId,
    title: body.title,
    timeStamp: moment().format(),
    status: 'Active',
  });

  await db.collection(COL.PostCounts).insertOne({
    id: post.insertedId.toString() + '_Likes',
    count: 0,
  });
  await db.collection(COL.PostCounts).insertOne({
    id: post.insertedId.toString() + '_Comments',
    count: 0,
  });
  await db.collection(COL.PostCounts).insertOne({
    id: post.insertedId.toString() + '_Share',
    count: 0,
  });

  if (file) {
    const s3 = new aws.S3({
      accessKeyId: envVars.AWS_ACCESS_KEY,
      secretAccessKey: envVars.AWS_SECRET_ACCESS_KEY,
      signatureVersion: 'v4',
    });
    let fileext: any = file.originalname.split('.');
    fileext = fileext[fileext.length - 1];
    const params = {
      Bucket: 'beepapi',
      Key: post.insertedId.toString() + '.' + fileext,
      Body: file.buffer,
    };
    try {
      await new Promise<void>((resolve, reject) => {
        s3.upload(params, function (s3Err: any, data: any) {
          if (s3Err) {
            reject({
              status: 500,
              code: 'Image upload error',
              message: 'Could not  upload the image please try again later.',
            });
          } else {
            db.collection(COL.Posts).findOneAndUpdate(
              { _id: post.insertedId },
              { $set: { file: post.insertedId.toString() + '.' + fileext } }
            );
            resolve();
          }
        });
      });
    } catch (e) {
      throw e;
    }
  }
};

const createChallenge = async (db: Db, body: any, userId: ObjectId, file: any) => {
  const post = await db.collection(COL.Posts).insertOne({
    type: 'Challenge',
    createdBy: userId,
    title: body.title,
    timeStamp: moment().format(),
    status: 'Active',
    challengeName: body.challengeName,
  });

  await db.collection(COL.PostCounts).insertOne({
    id: post.insertedId.toString() + '_Likes',
    count: 0,
  });
  await db.collection(COL.PostCounts).insertOne({
    id: post.insertedId.toString() + '_Comments',
    count: 0,
  });
  await db.collection(COL.PostCounts).insertOne({
    id: post.insertedId.toString() + '_Share',
    count: 0,
  });

  const existingChallenge = await db
    .collection(COL.ChallengeInfo)
    .findOne({ challengeName: body.challengeName.toLowerCase() }, { projection: { _id: 1 } });

  if (existingChallenge) {
    await db
      .collection(COL.ChallengeInfo)
      .findOneAndUpdate({ challengeName: body.challengeName.toLowerCase() }, { $set: { count: 1 } });
  } else {
    await db.collection(COL.ChallengeInfo).insertOne({
      challengeName: body.challengeName.toLowerCase(),
      count: 1,
      topPerformer: [],
    });
  }

  if (file) {
    const s3 = new aws.S3({
      accessKeyId: envVars.AWS_ACCESS_KEY,
      secretAccessKey: envVars.AWS_SECRET_ACCESS_KEY,
      signatureVersion: 'v4',
    });
    let fileext: any = file.originalname.split('.');
    fileext = fileext[fileext.length - 1];
    const params = {
      Bucket: 'beepapi',
      Key: post.insertedId.toString() + '.' + fileext,
      Body: file.buffer,
    };
    try {
      await new Promise<void>((resolve, reject) => {
        s3.upload(params, function (s3Err: any, data: any) {
          if (s3Err) {
            reject({
              status: 500,
              code: 'Image upload error',
              message: 'Could not  upload the image please try again later.',
            });
          } else {
            db.collection(COL.Posts).findOneAndUpdate(
              { _id: post.insertedId },
              { $set: { file: post.insertedId.toString() + '.' + fileext } }
            );
            resolve();
          }
        });
      });
    } catch (e) {
      throw e;
    }
  }
};

const deletePost = async (db: Db, userId: ObjectId, postId: ObjectId) => {
  const postInfo: any = await db
    .collection(COL.Posts)
    .findOne({ _id: postId }, { projection: { _id: 0, type: 1, challengeName: 1 } });

  await db.collection(COL.Posts).updateOne({ _id: postId }, { $set: { status: 'Deleted' } });
  await db.collection(COL.PostComments).findOneAndDelete({ postId: postId });

  if (postInfo.type === 'Challenge') {
    const challengeInfo: any = await db.collection(COL.ChallengeInfo).findOne({
      challengeName: postInfo.challengeName.toLowerCase(),
    });

    if (challengeInfo.count === 1) {
      await db.collection(COL.ChallengeInfo).findOneAndDelete({ _id: challengeInfo._id });
    } else {
      let toDelete: any = null;
      for (let index = 0; index < challengeInfo.topPerformer.length; index++) {
        if (challengeInfo.topPerformer[index]['userId'].toString() === userId.toString()) {
          toDelete = challengeInfo.topPerformer[index];
          break;
        }
      }

      if (toDelete) {
        let toAdd: any = await db
          .collection(COL.Posts)
          .find({ type: 'Challenge', challengeName: postInfo.challengeName })
          .sort({ likesCount: 1 })
          .skip(2)
          .limit(1)
          .toArray();

        await db.collection(COL.ChallengeInfo).updateOne(
          { _id: challengeInfo._id },
          {
            $set: { count: challengeInfo.count - 1 },
            $pull: { topPerformer: toDelete },
            $push: { topPerformer: { userId: toAdd.createdBy, likes: toAdd.likesCount } },
          }
        );
      } else {
        await db
          .collection(COL.ChallengeInfo)
          .updateOne({ _id: challengeInfo._id }, { $set: { count: challengeInfo.count - 1 } });
      }
    }
  }
};

const likePost = async (db: Db, userId: ObjectId, postId: ObjectId) => {
  let postCounts: any = await db.collection(COL.PostCounts).findOne({ id: postId.toString() + '_Likes' });
  let postInfo: any = await db.collection(COL.Posts).findOne({ _id: postId }, { projection: { type: 1, challengeName: 1 } });
  await db.collection(COL.PostCounts).updateOne({ _id: postCounts._id }, { $set: { count: postCounts.count + 1 } });

  await db.collection(COL.PostLikes).insertOne({
    postId: postId,
    likedBy: userId,
    timeStamp: moment().format(),
  });

  if (postInfo.type === 'Challenge') {
    const challengeInfo: any = await db.collection(COL.ChallengeInfo).findOne({
      challengeName: postInfo.challengeName.toLowerCase(),
    });

    if (challengeInfo.topPerformer.length < 3) {
      await db
        .collection(COL.ChallengeInfo)
        .updateOne({ _id: challengeInfo._id }, { $push: { topPerformer: { userId: userId, likes: postCounts.count + 1 } } });
    } else {
      let toDelete: any = null;
      challengeInfo.topPerformer.sort((a: any, b: any) => {
        return a.likes - b.likes;
      });
      for (let index = 0; index < challengeInfo.topPerformer.length; index++) {
        if (challengeInfo.topPerformer[index]['likes'] < postCounts.count + 1) {
          toDelete = challengeInfo.topPerformer[index];
          break;
        }
      }

      if (toDelete) {
        await db.collection(COL.ChallengeInfo).updateOne({ _id: challengeInfo._id }, { $pull: { topPerformer: toDelete } });
        await db
          .collection(COL.ChallengeInfo)
          .updateOne(
            { _id: challengeInfo._id },
            { $push: { topPerformer: { userId: userId, likes: postCounts.count + 1 } } }
          );
      }
    }
  }
};

const addComment = async (db: Db, userId: ObjectId, body: any) => {
  await db.collection(COL.PostComments).insertOne({
    postId: ObjectIdWithErrorHandler(body.postId),
    commentedBy: userId,
    comment: body.comment,
    timeStamp: moment().format(),
    parentComment: body.parentComment,
  });
  if (!body.parentComment) {
    await db.collection(COL.PostCounts).updateOne({ id: body.postId + '_Comments' }, { $inc: { count: 1 } });
  }
};

const editComment = async (db: Db, userId: ObjectId, body: any) => {
  let postComment: any = await db
    .collection(COL.PostComments)
    .findOne({ _id: ObjectIdWithErrorHandler(body.commentId) }, { projection: { _id: 1, comment: 1, commentedBy: 1 } });

  if (postComment.commentedBy.toString() === userId.toString()) {
    await db
      .collection(COL.PostComments)
      .updateOne({ _id: postComment._id }, { $set: { updatedAt: moment().format(), comment: body.comment } });
  } else {
    throw {
      status: 400,
      code: 'Edit Permission Denied',
      message: 'User cannot edit this comment as this was not added by him',
    };
  }
};

const deleteComment = async (db: Db, userId: ObjectId, postId: string, commentId: ObjectId) => {
  let postComment: any = await db
    .collection(COL.PostComments)
    .findOne({ _id: commentId }, { projection: { commentedBy: 1, parentComment: 1 } });
  if (postComment.commentedBy.toString() === userId.toString()) {
    await db.collection(COL.PostComments).deleteOne({ _id: commentId });
    if (!postComment.parentComment) {
      await db.collection(COL.PostCounts).updateOne({ id: postId + '_Comments' }, { $inc: { count: -1 } });
    }
  } else {
    throw {
      status: 400,
      code: 'Delete Permission Denied',
      message: 'User cannot delete this comment as this was not added by him',
    };
  }
};

export default {
  fetchWallPosts,
  createPost,
  createChallenge,
  deletePost,
  likePost,
  addComment,
  editComment,
  deleteComment,
};
