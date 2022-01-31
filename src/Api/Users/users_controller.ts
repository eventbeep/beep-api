import { Response, Request } from 'express';
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
        let { success, message } = await service.verifyOTP(db, req.body.number, req.body.otp)
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


export const resetPasswordOTP = async (
    req: Request,
    res: Response
) => {
    try {
        const { db } = req.app.locals;
        let { success, message } = await service.resetPasswordOTP(db, req.body.number)
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


export const setPassword = async (
    req: Request,
    res: Response
) => {
    try {
        const { db } = req.app.locals;
        let { success, message } = await service.setPassword(db, req.body.number, req.body.otp, req.body.password)
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

export const login = async (
    req: Request,
    res: Response
) => {
    try {
        const { db } = req.app.locals;
        let { success, message, token} = await service.login(db, req.body.number, req.body.password)
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

export const verify =async(
    req:Request,
    res:Response
)=>{
    res.status(200).send({
        message:'Valid User'
    })
}