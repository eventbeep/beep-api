import { Db, ObjectId } from 'mongodb';
import moment from 'moment';
import { COL } from '../../Mongodb/Collections';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import envVars from '../../Config/envconfig';

const login = async (db: Db, email: string, password: string) => {
  let token = '';
  const user = await db.collection(COL.AdminUsers).findOne({ email: email.toLowerCase() });
  if (user) {
    const match = await bcrypt.compare(password, user.password);
    if (match) {
      token = jwt.sign(JSON.stringify({ _id: user._id }), envVars.AUTH_SECRET);
      await db
        .collection(COL.AdminUsers)
        .findOneAndUpdate(
          { _id: user._id },
          { $set: { token_validity: moment().add(7, 'days').format('MM:DD:YYYY HH:mm:ss:SS') } }
        );

      return {
        success: true,
        message: 'Login Success',
        token: token,
      };
    } else {
      return {
        success: false,
        message: 'Password and Email do not match',
      };
    }
  } else {
    return {
      success: false,
      message: `No Admin user with Email ${email} exists`,
    };
  }
};

export default {
  login,
};
