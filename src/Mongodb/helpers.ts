import { ObjectId } from 'mongodb';

export const ObjectIdWithErrorHandler = (id: string | ObjectId | undefined) => {
  try {
    return new ObjectId(id);
  } catch (e) {
    throw {
      status: 400,
      code: 'INVALID OBJECT ID',
      message: 'Invalid resource id',
    };
  }
};
