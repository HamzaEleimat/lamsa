require('dotenv').config(); // Loads .env variables

const jwt = require('jsonwebtoken');

// Use the secret from your .env file
const secret = process.env.JWT_SECRET;

// Define the payload (customize as needed)
const payload = {
  userId: 1,
  email: 'test@example.com',
  role: 'admin'
};

// Set token options
const options = {
  expiresIn: '1h'
};

console.log('JWT_SECRET:', secret);

// Generate the token
const token = jwt.sign(payload, secret, options);

console.log('Your JWT token:');
console.log(token);
