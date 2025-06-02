import DOMPurify from 'dompurify'

const newlineTags = new Set([ 'P', 'DIV', 'BR', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6']);

// If the tag implies a newline, add a newline. Otherwise ignore.
DOMPurify.addHook('uponSanitizeElement', function (node) {
    if (node.tagName && newlineTags.has(node.tagName)) {
        node.textContent += '\n';
    }
});

export function stripAllHTML(htmlString: string) {
    return DOMPurify.sanitize( htmlString, {
        ALLOWED_TAGS:[]}
    ).trim();
}
