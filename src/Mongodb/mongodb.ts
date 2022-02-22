import { MongoClient } from 'mongodb';
import envVars from '../Config/envconfig';

export default async (): Promise<any> => {
  const client = new MongoClient(envVars.MONGODBSRV);
  await client.connect();
  return client;
};
