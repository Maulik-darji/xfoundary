const fs = require('fs');
const code = fs.readFileSync(process.argv[2], 'utf8');

function findImbalance(text) {
    const stack = [];
    const regex = /<(\/?[a-zA-Z0-9]+)(\s+[^>]*)?(\/?)>/g;
    let match;
    
    // Simple state machine to skip comments and strings
    let inJsxComment = false;
    let inString = null; // ' or " or `
    
    // This is hard to do with regex alone on the whole file
    // Let's just use a simpler regex that handles self-closing better
    
    while ((match = regex.exec(text)) !== null) {
        const tagName = match[1].toLowerCase();
        const isClosing = tagName.startsWith('/');
        const isSelfClosing = match[3] === '/';
        const name = isClosing ? tagName.substring(1) : tagName;
        const line = text.substring(0, match.index).split('\n').length;

        // Skip some known HTML tags that don't need closing (though React usually wants them closed)
        const ignore = ['img', 'br', 'hr', 'input', 'link', 'meta'];
        if (ignore.includes(name) && !isClosing) continue;

        if (isSelfClosing) continue;

        if (isClosing) {
            if (stack.length === 0) {
                console.log(`Unexpected closing tag </${name}> at line ${line}`);
            } else {
                const last = stack.pop();
                if (last.name !== name) {
                    console.log(`Mismatched tags: opened <${last.name}> at line ${last.line} but closed with </${name}> at line ${line}`);
                }
            }
        } else {
            stack.push({ name, line });
        }
    }

    console.log(`Remaining in stack: ${stack.length}`);
    stack.forEach(s => console.log(`Unclosed <${s.name}> at line ${s.line}`));
}

findImbalance(code);
