import { Db, ObjectId } from 'mongodb';
import { generateOTP, sendSMS } from '../service';
import { COL } from '../../Mongodb/Collections';
import _ from 'lodash';
import jwt from 'jsonwebtoken';
import envVars from '../../Config/envconfig';
import moment from 'moment';
import { ObjectIdWithErrorHandler } from '../../Mongodb/helpers';

const sendOTP = async (db: Db, number: string) => {
  const user = await db.collection(COL.Users).findOne({
    phone_number: number,
  });
  const otp = await generateOTP(4);
  await sendSMS(number, '6210fa7623afcc3d1627edd4', { otp: otp });
  if (user) {
    await db.collection(COL.Users).findOneAndUpdate({ _id: user._id }, { $set: { otp: otp } });
  } else {
    await db.collection(COL.Users).insertOne({
      phone_number: number,
      otp: otp,
      followers: 0,
      following: 0,
      public: false,
      status: 'Personal Info',
      blocked: false,
    });
  }

  return {
    success: true,
    message: 'OTP sent successfully',
  };
};

const verifyOTP = async (db: Db, number: string, otp: string) => {
  const user = await db.collection(COL.Users).findOne({
    phone_number: number,
  });
  if (user) {
    if (otp === user.otp) {
      await db.collection(COL.Users).findOneAndUpdate(
        { _id: user._id },
        {
          $set: {
            token_validity: moment().add(7, 'days').format('MM:DD:YYYY HH:mm:ss:SS'),
          },
        }
      );
      return {
        success: true,
        message: 'OTP Verified',
        token: jwt.sign(JSON.stringify({ _id: user._id }), envVars.AUTH_SECRET),
        user_status: user.status
      };
    } else {
      return {
        success: false,
        message: 'Invalid OTP',
        token: '',
        user_status: ''
      };
    }
  } else {
    return {
      success: false,
      message: `No user with Mobile number ${number} exists}`,
      token: '',
      user_status: ''
    };
  }
};

const resendOTP = async (db: Db, number: string) => {
  const user = await db.collection(COL.Users).findOne({
    phone_number: number,
  });
  if (user) {
    await sendSMS(number, '6210fa7623afcc3d1627edd4', { otp: user.otp });
    return {
      success: true,
      message: 'OTP Resent',
    };
  } else {
    return {
      success: false,
      message: `No user with Mobile number ${number} exists}`,
    };
  }
};

const updatePersonalInfo = async (db: Db, userId: ObjectId, data: any, onboard: boolean) => {
  if (onboard) {
    await db
      .collection(COL.Users)
      .findOneAndUpdate({ _id: userId }, { $set: { personalInfo: data, status: 'College Info' } });
  } else {
    await db.collection(COL.Users).findOneAndUpdate({ _id: userId }, { $set: { personalInfo: data } });
  }

  return 'User Personal Info Updated Successfully';
};

const fetchPersonalInfo = async (db: Db, userId: ObjectId) => {
  const user: any = await db.collection(COL.Users).findOne({ _id: userId }, { projection: { personalInfo: 1 } });

  return user.personalInfo;
};

const updateCollegeInfo = async (db: Db, userId: ObjectId, collegeInfo: any, onboard: boolean) => {
  collegeInfo['collegeId'] = ObjectIdWithErrorHandler(collegeInfo['collegeId']);
  collegeInfo['verified'] = false;
  if (onboard) {
    await db
      .collection(COL.Users)
      .findOneAndUpdate({ _id: userId }, { $set: { collegeInfo: collegeInfo, status: 'College Info Verification' } });
  } else {
    await db.collection(COL.Users).findOneAndUpdate({ _id: userId }, { $set: { collegeInfo: collegeInfo } });
  }
};

const fetchCollegeInfo = async (db: Db, userId: ObjectId) => {
  let collegeInfo: any = await db.collection(COL.Users).findOne({ _id: userId }, { projection: { _id: 0, collegeInfo: 1 } });
  if(collegeInfo['collegeInfo']){
    collegeInfo = collegeInfo['collegeInfo'];
    if (collegeInfo['requestId']) {
      let request: any = await db
        .collection(COL.Requests)
        .findOne({ _id: collegeInfo['requestId'] }, { projection: { _id: 0, type: 0, raisedBy: 0 } });
      if (request['collegeId']) {
        request['collegeName'] = await db
          .collection(COL.Colleges)
          .findOne({ _id: collegeInfo['collegeId'] }, { projection: { collegeName: 1 } });
        delete request['collegeId'];
      }
      delete collegeInfo['requestId'];
      collegeInfo = { ...collegeInfo, ...request, request: true };
    } else {
      collegeInfo = {
        ...collegeInfo,
        ...(await db
          .collection(COL.Colleges)
          .findOne({ _id: collegeInfo['collegeId'] }, { projection: { _id: 0, collegeName: 1 } })),
      };
      delete collegeInfo['collegeId'];
    }
  
    return collegeInfo;
  }
  else{
    throw {
      status: 400,
      code: 'College Info not Set',
      message: 'User has not set College Info yet',
    };
  }
  
};

