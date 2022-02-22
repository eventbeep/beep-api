import axios from "axios";
import envVars from "../Config/envconfig";

export const generateOTP = async (otpLength: number) => {
  var digits = "0123456789";
  let otp = "";
  for (let i = 1; i <= otpLength; i++) {
    var index = Math.floor(Math.random() * digits.length);
    otp = otp + digits[index];
  }
  return otp;
};

export const sendSMS = async (
  number: string,
  templateId: string,
  data: any
) => {
  //need to add MSG91 logic to send sms

  try {
    const headers = {
      "Content-Type": "application/json",
      authKey: envVars.MSG91_AUTH_KEY,
    };
    const body = JSON.stringify({
      flow_id: templateId,
      ...data,
    });
    const response = await axios.post(
      "https://api.msg91.com/api/v5/flow",
      body,
      { headers }
    );
    return response.data;
  } catch (error) {
    // throw error.response
    //   ? new ApiError(httpStatus.INTERNAL_SERVER_ERROR, error.response.data)
    //   : new ApiError(httpStatus.INTERNAL_SERVER_ERROR, "Msg91 send SMS failed");
  }
};
