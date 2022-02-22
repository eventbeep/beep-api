import { response, Response } from 'express';
import service from './requests_service';

export const verificationviaEmail = async (req: any, res: Response) => {
  try {
    const { db } = req.app.locals;
    let { success, message } = await service.verificationviaEmail(db, req.user._id, req.body.email);
    if (success) {
      res.status(200).send({
        message: message,
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

export const newCollegeRequest = async (req: any, res: Response) => {
  try {
    const { db } = req.app.locals;
    let response = await service.newCollegeRequest(db, req.body, req.user._id);
    res.status(200).send({
      message: response,
    });
  } catch (e: any) {
    console.log(e);
    res.status(e.status || 500).send({
      status: e.status || 500,
      code: e.status ? e.code : 'UNKNOWN_ERROR',
      error: e.status ? e.message : 'Something went wrong',
    });
  }
};

export const getRequests = async (req: any, res: Response) => {
  try {
    const { db } = req.app.locals;
    let request = await service.getRequests(db, req.body.index, req.body.filter);
    res.status(200).send({
      message: 'Requests Retrieved',
      ...request,
    });
  } catch (e: any) {
    console.log(e);
    res.status(e.status || 500).send({
      status: e.status || 500,
      code: e.status ? e.code : 'UNKNOWN_ERROR',
      error: e.status ? e.message : 'Something went wrong',
    });
  }
};

export const updateRequest = async (req: any, res: Response) => {
  try {
    const { db } = req.app.locals;
    await service.updateRequest(db, req.body.requestId, req.body.accepted, req.body.reason, req.user._id);
    res.status(200).send({
      message: 'Requests Updated Successfuly',
    });
  } catch (e: any) {
    console.log(e);
    res.status(e.status || 500).send({
      status: e.status || 500,
      code: e.status ? e.code : 'UNKNOWN_ERROR',
      error: e.status ? e.message : 'Something went wrong',
    });
  }
};

export const verifyEmail = async (req: any, res: Response) => {
  try {
    const { db } = req.app.locals;
    let { success, message } = await service.verifyEmail(db, req.query.token);
    if (success) {
      res.status(200).send({
        message: message,
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

export const verificationviaId = async (req: any, res: Response) => {
  try {
    const { db } = req.app.locals;
    let { success, message } = await service.verificationviaId(db, req.user._id, req.file);
    if (success) {
      res.status(200).send({
        message: message,
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
