import { Response, NextFunction } from 'express';
import { COL } from '../Mongodb/Collections';
import tokenValidation from './tokenValidation';

const auth = () => {
  return async (req: any, res: Response, next: NextFunction): Promise<any> => {
    try {
      const userData = await tokenValidation(req, COL.Users);
      req.user = userData;
      next();
    } catch (e: any) {
      res.status(e.status || 500).send({
        status: e.status || 500,
        code: e.status ? e.code : 'UNKNOWN_ERROR',
        error: e.status ? e.message : 'Something went wrong',
      });
    }
  };
};

export default auth;
