// Quick end-to-end check of the wallet client. Run from server/:
//   node wallet-check.js            -> balance, top up KES 1,000, balance, history
//   node wallet-check.js pay 1      -> also pay booking 1 (needs funds + a registered booking)
require('dotenv').config();
const mm = require('./moneymentor');

(async () => {
  const customerId = process.env.PARTNER_CUSTOMER_ID || '1';
  const show = (label, v) => console.log(label.padEnd(18), JSON.stringify(v));
  try {
    show('balance before', await mm.getWallet(customerId));
    show('top up 1000 KES', await mm.topUp(customerId, 100000, `check-${Date.now()}`));
    show('balance after', await mm.getWallet(customerId));
    if (process.argv[2] === 'pay') {
      show('pay booking', await mm.payBooking(process.argv[3]));
      show('pay again (same)', await mm.payBooking(process.argv[3])); // replay, no second charge
      show('balance final', await mm.getWallet(customerId));
    }
    const history = await mm.getTransactions(customerId);
    console.log(`history: ${history.length} transaction(s)`);
    history.slice(0, 5).forEach((t) => console.log(' ', t.id, t.type, t.amountCents, 'cents ->', t.balanceAfterCents));
  } catch (err) {
    console.error('FAILED:', err.status, err.code, '-', err.message);
    process.exitCode = 1;
  }
})();