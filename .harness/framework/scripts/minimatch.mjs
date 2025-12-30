/**
 * Minimal minimatch implementation for glob matching
 * Supports: *, **, ?, and basic patterns
 */

export function minimatch(path, pattern) {
    // Handle negation
    if (pattern.startsWith('!')) {
        return !minimatch(path, pattern.slice(1));
    }

    // Normalize path separators
    path = path.replace(/\\/g, '/');
    pattern = pattern.replace(/\\/g, '/');

    // Convert glob pattern to regex
    let regexStr = '';
    let i = 0;

    while (i < pattern.length) {
        const char = pattern[i];
        const next = pattern[i + 1];

        if (char === '*' && next === '*') {
            // ** - match anything including /
            if (pattern[i + 2] === '/') {
                // **/ - match any number of directories (including zero)
                regexStr += '(?:[^/]+/)*';
                i += 3;
            } else {
                // ** at end or without following / - match anything
                regexStr += '.*';
                i += 2;
            }
        } else if (char === '*') {
            // * - match anything except /
            regexStr += '[^/]*';
            i++;
        } else if (char === '?') {
            // ? - match single character except /
            regexStr += '[^/]';
            i++;
        } else if (char === '.') {
            // Escape dots
            regexStr += '\\.';
            i++;
        } else if (char === '/') {
            regexStr += '/';
            i++;
        } else if ('[{()+^$|\\'.includes(char)) {
            // Escape other regex special chars
            regexStr += '\\' + char;
            i++;
        } else {
            regexStr += char;
            i++;
        }
    }

    // Anchor the pattern
    const regex = new RegExp(`^${regexStr}$`);

    try {
        return regex.test(path);
    } catch {
        return false;
    }
}
