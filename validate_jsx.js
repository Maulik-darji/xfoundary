const babel = require('@babel/core');
const fs = require('fs');

try {
    const code = fs.readFileSync(process.argv[2], 'utf8');
    babel.transform(code, {
        filename: process.argv[2],
        presets: ['@babel/preset-react']
    });
    console.log('SUCCESS: File is valid JSX');
} catch (e) {
    console.error('FAILURE:');
    console.error(e.message);
}
