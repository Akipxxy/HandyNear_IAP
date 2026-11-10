// Test-only settings (never real secrets)
process.env.JWT_SECRET = 'test-secret-test-secret-test-secret-1234';
process.env.ADMIN_USERNAME = 'admin';
process.env.ADMIN_PASSWORD = 'correct horse battery staple';
process.env.BCRYPT_ROUNDS = '4';
process.env.LOGIN_MAX_FAILS = '3';
process.env.PARTNER_API_KEYS = 'team8:test-partner-key-1234,other:second-test-key-5678';
process.env.LOG_REQUESTS = 'false';
process.env.RATE_LIMIT_MAX = '1000';
