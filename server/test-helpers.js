// Authorization headers for tests
const { signToken } = require('./auth');
module.exports = {
  partnerKey: () => ({ 'X-API-Key': 'test-partner-key-1234' }),
  admin: () => `Bearer ${signToken('admin')}`,
  customer: (id) => `Bearer ${signToken('customer', id)}`,
};
