// Nitro plugin to polyfill 'self' for pouchdb-browser in server context
// PouchDB uses 'self' which exists in browsers but not in Node.js
export default defineNitroPlugin(() => {
  if (typeof globalThis.self === 'undefined') {
    ;(globalThis as any).self = globalThis
  }
})