const followUser = async (db: Db, userId: ObjectId, tofollowId: ObjectId) => {
  let tofollowuser: any = await db
    .collection(COL.Users)
    .findOne({ _id: tofollowId }, { projection: { _id: 1, public: 1, followers: 1 } });
  
  if (tofollowuser.public) {
    await db.collection(COL.Followers).insertOne({
      timestamp: moment().format(),
      User: tofollowId,
      follower: userId,
    });

    await db.collection(COL.Users).updateOne({ _id: userId }, { $inc: { following: 1 } });
    await db.collection(COL.Users).updateOne({ _id: tofollowId }, { $inc: { followers: 1 } });
  } else {
    await db.collection(COL.FollowRequests).insertOne({
      User: tofollowId,
      follower: userId,
      status: 'Pending',
      timestamp: moment().format(),
    });
  }
};

const unFollowUser = async (db: Db, userId: ObjectId, tofollowId: ObjectId) => {

  await db.collection(COL.Followers).deleteOne({
    User: tofollowId,
    follower: userId,
  });

  await db.collection(COL.Users).updateOne({ _id: userId }, { $inc: { following: - 1 } });
  await db.collection(COL.Users).updateOne({ _id: tofollowId }, { $inc: { followers: - 1 } });
};

const fetchFollowRequests = async (db: Db, userId: ObjectId, skip: number) => {
  console.log(userId);
  let requests = await db
    .collection(COL.FollowRequests)
    .aggregate([
      { $match: { User: userId } },
      {
        $lookup: {
          from: 'Users',
          localField: 'follower',
          foreignField: '_id',
          as: 'userDetails',
        },
      },
      {
        $project: {
          'userDetails._id': 1,
          'userDetails.personalInfo.name': 1,
          'userDetails.personalInfo.avatar': 1,
          status: 1,
          timeStamp: 1,
        },
      },
      { $sort: { _id: 1 } },
      { $skip: 0 },
      { $limit: 10 },
    ])
    .toArray();

  return requests;
};

const updateFollowRequest = async (db: Db, userId: ObjectId, requestId: ObjectId, accepted: boolean) => {
  let request: any = await db.collection(COL.FollowRequests).findOne({ _id: requestId });
  console.log(userId);
  console.log(request);
  if (request.User.toString() === userId.toString()) {
    if (accepted) {
      await db
        .collection(COL.Followers)
        .insertOne({ User: request.User, follower: request.follower, timeStamp: moment().format() });
      let tofollowuser: any = await db
        .collection(COL.Users)
        .findOne({ _id: request.User }, { projection: { _id: 1, public: 1, followers: 1 } });
      let followinguser: any = await db
        .collection(COL.Users)
        .findOne({ _id: request.follower }, { projection: { _id: 1, public: 1, following: 1 } });
      await db
        .collection(COL.Users)
        .updateOne({ _id: request.follower }, { $set: { following: followinguser.following + 1 } });
      await db.collection(COL.Users).updateOne({ _id: request.User }, { $set: { followers: tofollowuser.followers + 1 } });
    }
    await db.collection(COL.FollowRequests).deleteOne({ _id: requestId });
  } else {
    throw {
      status: 400,
      code: 'Update Permission Denied',
      message: 'User cannot update this Follow Request',
    };
  }
};

const fetchUserInfo = async (db: Db, reqUser: ObjectId, targetUser: ObjectId) => {
  let targetUserData: any = await db.collection(COL.Users).findOne(
    { _id: targetUser },
    {
      projection: {
        _id: 0,
        personalInfo: 1,
        followers: 1,
        following: 1,
        public: 1,
      },
    }
  );
  targetUserData.posts = [];
  if (await db.collection(COL.Followers).findOne({ User: targetUser, follower: reqUser })) {
    targetUserData.followed = true;
  } else {
    targetUserData.followed = false;
  }
  if (targetUserData.public || targetUserData.followed) {
    const posts = await db.collection(COL.Posts).find({ createdBy: targetUser , status:'Active'}).sort({ _id: -1 }).limit(10).toArray();
    targetUserData.posts = posts;
  }

  targetUserData.followers = targetUserData.followers.length;
  targetUserData.following = targetUserData.following.length;

  return targetUserData;
};

export default {
  sendOTP,
  verifyOTP,
  resendOTP,
  updatePersonalInfo,
  fetchPersonalInfo,
  updateCollegeInfo,
  fetchCollegeInfo,
  followUser,
  unFollowUser,
  fetchUserInfo,
  fetchFollowRequests,
  updateFollowRequest,
};
