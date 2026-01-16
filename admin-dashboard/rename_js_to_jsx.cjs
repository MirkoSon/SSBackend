const fs = require('fs');
const path = require('path');

function renameRecursive(dir) {
    const files = fs.readdirSync(dir);
    for (const file of files) {
        const fullPath = path.join(dir, file);
        if (fs.statSync(fullPath).isDirectory()) {
            renameRecursive(fullPath);
        } else if (file.endsWith('.js')) {
            const newPath = fullPath.slice(0, -3) + '.jsx';
            fs.renameSync(fullPath, newPath);
            console.log(`Renamed: ${fullPath} -> ${newPath}`);
        }
    }
}

renameRecursive(path.join(__dirname, 'src'));
