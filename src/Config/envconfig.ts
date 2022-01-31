import 'dotenv/config';
import Joi from 'joi';


const envVarsSchema = Joi.object()
    .keys({
        PORT: Joi.number().default(3000).description('PORT for API Endpoint'),
        NODE_ENV: Joi.string().default('development').description('Running Node Env'),
        MONGODBSRV: Joi.string().uri().description('Mongo Db Connection String'),
        SALTROUND: Joi.number().description("Salt rounds for Hashing"),
        MSG91_AUTH_KEY: Joi.string().description("MSG91 Auth Key"),
        AUTH_SECRET: Joi.string().description("Auth Token Key")
    })

const { value: envVars, error } = envVarsSchema.prefs({ errors: { label: 'key' } }).validate(process.env);


export default envVars