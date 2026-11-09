// Test-only settings (never real secrets)
process.env.JWT_SECRET = 'test-secret-test-secret-test-secret-1234';
process.env.ADMIN_USERNAME = 'admin';
process.env.ADMIN_PASSWORD = 'correct horse battery staple';
process.env.BCRYPT_ROUNDS = '4';
process.env.LOGIN_MAX_FAILS = '3';
