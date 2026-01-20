// Crie um arquivo teste-env.js:
require('dotenv').config();
console.log('HF_TOKEN:', process.env.HF_TOKEN || 'Não encontrado');
console.log('NODE_ENV:', process.env.NODE_ENV || 'Não encontrado');

// Execute:
// node teste-env.js