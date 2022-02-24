import { Collection, Db, ObjectId } from 'mongodb';
// import re from 'regrex'
import { COL } from '../../Mongodb/Collections';
import { ObjectIdWithErrorHandler } from '../../Mongodb/helpers';
import jwt from 'jsonwebtoken';
import envVars from '../../Config/envconfig';
import aws from 'aws-sdk';

const verificationviaEmail = async (db: Db, userid: ObjectId, email: string) => {
  let emailRegex =
    /^[-!#$%&'*+\/0-9=?A-Z^_a-z{|}~](\.?[-!#$%&'*+\/0-9=?A-Z^_a-z`{|}~])*@[a-zA-Z0-9](-*\.?[a-zA-Z0-9])*\.[a-zA-Z](-?[a-zA-Z0-9])+$/;
  let invalidDomains = ['yahoo.com', 'gmail.com', 'ymail.com'];
  let userCollegeInfo: any = await db.collection(COL.Users).findOne(
    {
      $and: [
        { _id: userid },
        {
          $or: [{ status: 'College Info Set' }, { status: 'Verification Request Declined' }],
        },
      ],
    },
    { projection: { _id: 0, collegeInfo: 1 } }
  );
  if (userCollegeInfo && userCollegeInfo.collegeInfo && !userCollegeInfo.collegeInfo.requestId) {
    if (emailRegex.test(email)) {
      let domain: any = email.split('@');
      domain = domain[1];
      if (invalidDomains.indexOf(domain) === -1) {
        if (domain.includes('.edu')) {
          await sendVerificationEmail(userid, email, userCollegeInfo.collegeInfo.collegeId);
          await db.collection(COL.Users).findOneAndUpdate({ _id: userid }, { $set: { status: 'Verification Inprogress' } });
          return {
            success: true,
            message: 'Verification Email sent',
          };
        } else {
          let college = await db.collection(COL.Colleges).findOne({
            id: userCollegeInfo.collegeInfo.collegeId,
            domains: { $all: [domain] },
          });
          if (college) {
            await sendVerificationEmail(userid, email, userCollegeInfo.collegeInfo.collegeId);
            await db
              .collection(COL.Users)
              .findOneAndUpdate({ _id: userid }, { $set: { status: 'Verification Inprogress' } });
            return {
              success: true,
              message: 'Verification Email sent',
            };
          } else {
            //Raise a request for Validating Email for the college
            await db.collection(COL.Requests).insertOne({
              type: 'New College Domain',
              collegeId: userCollegeInfo.collegeInfo.collegeId,
              raisedBy: userid,
              status: 'Pending',
              domain: domain,
              email: email,
            });
            await db
              .collection(COL.Users)
              .findOneAndUpdate({ _id: userid }, { $set: { status: 'Verification Inprogress' } });
            return {
              success: true,
              message:
                'We didnt recognise the email domain, We will send you the verification email once our team verifies the domain',
            };
          }
        }
      } else {
        return {
          success: false,
          message: 'Personal Emails cannot be used for College Verification',
        };
      }
    } else {
      return {
        success: false,
        message: 'Invalid Email Address',
      };
    }
  } else {
    return {
      success: false,
      message: 'College Info for user not present or under request',
    };
  }
};

const newCollegeRequest = async (db: Db, body: any, userId: Object) => {
  let req: any = null;
  if (body.collegeId) {
    req = await db.collection(COL.Requests).insertOne({
      type: 'Course Addition',
      collegeId: ObjectIdWithErrorHandler(body.collegeId),
      alias: body.alias,
      stream: body.stream,
      passout: body.passout,
      raisedBy: userId,
      status: 'Pending',
    });
  } else {
    req = await db.collection(COL.Requests).insertOne({
      type: 'College Addition',
      collegeName: body.collegeName,
      alias: body.alias,
      stream: body.stream,
      passout: body.passout,
      raisedBy: userId,
      status: 'Pending',
    });
  }
  await db
    .collection(COL.Users)
    .findOneAndUpdate(
      { _id: userId },
      { $set: { collegeInfo: { requestId: req.insertedId, verified: false }, status: 'New College Request' } }
    );

  return 'College/Stream Adding Request raised';
};

const getRequests = async (db: Db, index: number, filter: any) => {
  const requests = await db
    .collection(COL.Requests)
    .aggregate([
      {
        $match: filter,
      },
      {
        $lookup: {
          from: COL.Colleges,
          localField: 'collegeId',
          foreignField: '_id',
          as: 'CollegeInfo',
        },
      },
    ])
    .skip(index * 10)
    .limit(10)
    .toArray();

  const totalRequests = await db.collection(COL.Requests).countDocuments(filter);
  const s3 = new aws.S3({
    accessKeyId: envVars.AWS_ACCESS_KEY,
    secretAccessKey: envVars.AWS_SECRET_ACCESS_KEY,
    signatureVersion: 'v4',
    region: 'ap-south-1',
  });
  let urlExpireTime = 60 * 60;
  for (let index = 0; index < requests.length; index++) {
    if (requests[index]['collegeId']) {
      requests[index]['collegeName'] = requests[index]['CollegeInfo'][0]['collegeName'];
      delete requests[index]['CollegeInfo'];
      delete requests[index]['collegeId'];
    }
    if (requests[index]['type'] === 'College Id Verification') {
      requests[index]['url'] = s3.getSignedUrl('getObject', {
        Bucket: 'beepapi',
        Key: requests[index]['filename'],
        Expires: urlExpireTime,
      });
    }
  }
  return {
    requests: requests,
    count: totalRequests,
  };
};

const updateRequest = async (db: Db, reqId: string, accepted: boolean, reason: string, userId: ObjectId) => {
  const request: any = await db.collection(COL.Requests).findOne({ _id: ObjectIdWithErrorHandler(reqId) });

  if (accepted) {
    if (request.type === 'College Addition') {
      let req = await db.collection(COL.Colleges).insertOne({
        collegeName: request.collegeName,
        alias: request.alias,
        streams: [request.stream],
        domains: [],
      });
      await db.collection(COL.Users).findOneAndUpdate(
        { _id: request.raisedBy },
        {
          $set: {
            collegeInfo: {
              collegeId: req.insertedId,
              stream: request.stream,
              passout: request.passout,
              verified: false,
            },
            status: 'College Info Set',
          },
        }
      );
    } else if (request.type === 'Course Addition') {
      await db.collection(COL.Colleges).updateOne({ _id: request.collegeId }, { $push: { stream: request.stream } });

      await db.collection(COL.Users).findOneAndUpdate(
        { _id: request.raisedBy },
        {
          $set: {
            collegeInfo: {
              collegeId: request.collegeId,
              stream: request.stream,
              passout: request.passout,
              verified: false,
            },
            status: 'College Info Set',
          },
        }
      );
    } else if (request.type === 'New College Domain') {
      await db.collection(COL.Colleges).updateOne({ _id: request.collegeId }, { $push: { domain: request.domain } });
      sendVerificationEmail(request.raisedBy, request.email, request.collegeId);
    } else if (request.type === 'College Id Verification') {
      await db
        .collection(COL.Users)
        .updateOne({ _id: request.raisedBy }, { $set: { 'collegeInfo.verified': true, status: 'Onboarded' } });
    }

    await db.collection(COL.Requests).findOneAndUpdate({ _id: request._id }, { $set: { status: 'Approved' } });
  } else {
    if (request.type === 'College Id Verification') {
      await db
        .collection(COL.Users)
        .updateOne({ _id: request.raisedBy }, { $set: { status: 'Verification Request Declined' } });
    } else if (request.type === 'New College Domain') {
      await db
        .collection(COL.Users)
        .updateOne({ _id: request.raisedBy }, { $set: { status: 'Verification Request Declined' } });
    }
    await db
      .collection(COL.Requests)
      .findOneAndUpdate(
        { _id: ObjectIdWithErrorHandler(reqId) },
        { $set: { status: 'Rejected', updatedBy: userId, reason: reason } }
      );
  }
};

const sendVerificationEmail = async (userid: ObjectId, email: string, collegeId: ObjectId) => {
  let token = jwt.sign(JSON.stringify({ _id: userid, email: email, collegeId: collegeId }), envVars.AUTH_SECRET);
  console.log(token);
};

const verifyEmail = async (db: Db, token: string) => {
  let tokenData: any = '';
  try {
    tokenData = jwt.verify(token, envVars.AUTH_SECRET);
  } catch (e) {
    return {
      success: false,
      message: 'Invalid Token',
    };
  }
  let domain = tokenData.email.split('@')[1];
  if (domain.includes('.edu')) {
    ObjectIdWithErrorHandler;
    let college = await db
      .collection(COL.Colleges)
      .findOne({ _id: ObjectIdWithErrorHandler(tokenData.collegeId), domains: { $all: [domain] } });
    if (!college) {
      await db
        .collection(COL.Colleges)
        .updateOne({ _id: ObjectIdWithErrorHandler(tokenData.collegeId) }, { $push: { domains: domain } });
    }
  }

  await db
    .collection(COL.Users)
    .updateOne(
      { _id: ObjectIdWithErrorHandler(tokenData._id) },
      { $set: { 'collegeInfo.verified': true, status: 'Onboarded' } }
    );

  return {
    success: true,
    message: 'College Info verified.',
  };
};

const verificationviaId = async (db: Db, userid: ObjectId, file: any) => {
  if (file) {
    let userCollegeInfo: any = await db.collection(COL.Users).findOne(
      {
        $and: [
          { _id: userid },
          {
            $or: [{ status: 'College Info Set' }, { status: 'Verification Request Declined' }],
          },
        ],
      },
      { projection: { _id: 0, collegeInfo: 1 } }
    );

    if (userCollegeInfo && userCollegeInfo.collegeInfo && !userCollegeInfo.collegeInfo.requestId) {
      const s3 = new aws.S3({
        accessKeyId: envVars.AWS_ACCESS_KEY,
        secretAccessKey: envVars.AWS_SECRET_ACCESS_KEY,
        signatureVersion: 'v4',
      });
      let fileext: any = file.originalname.split('.');
      fileext = fileext[fileext.length - 1];
      const params = {
        Bucket: 'beepapi',
        Key: userid.toString() + '_CollegeId.' + fileext,
        Body: file.buffer,
      };
      try {
        const resp = await new Promise<{ success: boolean; message: string }>((resolve, reject) => {
          s3.upload(params, function (s3Err: any, data: any) {
            if (s3Err) {
              reject({
                status: 500,
                code: 'Image upload error',
                message: 'Could not  upload the image please try again later.',
              });
            } else {
              db.collection(COL.Requests).insertOne({
                type: 'College Id Verification',
                collegeId: userCollegeInfo.collegeInfo.collegeId,
                raisedBy: userid,
                status: 'Pending',
                filename: userid.toString() + '_CollegeId.' + fileext,
              });
              db.collection(COL.Users).findOneAndUpdate({ _id: userid }, { $set: { status: 'Verification Inprogress' } });
              resolve({
                success: true,
                message: 'Verification under Process',
              });
            }
          });
        });
        return resp;
      } catch (e) {
        throw e;
      }
    } else {
      return {
        success: false,
        message: 'College Info for user not present or under request',
      };
    }
  } else {
    return {
      success: false,
      message: 'Image required for verification via Id',
    };
  }
};
export default {
  verificationviaEmail,
  newCollegeRequest,
  getRequests,
  updateRequest,
  verifyEmail,
  verificationviaId,
};
