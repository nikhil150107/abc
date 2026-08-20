const dns = require('dns');
dns.setServers(['1.1.1.1', '8.8.8.8'])
const mongodb = require('mongoose');

const connectTOdb = async () => {
    try {
        await mongodb.connect(process.env.MONGO_URL);
        console.log("Mongodb connected sucessfully");
    } catch (error) {
        console.error("Mongodb connect failed");

        console.log(error);

        process.exit(1);

    }
}

module.exports = connectTOdb;