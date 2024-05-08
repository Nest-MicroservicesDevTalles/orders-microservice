/*import 'dotenv/config';
import * as joi from 'joi';

interface EnVars {
    PORT: number;
    PRODUCT_MICROSERVICE_HOST: string;
    PRODUCT_MICROSERVICE_PORT: number;
}

const envsSchema = joi.object({
    PORT: joi.number().required(),
    PRODUCT_MICROSERVICE_HOST: joi.string().required(),
    PRODUCT_MICROSERVICE_PORT: joi.number().required(),
})
    .unknown(true);

const { error, value } = envsSchema.validate(process.env);

if (error) {
    throw new Error(`Config validation error: ${error.message}`);
}

const envVars: EnVars = value;

export const envs = {
    port: envVars.PORT,
    productsMicroserviceHost: envVars.PRODUCT_MICROSERVICE_HOST,
    productsMicroservicePort: envVars.PRODUCT_MICROSERVICE_PORT,
}*/

import 'dotenv/config';
import * as joi from 'joi';

interface EnVars {
    PORT: number;
    NATS_SERVERS: string[];
}

const envsSchema = joi.object({
    PORT: joi.number().required(),
    NATS_SERVERS: joi.array().items(joi.string()).required(),
})
.unknown(true);

const { error, value } = envsSchema.validate({
    ...process.env,
    NATS_SERVERS: process.env.NATS_SERVERS?.split(',')
});

if (error) {
    throw new Error(`Config validation error: ${error.message}`);
}

const envVars: EnVars = value;

export const envs = {
    port: envVars.PORT,
    natsServers: envVars.NATS_SERVERS
}