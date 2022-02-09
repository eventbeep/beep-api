import { Db, ObjectId } from "mongodb";
import { generateOTP, sendSMS } from "../service";
import { COL } from '../../Mongodb/Collections';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import envVars from "../../Config/envconfig";
import moment from 'moment';
import { ObjectIdWithErrorHandler } from "../../Mongodb/helpers";


const sendOTP = async (
    db: Db,
    number: string
) => {
    const user = await db.collection(COL.Users).findOne({
        phone_number: number
    })
    if (user) {
        if (user.status === 'OTP Verification') {
            const otp = user.otp
            await sendSMS(number, `OTP for login ${otp}`)
            return {
                success: true,
                message: 'OTP sent successfully'
            };
        }
        else {
            return {
                success: false,
                message: `Mobile Number ${number} is alerady registered.`
            };
        }

    }
    else {
        const otp = await generateOTP(4);
        await sendSMS(number, `OTP for login ${otp}`)
        await db.collection(COL.Users).insertOne({
            phone_number: number,
            otp: otp,
            status: 'OTP Verification',
            blocked: false
        })
        return {
            success: true,
            message: 'OTP sent successfully'
        };
    }
}


const verifyOTP = async (
    db: Db,
    number: string,
    otp: string
) => {
    const user = await db.collection(COL.Users).findOne({
        phone_number: number
    })
    if (user) {
        if (otp === user.otp) {
            return ({
                success: true,
                message: 'OTP Verified'
            })
        }
        else {
            return ({
                success: false,
                message: 'Invalid OTP'
            })
        }
    }
    else {
        return ({
            success: false,
            message: `No user with Mobile number ${number} exists}`
        })
    }
}


const resendOTP = async (
    db: Db,
    number: string
) => {
    const user = await db.collection(COL.Users).findOne({
        phone_number: number
    })
    if (user) {
        await sendSMS(number, `OTP for login ${user.otp}`)
        return ({
            success: true,
            message: 'OTP Resent'
        })
    }
    else {
        return ({
            success: false,
            message: `No user with Mobile number ${number} exists}`
        })
    }

}


const updatePersonalInfo = async (
    db: Db,
    userId: ObjectId,
    data: any,
    onboard: boolean
) => {
    if (onboard) {
        await db.collection(COL.Users).findOneAndUpdate(
            { _id: userId },
            { $set: { personalInfo: data, status: 'Personal Info Set' } })
    }
    else {
        await db.collection(COL.Users).findOneAndUpdate(
            { _id: userId },
            { $set: { personalInfo: data } })
    }


    return 'User Personal Info Updated Successfully'
}


const fetchPersonalInfo = async (
    db: Db,
    userId: ObjectId,
) => {
    const user: any = await db.collection(COL.Users).findOne(
        { _id: userId },
        { projection: { personalInfo: 1 } }
    )

    return user.personalInfo
}


const updateCollegeInfo = async (
    db: Db,
    userId: ObjectId,
    collegeInfo: any,
    onboard: boolean
) => {
    collegeInfo['collegeId'] = ObjectIdWithErrorHandler(collegeInfo['collegeId'])
    collegeInfo['verified'] = false
    if (onboard) {
        await db.collection(COL.Users).findOneAndUpdate(
            { _id: userId },
            { $set: { collegeInfo: collegeInfo, status: 'Onboarded' } })
    }
    else {
        await db.collection(COL.Users).findOneAndUpdate(
            { _id: userId },
            { $set: { collegeInfo: collegeInfo } })
    }
}


const fetchCollegeInfo = async (
    db: Db,
    userId: ObjectId
) => {
    let collegeInfo:any = await db.collection(COL.Users).findOne(
        { _id: userId },
        { projection: {_id:0,collegeInfo:1} }
    )
    collegeInfo = collegeInfo['collegeInfo']
    if(collegeInfo['requestId']){
        let request:any = await db.collection(COL.Requests).findOne(
            {_id:collegeInfo['requestId']},
            {projection: {_id:0,type:0,raisedBy:0}}    
        )
        if(request['collegeId']){
            request['collegeName']=await db.collection(COL.Colleges).findOne(
                {_id:collegeInfo['collegeId']},
                {projection: {collegeName : 1}})
            delete request['collegeId']
        }
        delete collegeInfo['requestId']
        collegeInfo = {...collegeInfo, ...request, request:true}
    }
    else{
        collegeInfo= {...collegeInfo, ...await db.collection(COL.Colleges).findOne(
            {_id:collegeInfo['collegeId']},
            {projection: {_id:0,collegeName : 1}})}
        delete collegeInfo['collegeId']
    }

    return collegeInfo
}

export default {
    sendOTP,
    verifyOTP,
    resendOTP,
    updatePersonalInfo,
    fetchPersonalInfo,
    updateCollegeInfo,
    fetchCollegeInfo
};