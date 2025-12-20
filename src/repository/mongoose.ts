import mongoose from "mongoose";

const connectMongoDB = async () => {
  const connectionStatus = mongoose.connection.readyState;

  if (connectionStatus === 1) {
    console.log("Already connected");

    return;
  }

  if (connectionStatus === 2) {
    console.log("Connecting...");

    return;
  }

  try {
    await mongoose.connect(process.env.MONGODB_URI as string);
    console.log("Connected to MongoDB");
  } catch (error: any) {
    console.log("Error: ", error);
    throw new Error("Error: ", error);
  }
};

export default connectMongoDB;
