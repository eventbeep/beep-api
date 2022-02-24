import express from 'express';
import cors from 'cors';
import cluster from 'cluster';
import os from 'os';
import helmet from 'helmet';
import morgan from 'morgan';
import routes from './src/Config/routes';
import mongodb from './src/Mongodb/mongodb';
import envVars from './src/Config/envconfig';

if (envVars.NODE_ENV === 'development') {
  const app = express();
  app.use(helmet());
  app.use(cors());
  app.use(express.json());
  app.use(morgan('dev'));
  app.use(routes);

  // Connecting to Mongo Database
  const database = async () => {
    const client = await mongodb()
      .then()
      .catch((err) => {
        console.log(err);
      });
    app.locals.db = client.db();
  };

  database().then(() => {
    console.log('Database connected');
  });

  app.listen(envVars.PORT, () => {
    // tslint:disable-next-line:no-console
    console.log(`App is running on port ${envVars.PORT}`);
  });
} else {
  const totalCPUs = os.cpus().length;

  if (cluster.isPrimary) {
    console.log(`Master PID is ${process.pid}`);
    for (let index = 0; index < totalCPUs; index++) {
      cluster.fork();
    }
    cluster.on('exit', (worker, code, signal) => {
      console.log(`Worker with ${worker.process.pid} died`);
      console.log(`Starting a new worker`);
      cluster.fork();
    });
  } else {
    const app = express();
    app.use(helmet());
    app.use(cors());
    app.use(express.json());
    app.use(routes);

    // Connecting to Mongo Database
    const database = async () => {
      const client = await mongodb()
        .then()
        .catch((err) => {
          console.log(err);
        });
      app.locals.db = client.db();
    };

    database().then(() => {
      console.log('Database connected');
    });

    app.listen(envVars.PORT, () => {
      // tslint:disable-next-line:no-console
      console.log(`App is running on port ${envVars.PORT}`);
    });
  }
}
