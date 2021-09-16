/* eslint-disable node/no-unsupported-features/es-syntax */
const mongoose = require('mongoose');

const connectDB = async () => {
  const dbEnv = // this will help separate production enviroments, not to mess with production data
    process.env.NODE_ENV !== `production`
      ? process.env.MONGO_DB_DEV
      : process.env.MONGO_DB_PROD;

  try {
    const conn = await mongoose.connect(
      `mongodb+srv://${process.env.MONGO_USER}:${process.env.MONGO_PASSWORD}@af-proexprod.c0pmy.mongodb.net/${dbEnv}?retryWrites=true&w=majority`,
      {
        useNewUrlParser: true,
        useUnifiedTopology: true,
        useCreateIndex: true
      }
    );

    console.log(`DB connected: ${conn.connection.host}`);
  } catch (err) {
    console.log(`Error: ${err.message}`);
  }
};

module.exports = connectDB;
