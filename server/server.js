// dotenv must load before app.js runs, because app.js reads process.env at import time
import 'dotenv/config';
import mongoose from 'mongoose';
import app from './app.js';
import { connectDB } from './config/db.js';

const PORT = process.env.PORT || 5000;

async function startServer() {
  try {
    await connectDB();

    const server = app.listen(PORT, () => {
      console.log(`Server running in ${process.env.NODE_ENV} mode at http://localhost:${PORT}`);
    });

    // Graceful shutdown: close the HTTP server and DB connection on Ctrl+C
    process.on('SIGINT', async () => {
      console.log('\nShutting down...');
      server.close();
      await mongoose.disconnect();
      process.exit(0);
    });
  } catch (err) {
    console.error(`Failed to start server: ${err.message}`);
    process.exit(1);
  }
}

startServer();
