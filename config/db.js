const { MongoClient } = require('mongodb');

async function connectToDatabase(uri, dbName) {
    const client = new MongoClient(uri);
    try {
        await client.connect();
        console.log("Connected to MongoDB");
        const db = client.db(dbName);
        return { client, db }; // MongoClientとdbをオブジェクトで返す
    } catch (error) {
        console.error("Failed to connect to MongoDB:", error);
        throw error;
    }
}

module.exports = connectToDatabase;
