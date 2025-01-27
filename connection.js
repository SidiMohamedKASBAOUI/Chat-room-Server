// Do not change this file
require('dotenv').config();
const { MongoClient } = require('mongodb');
const { default: mongoose } = require('mongoose');
const URI = process.env.MONGO_URI; // Declare MONGO_URI in your .env file

//mongoose.connect(URI);
async function main(callback) {

    const client = new MongoClient(URI);

    try {
        // Connect to the MongoDB cluster
        await client.connect();

        // Make the appropriate DB calls
        await callback(client);

    } catch (e) {
        // Catch any errors
        console.error(e);
        throw new Error('Unable to Connect to Database')
    }
}

module.exports = main;