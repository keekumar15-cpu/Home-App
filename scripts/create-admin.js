const bcrypt = require('bcrypt');

const password = process.argv[2];

if (!password) {
  console.error('Usage: npm run hash-password -- "your-password-here"');
  process.exit(1);
}

bcrypt.hash(password, 12).then((hash) => {
  console.log('\nAdd this to your .env file:\n');
  console.log(`ADMIN_PASSWORD_HASH="${hash}"\n`);
});
