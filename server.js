const dotenv = require('dotenv');
const connectDb = require('./db/db');

// if there is any error that occured at the start of the app, 
// Error is most likely not going to happen at this point, but if there is any,
// we want to have it taken care of
process.on('uncaughtException', err => {
  console.log(err.name, err.message);
  console.log('UNCAUGHT EXCEPTION! Shutting down...');
  process.exit(1);
});

// get the config in a local config file, this will help us to simulate some data for a local development enviroment
dotenv.config({ path: './config/config.env' });

// app entry
const app = require('./app');

// connect to db
connectDb();

const PORT = process.env.PORT || 8000;

// serve the app on a local port to the current computer host
const server = app.listen(PORT, () => {
  console.log(`App running on http://localhost:${PORT}`);
});

//unhandle routes error
process.on('unhandledRejection', err => {
  console.log(err);
  console.log(err.name, err.message);
  console.log('UNHANDLE REJECTION! Shutting down...');
  server.close(() => {
    process.exit(1);
  });
});
