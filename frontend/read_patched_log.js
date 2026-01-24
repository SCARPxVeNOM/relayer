const fs = require('fs');
try {
    const data = fs.readFileSync('start_error.patched.log', 'utf8');
    console.log(data);
} catch (err) {
    console.error(err);
}
