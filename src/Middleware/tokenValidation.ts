import jwt from 'jsonwebtoken'
import { ObjectIdWithErrorHandler } from "../Mongodb/helpers";
import envVars from '../Config/envconfig';
import moment from 'moment';


export default async (
    req: any,
    Collection:any
) => {
    const { db } = req.app.locals
    if (!req.header('Authorization')) {
        throw {
            status: 401,
            code: "PROTECTED ROUTE",
            message: "Token required to access this route,No Token"
        };
    };
    const token = req.header('Authorization').replace('Bearer ', '')
    try {
        const data: any = jwt.verify(token, envVars.AUTH_SECRET);
        const user = await db.collection(Collection)
            .findOne(
                { _id: ObjectIdWithErrorHandler(data._id)},
                { projection :{_id:1, token_validity:1, blocked:1, status:1}}
            );
        if (user) {
            if(user.blocked){
                throw {
                    status: 401,
                    code: "PROTECTED ROUTE",
                    message: "User has been blocked"
                };
            }
            else{
                if (moment(user.token_validity, 'MM:DD:YYYY HH:mm:ss:SS').isAfter(moment())) {
                    await db.collection(Collection).findOneAndUpdate(
                        { _id: user._id },
                        { $set: { token_validity: moment().add(7, 'days').format('MM:DD:YYYY HH:mm:ss:SS') } }
                    )
                    return (user);
                }
                else {
                    throw {
                        status: 401,
                        code: "PROTECTED ROUTE",
                        message: "Token Expired please login again."
                    };
                }
            }
            

        }
        else {
            throw {
                status: 401,
                code: "PROTECTED ROUTE",
                message: "Invalid User"
            };
        }
    }
    catch (e: any) {
        throw {
            status: e.status || 401,
            code: e.code ? e.code : "PROTECTED ROUTE",
            message: e.message ? e.message : "Token required to access this route,invalid Token"
        };
    }

}
