import { Response, Request } from 'express';
import service from './admin_users_service';

export const login = async (req: Request, res: Response) => {
  try {
    const { db } = req.app.locals;
    let { success, message, token } = await service.login(db, req.body.email, req.body.password);
    if (success) {
      res.status(200).send({
        message: message,
        token: token,
      });
    } else {
      res.status(400).send({
        message: message,
      });
    }
  } catch (e: any) {
    console.log(e);
    res.status(e.status || 500).send({
      status: e.status || 500,
      code: e.status ? e.code : 'UNKNOWN_ERROR',
      error: e.status ? e.message : 'Something went wrong',
    });
  }
};
