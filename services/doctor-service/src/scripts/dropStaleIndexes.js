const mongoose = require("mongoose");
const dotenv = require("dotenv");

dotenv.config();

const dropStaleIndexes = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("Connected to MongoDB");

    const db = mongoose.connection.db;
    const collection = db.collection("doctors");

    // Get all indexes using listIndexes
    const indexCursor = await collection.listIndexes();
    const indexes = await indexCursor.toArray();
    console.log("Current indexes:", indexes.map(i => i.name));

    // Drop the stale registrationNumber index if it exists
    const staleIndexName = "registrationNumber_1";
    const hasStaleIndex = indexes.some(i => i.name === staleIndexName);
    
    if (hasStaleIndex) {
      await collection.dropIndex(staleIndexName);
      console.log("✓ Dropped stale index: registrationNumber_1");
    } else {
      console.log("✓ No stale registrationNumber_1 index found");
    }

    // Show indexes after cleanup
    const indexCursorAfter = await collection.listIndexes();
    const indexesAfter = await indexCursorAfter.toArray();
    console.log("\nIndexes after cleanup:", indexesAfter.map(i => i.name));
    
    await mongoose.connection.close();
    console.log("\n✓ Cleanup complete and connection closed");
  } catch (error) {
    console.error("Error dropping indexes:", error.message);
    process.exit(1);
  }
};

dropStaleIndexes();
