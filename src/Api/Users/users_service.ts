import { Db } from "mongodb";
import { generateOTP, sendSMS } from "../service";
import { COL } from '../../Mongodb/Collections';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import envVars from "../../Config/envconfig";
import moment from 'moment';


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
            status: 'OTP Verification'
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


const resetPasswordOTP = async (
    db: Db,
    number: string
) => {
    const user = await db.collection(COL.Users)
        .findOne({
            phone_number: number,
            status: { $ne: 'OTP Verification' }
        })
    if (user) {
        const otp = await generateOTP(4)
        await sendSMS(number, `OTP for password reset is ${otp}`)
        await db.collection(COL.Users)
            .findOneAndUpdate(
                { _id: user._id }, { $set: { otp: otp } })
        return {
            success: true,
            message: 'OTP sent successfully'
        };
    }
    else {
        return ({
            success: false,
            message: `No user with Mobile number ${number} exists`
        })
    }
}


const setPassword = async (
    db: Db,
    number: string,
    otp: string,
    password: string
) => {
    const user = await db.collection(COL.Users).findOne({
        phone_number: number
    })
    if (user) {
        if (otp === user.otp) {
            await db.collection(COL.Users)
                .findOneAndUpdate(
                    { _id: user._id },
                    {
                        $set: {
                            password: await bcrypt.hash(password, envVars.SALTROUND),
                            status: 'Password Set'
                        }
                    }
                );
            return ({
                success: true,
                message: 'Password Set'
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

const login=async(
    db:Db,
    number:string,
    password:string
)=>{
    let token=''
    const user = await db.collection(COL.Users).findOne({
        phone_number:number,
        status:{$ne:'OTP Verification'}
    })
    if(user){
        const match= await bcrypt.compare(password,user.password)
        if(match){
            token = jwt.sign(JSON.stringify({_id:user._id}),envVars.AUTH_SECRET)
            await db.collection(COL.Users)
            .findOneAndUpdate(
                {_id:user._id},
                {$set :{token_validity: moment().add(7,'days').format( 'MM:DD:YYYY HH:mm:ss:SS')}})
                
            return{
                success:true,
                message:'Login Success',
                token:token
            }
        }
        else{
            return{
                success:false,
                message:'Password and Number do not match'
            }
        }
    }
    else{
        return{
            success:false,
            message:`No user with Mobile Number ${number} exists`
        }
    }
}

export default {
    sendOTP,
    verifyOTP,
    setPassword,
    resendOTP,
    resetPasswordOTP,
    login
};