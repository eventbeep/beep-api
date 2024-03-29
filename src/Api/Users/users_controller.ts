import { Response, Request } from 'express';
import { ObjectIdWithErrorHandler } from '../../Mongodb/helpers';
import service from './users_service'


export const sendOTP = async (
    req: Request,
    res: Response
) => {
    try {
        const { db } = req.app.locals;
        let { success, message } = await service.sendOTP(db, req.body.number)
        if (success) {
            res.status(200).send({
                message: message
            })
        }
        else {
            res.status(400).send({
                message: message
            })
        }
    }
    catch (e: any) {
        console.log(e)
        res.status(e.status || 500).send({
            status: e.status || 500,
            code: e.status ? e.code : 'UNKNOWN_ERROR',
            error: e.status ? e.message : 'Something went wrong'
        });
    }
}


export const verifyOTP = async (
    req: Request,
    res: Response
) => {
    try {
        const { db } = req.app.locals;
        let { success, message, token } = await service.verifyOTP(db, req.body.number, req.body.otp)
        if (success) {
            res.status(200).send({
                message: message,
                token:token
            })
        }
        else {
            res.status(400).send({
                message: message
            })
        }
    }
    catch (e: any) {
        console.log(e)
        res.status(e.status || 500).send({
            status: e.status || 500,
            code: e.status ? e.code : 'UNKNOWN_ERROR',
            error: e.status ? e.message : 'Something went wrong'
        });
    }
}


export const resendOTP = async (
    req: Request,
    res: Response
) => {
    try {
        const { db } = req.app.locals;
        let { success, message } = await service.resendOTP(db, req.body.number)
        if (success) {
            res.status(200).send({
                message: message
            })
        }
        else {
            res.status(400).send({
                message: message
            })
        }
    }
    catch (e: any) {
        console.log(e)
        res.status(e.status || 500).send({
            status: e.status || 500,
            code: e.status ? e.code : 'UNKNOWN_ERROR',
            error: e.status ? e.message : 'Something went wrong'
        });
    }
}



export const verify =async(
    req:any,
    res:Response
)=>{
    res.status(200).send({
        message:'Valid User',
        user_status: req.user.status
    })
}

export const updatePersonalInfo = async(
    req:any,
    res:Response
)=>{
    try {
        const { db } = req.app.locals;
        let message = await service.updatePersonalInfo(db, req.user._id ,req.body.personalInfo, req.body.onboard)
        res.status(200).send({
            message: message
        })
    }
    catch (e: any) {
        console.log(e)
        res.status(e.status || 500).send({
            status: e.status || 500,
            code: e.status ? e.code : 'UNKNOWN_ERROR',
            error: e.status ? e.message : 'Something went wrong'
        });
    }
}


export const fetchPersonalInfo = async(
    req:any,
    res:Response
)=>{
    try{
        const { db } = req.app.locals;
        let personalInfo = await service.fetchPersonalInfo(db, req.user._id)
        res.status(200).send({
            message: 'Personal Info Retrieved',
            data:personalInfo
        })
    }
    catch (e: any) {
        console.log(e)
        res.status(e.status || 500).send({
            status: e.status || 500,
            code: e.status ? e.code : 'UNKNOWN_ERROR',
            error: e.status ? e.message : 'Something went wrong'
        });
    }   
}


export const updateCollegeInfo = async(
    req:any,
    res:Response
)=>{
    try{
        const { db } = req.app.locals;
        let personalInfo = await service.updateCollegeInfo(db, req.user._id, req.body.collegeInfo,req.body.onboard);
        res.status(200).send({
            message: 'Personal Info Retrieved',
            data:personalInfo
        })
    }
    catch (e: any) {
        console.log(e)
        res.status(e.status || 500).send({
            status: e.status || 500,
            code: e.status ? e.code : 'UNKNOWN_ERROR',
            error: e.status ? e.message : 'Something went wrong'
        });
    }   
}


export const fetchCollegeInfo = async(
    req:any,
    res:Response
)=>{
    try{
        const { db } = req.app.locals;
        let collegeInfo = await service.fetchCollegeInfo(db, req.user._id)
        res.status(200).send({
            message: 'College Info Retrieved',
            data:collegeInfo
        })
    }
    catch (e: any) {
        console.log(e)
        res.status(e.status || 500).send({
            status: e.status || 500,
            code: e.status ? e.code : 'UNKNOWN_ERROR',
            error: e.status ? e.message : 'Something went wrong'
        });
    }   
}


export const followUser = async(
    req:any,
    res:Response
)=>{
    try{
        const { db } = req.app.locals;
        await service.followUser(db, req.user._id,ObjectIdWithErrorHandler(req.query.id))
        res.status(200).send({
            message: 'Followed User Successfully',
        })
    }
    catch (e: any) {
        console.log(e)
        res.status(e.status || 500).send({
            status: e.status || 500,
            code: e.status ? e.code : 'UNKNOWN_ERROR',
            error: e.status ? e.message : 'Something went wrong'
        });
    }   
}


export const unFollowUser = async(
    req:any,
    res:Response
)=>{
    try{
        const { db } = req.app.locals;
        await service.unFollowUser(db, req.user._id,ObjectIdWithErrorHandler(req.query.id))
        res.status(200).send({
            message: 'Un-Followed User Successfully',
        })
    }
    catch (e: any) {
        console.log(e)
        res.status(e.status || 500).send({
            status: e.status || 500,
            code: e.status ? e.code : 'UNKNOWN_ERROR',
            error: e.status ? e.message : 'Something went wrong'
        });
    }   
}

export const fetchUserInfo = async(
    req:any,
    res:Response
)=>{
    try{
        const { db } = req.app.locals;
        let userInfo = await service.fetchUserInfo(db, req.user._id,ObjectIdWithErrorHandler(req.query.id))
        res.status(200).send({
            message: 'User Info Retrieved',
            data:userInfo
        })
    }
    catch (e: any) {
        console.log(e)
        res.status(e.status || 500).send({
            status: e.status || 500,
            code: e.status ? e.code : 'UNKNOWN_ERROR',
            error: e.status ? e.message : 'Something went wrong'
        });
    }   
}