console.log('Node.js is working!');
console.log('Current directory:', __dirname);
console.log('Node version:', process.version);

// Try to require dotenv
try {
  require('dotenv');
  console.log('dotenv is available');
} catch (error) {
  console.log('dotenv is not available:', error.message);
}

// Try to require express
try {
  require('express');
  console.log('express is available');
} catch (error) {
  console.log('express is not available:', error.message);
}
