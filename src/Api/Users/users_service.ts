import { Db, ObjectId } from "mongodb";
import { generateOTP, sendSMS } from "../service";
import { COL } from "../../Mongodb/Collections";
import _ from "lodash";
import jwt from "jsonwebtoken";
import envVars from "../../Config/envconfig";
import moment from "moment";
import { ObjectIdWithErrorHandler } from "../../Mongodb/helpers";

const sendOTP = async (db: Db, number: string) => {
  const user = await db.collection(COL.Users).findOne({
    phone_number: number,
  });
  const otp = await generateOTP(4);
  await sendSMS(number, "6210fa7623afcc3d1627edd4", { otp: otp });
  if (user) {
    await db
      .collection(COL.Users)
      .findOneAndUpdate({ _id: user._id }, { $set: { otp: otp } });
  } else {
    await db.collection(COL.Users).insertOne({
      phone_number: number,
      otp: otp,
      followers: [],
      following: [],
      public: false,
      status: "OTP Verification",
      blocked: false,
    });
  }

  return {
    success: true,
    message: "OTP sent successfully",
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
            token_validity: moment()
              .add(7, "days")
              .format("MM:DD:YYYY HH:mm:ss:SS"),
          },
        }
      );
      return {
        success: true,
        message: "OTP Verified",
        token: jwt.sign(JSON.stringify({ _id: user._id }), envVars.AUTH_SECRET),
      };
    } else {
      return {
        success: false,
        message: "Invalid OTP",
        token: "",
      };
    }
  } else {
    return {
      success: false,
      message: `No user with Mobile number ${number} exists}`,
      token: "",
    };
  }
};

const resendOTP = async (db: Db, number: string) => {
  const user = await db.collection(COL.Users).findOne({
    phone_number: number,
  });
  if (user) {
    await sendSMS(number, `OTP for login ${user.otp}`);
    return {
      success: true,
      message: "OTP Resent",
    };
  } else {
    return {
      success: false,
      message: `No user with Mobile number ${number} exists}`,
    };
  }
};

const updatePersonalInfo = async (
  db: Db,
  userId: ObjectId,
  data: any,
  onboard: boolean
) => {
  if (onboard) {
    await db
      .collection(COL.Users)
      .findOneAndUpdate(
        { _id: userId },
        { $set: { personalInfo: data, status: "Personal Info Set" } }
      );
  } else {
    await db
      .collection(COL.Users)
      .findOneAndUpdate({ _id: userId }, { $set: { personalInfo: data } });
  }

  return "User Personal Info Updated Successfully";
};

const fetchPersonalInfo = async (db: Db, userId: ObjectId) => {
  const user: any = await db
    .collection(COL.Users)
    .findOne({ _id: userId }, { projection: { personalInfo: 1 } });

  return user.personalInfo;
};

const updateCollegeInfo = async (
  db: Db,
  userId: ObjectId,
  collegeInfo: any,
  onboard: boolean
) => {
  collegeInfo["collegeId"] = ObjectIdWithErrorHandler(collegeInfo["collegeId"]);
  collegeInfo["verified"] = false;
  if (onboard) {
    await db
      .collection(COL.Users)
      .findOneAndUpdate(
        { _id: userId },
        { $set: { collegeInfo: collegeInfo, status: "Onboarded" } }
      );
  } else {
    await db
      .collection(COL.Users)
      .findOneAndUpdate(
        { _id: userId },
        { $set: { collegeInfo: collegeInfo } }
      );
  }
};

const fetchCollegeInfo = async (db: Db, userId: ObjectId) => {
  let collegeInfo: any = await db
    .collection(COL.Users)
    .findOne({ _id: userId }, { projection: { _id: 0, collegeInfo: 1 } });
  collegeInfo = collegeInfo["collegeInfo"];
  if (collegeInfo["requestId"]) {
    let request: any = await db
      .collection(COL.Requests)
      .findOne(
        { _id: collegeInfo["requestId"] },
        { projection: { _id: 0, type: 0, raisedBy: 0 } }
      );
    if (request["collegeId"]) {
      request["collegeName"] = await db
        .collection(COL.Colleges)
        .findOne(
          { _id: collegeInfo["collegeId"] },
          { projection: { collegeName: 1 } }
        );
      delete request["collegeId"];
    }
    delete collegeInfo["requestId"];
    collegeInfo = { ...collegeInfo, ...request, request: true };
  } else {
    collegeInfo = {
      ...collegeInfo,
      ...(await db
        .collection(COL.Colleges)
        .findOne(
          { _id: collegeInfo["collegeId"] },
          { projection: { _id: 0, collegeName: 1 } }
        )),
    };
    delete collegeInfo["collegeId"];
  }

  return collegeInfo;
};

const followUser = async (db: Db, userId: ObjectId, tofollowId: ObjectId) => {
  await db
    .collection(COL.Users)
    .updateOne({ _id: tofollowId }, { $push: { followers: userId } });
  await db
    .collection(COL.Users)
    .updateOne({ _id: userId }, { $push: { following: tofollowId } });
};

const unFollowUser = async (db: Db, userId: ObjectId, tofollowId: ObjectId) => {
  await db
    .collection(COL.Users)
    .updateOne({ _id: tofollowId }, { $pull: { followers: userId } });
  await db
    .collection(COL.Users)
    .updateOne({ _id: userId }, { $pull: { following: tofollowId } });
};

const fetchUserInfo = async (
  db: Db,
  reqUser: ObjectId,
  targetUser: ObjectId
) => {
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
  targetUserData.followed = false;
  let reqUserString = reqUser.toString();
  for (let index = 0; index < targetUserData.followers.length; index++) {
    if (targetUserData.followers.toString() === reqUserString) {
      targetUserData.followed = true;
      break;
    }
  }
  if (targetUserData.public || targetUserData.followed) {
    const posts = await db
      .collection(COL.Posts)
      .find({ postedBy: targetUser })
      .sort({ _id: -1 })
      .limit(10)
      .toArray();
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
};
