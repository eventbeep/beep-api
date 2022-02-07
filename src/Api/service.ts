import envVars from "../Config/envconfig";

export const generateOTP = async (
    otpLength: number
) => {
    var digits = '0123456789';
    let otp = '';
    for (let i = 1; i <= otpLength; i++) {
        var index = Math.floor(Math.random() * (digits.length));
        otp = otp + digits[index];
    }
    return otp;
}

export const sendSMS = async (
    number: string,
    message: string
)=>{
    //need to add MSG91 logic to send sms
    
    console.log(message)
}
