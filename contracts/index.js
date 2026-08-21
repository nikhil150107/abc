const rawApplicationEvent = require('./rawApplicationEvent');
const processedComplianceEvent = require('./processedComplianceEvent');
const violationObject = require('./violationObject');

module.exports = {
  ...rawApplicationEvent,
  ...processedComplianceEvent,
  ...violationObject,
  contracts: {
    rawApplicationEvent,
    processedComplianceEvent,
    violationObject,
  },
};
