import DOMPurify from 'dompurify'

// anchors are replaced by links opened in external browser in sanitized html
DOMPurify.addHook('afterSanitizeAttributes', function (node) {
  if (node.nodeName === 'A') {
    node.className = 'external-link'
    node.setAttribute('target', '_blank')
  }
})

export function sanitizeHTML(dirty: string) {
  return DOMPurify.sanitize(dirty, {
    FORBID_ATTR: ['style'],
  })
}
