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
  if (following.length > 0) {
    const posts = await db
      .collection(COL.Posts)
      .aggregate([
        { $match: { createdBy: { $in: following[0].Users }, status: 'Active' } },
        { $sort: { _id: -1 } },
        { $skip: index },
        { $limit: 10 },
        {
          $lookup: {
            from: COL.ChallengeInfo,
            localField: 'challengeName',
            foreignField: 'challengeName',
            as: 'challengeInfo',
          },
        },
        {
          $lookup: {
            from: COL.Users,
            localField: 'createdBy',
            foreignField: '_id',
            as: 'userInfo',
          },
        },
        {
          $addFields: {
            likes_to_finish: '$ChallengeInfo.likes_to_finish',
          },
        },
        {
          $project: {
            _id: 1,
            type: 1,
            title: 1,
            timeStamp: 1,
            challengeName: 1,
            challengeInfo: 1,
            'userInfo._id': 1,
            'userInfo.personalInfo.name': 1,
            'userInfo.personalInfo.avatar': 1,
          },
        },
      ])
      .toArray();

    const totalposts = await db.collection(COL.PostComments).countDocuments({ createdBy: { $in: following[0].Users } });
    if (index + 10 >= totalposts) {
      resp.next = false;
    }
    for (let index = 0; index < posts.length; index++) {
      let post = posts[index];
      if (post.challengeInfo.length > 0) {
        post['likes_to_finish'] = post.challengeInfo[0]['likes_to_finish'];
        post['tags'] = post.challengeInfo[0]['tags'];
      }
      delete post.challengeInfo;
      post['userInfo'] = post.userInfo[0];

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
  }
  return {
    next: false,
    posts: [],
  };
};

