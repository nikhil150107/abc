require('dotenv').config();
const mongoose = require('mongoose');
const Violation = require('./models/Violation');
const Event = require('./models/Event');
const AuditLog = require('./models/AuditLog');

const clearData = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URL);
    console.log('Connected to MongoDB.');

    const vRes = await Violation.deleteMany({});
    const eRes = await Event.deleteMany({});
    const aRes = await AuditLog.deleteMany({});

    console.log(`Cleared ${vRes.deletedCount} dummy violations.`);
    console.log(`Cleared ${eRes.deletedCount} dummy events.`);
    console.log(`Cleared ${aRes.deletedCount} dummy audit logs.`);

    console.log('PrivGuard database is now 100% clean and ready for real-time DemoApp telemetry!');
    process.exit(0);
  } catch (err) {
    console.error('Error clearing data:', err.message);
    process.exit(1);
  }
};

clearData();
