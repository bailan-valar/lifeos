/**
 * 客户端凭据加密工具。
 *
 * ⚠️ 安全说明：当前使用基于 userId 派生的 AES-GCM 密钥。
 * 这不是完美的安全方案（userId 理论上可被推测），但在开发阶段能防止：
 * 1. 服务端数据库泄露时直接暴露明文密码
 * 2. 本地 IndexedDB 被直接读取时一眼看到明文
 *
 * 未来应改用用户密码派生密钥（PBKDF2）或 OAuth/token-based CouchDB 认证。
 */

async function deriveKey(userId: string): Promise<CryptoKey> {
  const encoder = new TextEncoder()
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    encoder.encode(userId + '-lifeos-credential-salt'),
    { name: 'PBKDF2' },
    false,
    ['deriveKey']
  )
  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: encoder.encode('lifeos-static-salt-v1'),
      iterations: 100000,
      hash: 'SHA-256'
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  )
}

export async function encryptCredential(userId: string, plain: string): Promise<string> {
  if (!plain) return ''
  const key = await deriveKey(userId)
  const encoder = new TextEncoder()
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const encrypted = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    encoder.encode(plain)
  )
  const combined = new Uint8Array(iv.length + encrypted.byteLength)
  combined.set(iv)
  combined.set(new Uint8Array(encrypted), iv.length)
  return btoa(String.fromCharCode(...combined))
}

export async function decryptCredential(userId: string, cipher: string): Promise<string> {
  if (!cipher) return ''
  const key = await deriveKey(userId)
  const combined = Uint8Array.from(atob(cipher), c => c.charCodeAt(0))
  const iv = combined.slice(0, 12)
  const data = combined.slice(12)
  const decrypted = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv },
    key,
    data
  )
  return new TextDecoder().decode(decrypted)
}