const fetchMyPosts = async (db: Db, userId: ObjectId, index: number) => {
  let resp: any = {
    posts: [],
    next: true,
  };

  const userInfo = await db
    .collection(COL.Users)
    .aggregate([
      { $match: { _id: userId } },
      {
        $lookup: {
          from: COL.Colleges,
          localField: 'collegeInfo.collegeId',
          foreignField: '_id',
          as: 'collegeDetails',
        },
      },
      { $project: { _id: 1, personalInfo: 1, collegeInfo: 1, collegeDetails: 1 } },
    ])
    .toArray();
  if(userInfo[0]['collegeDetails'].length>0){
    userInfo[0]['collegeInfo']['collegeName']=userInfo[0]['collegeDetails'][0]['collegeName']
    userInfo[0]['collegeInfo']['alias']=userInfo[0]['collegeDetails'][0]['alias']
    
  }
  delete userInfo[0]['collegeDetails']
  resp = { ...resp, ...userInfo[0] };
  const posts = await db
    .collection(COL.Posts)
    .aggregate([
      { $match: { createdBy: userId, status: 'Active' } },
      { $sort: { _id: -1 } },
      { $skip: index },
      { $limit: 10 },
      {
        $lookup: {
          from: COL.ChallengeInfo,
          localField: 'challengeName',
          foreignField: 'challengeName',
          as: 'challengeInfo',
        },
      },
      {
        $project: {
          _id: 1,
          type: 1,
          title: 1,
          timeStamp: 1,
          challengeName: 1,
          challengeInfo: 1,
          'userInfo._id': 1,
          'userInfo.personalInfo.name': 1,
          'userInfo.personalInfo.avatar': 1,
        },
      },
    ])
    .toArray();

  const totalposts = await db.collection(COL.PostComments).countDocuments({ createdBy: userId });
  if (index + 10 >= totalposts) {
    resp.next = false;
  }
  for (let index = 0; index < posts.length; index++) {
    let post = posts[index];
    if (post.challengeInfo.length > 0) {
      post['likes_to_finish'] = post.challengeInfo[0]['likes_to_finish'];
      post['tags'] = post.challengeInfo[0]['tags'];
    }
    delete post.challengeInfo;

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
  const existingChallenge = await db
    .collection(COL.ChallengeInfo)
    .findOne({ challengeName: body.challengeName }, { projection: { _id: 1, topPerformers: 1 } });

  if (existingChallenge) {
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

    await db
      .collection(COL.ChallengeTopPerformer)
      .findOneAndUpdate({ _id: existingChallenge.topPerformers }, { $inc: { count: 1 } });
  } else {
    throw {
      status: 400,
      code: 'No such challenge',
      message: `Challenge with challenge name ${body.challengeName} does not exist`,
    };
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
      challengeName: postInfo.challengeName,
    });

    const topPerformers: any = await db.collection(COL.ChallengeTopPerformer).findOne({
      _id: challengeInfo.topPerformers,
    });

    let toDelete: any = null;
    for (let index = 0; index < topPerformers.topPerformer.length; index++) {
      if (topPerformers.topPerformer[index]['userId'].toString() === userId.toString()) {
        toDelete = topPerformers.topPerformer[index];
        break;
      }
    }

    if (toDelete) {
      let toAdd: any = await db
        .collection(COL.Posts)
        .find({ type: 'Challenge', challengeName: postInfo.challengeName, status: { $ne: 'Deleted' } })
        .sort({ likesCount: 1 })
        .skip(2)
        .limit(1)
        .toArray();

      await db.collection(COL.ChallengeTopPerformer).updateOne(
        { _id: topPerformers._id },
        {
          $inc: { count: -1 },
          $pull: { topPerformer: toDelete },
        }
      );
      if (toAdd.length > 0) {
        await db.collection(COL.ChallengeTopPerformer).updateOne(
          { _id: topPerformers._id },
          {
            $push: { topPerformer: { userId: toAdd[0].createdBy, likes: toAdd[0].likesCount } },
          }
        );
      }
    } else {
      await db.collection(COL.ChallengeTopPerformer).updateOne({ _id: topPerformers._id }, { $inc: { count: -1 } });
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
      challengeName: postInfo.challengeName,
    });

    const topPerformer: any = await db.collection(COL.ChallengeTopPerformer).findOne({ _id: challengeInfo.topPerformers });

    if (topPerformer.topPerformer.length < 3) {
      await db
        .collection(COL.ChallengeTopPerformer)
        .updateOne({ _id: topPerformer._id }, { $push: { topPerformer: { userId: userId, likes: postCounts.count + 1 } } });
    } else {
      let toDelete: any = null;
      topPerformer.topPerformer.sort((a: any, b: any) => {
        return a.likes - b.likes;
      });
      for (let index = 0; index < topPerformer.topPerformer.length; index++) {
        if (topPerformer.topPerformer[index]['likes'] < postCounts.count + 1) {
          toDelete = topPerformer.topPerformer[index];
          break;
        }
      }

      if (toDelete) {
        await db
          .collection(COL.ChallengeTopPerformer)
          .updateOne({ _id: topPerformer._id }, { $pull: { topPerformer: toDelete } });
        await db
          .collection(COL.ChallengeTopPerformer)
          .updateOne(
            { _id: topPerformer._id },
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

const fetchChallenges = async (db: Db, index: number) => {
  let challenges = await db
    .collection(COL.ChallengeInfo)
    .aggregate([
      {
        $lookup: {
          from: COL.ChallengeTopPerformer,
          localField: 'topPerformers',
          foreignField: '_id',
          as: 'ChallengeInfo',
        },
      },
      {
        $lookup: {
          from: COL.Users,
          localField: 'ChallengeInfo.topPerformer.userId',
          foreignField: '_id',
          as: 'topPerformer',
        },
      },
      {
        $sort: { 'ChallengeInfo.count': 1 },
      },
      {
        $skip: index,
      },
      {
        $limit: 10,
      },
      {
        $project: {
          _id: 1,
          challengeName: 1,
          formats: 1,
          likes_to_finish: 1,
          reward: 1,
          tags: 1,
          count: '$ChallengeInfo.count',
          'topPerformer._id': 1,
          'topPerformer.personalInfo.name': 1,
          'topPerformer.personalInfo.avatar': 1,
        },
      },
    ])
    .toArray();
  return challenges;
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
  fetchChallenges,
  fetchMyPosts,
};
