// Authorization headers for tests
const { signToken } = require('./auth');
module.exports = {
  admin: () => `Bearer ${signToken('admin')}`,
  customer: (id) => `Bearer ${signToken('customer', id)}`,
};
