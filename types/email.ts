/**
 * 邮箱服务商类型
 */
export type EmailProvider = 'qq' | '163' | 'gmail' | 'outlook' | 'custom'

/**
 * 邮件附件
 */
export interface EmailAttachment {
  filename: string
  contentType: string
  size: number
}

/**
 * 邮件
 */
export interface Email {
  id: string
  from: string
  fromAddress: string
  subject: string
  date: string
  attachments: EmailAttachment[]
  hasAttachment: boolean
}

/**
 * 邮箱配置
 */
export interface EmailConfig {
  id: string
  name: string
  provider: EmailProvider
  host: string
  port: number
  username: string
  encryptedPassword: string
  tls: boolean
  createdAt: string
  updatedAt: string
}

/**
 * 邮箱配置表单数据
 */
export interface EmailConfigFormData {
  name: string
  provider: EmailProvider
  host: string
  port: number
  username: string
  password: string
  tls: boolean
}

/**
 * 邮箱服务商预设配置
 */
export const EMAIL_PROVIDER_CONFIGS: Record<EmailProvider, { host: string; port: number; tls: boolean; label: string }> = {
  qq: { host: 'imap.qq.com', port: 993, tls: true, label: 'QQ邮箱' },
  '163': { host: 'imap.163.com', port: 993, tls: true, label: '163邮箱' },
  gmail: { host: 'imap.gmail.com', port: 993, tls: true, label: 'Gmail' },
  outlook: { host: 'outlook.office365.com', port: 993, tls: true, label: 'Outlook' },
  custom: { host: '', port: 993, tls: true, label: '自定义' }
}

/**
 * 邮件获取请求
 */
export interface FetchEmailsRequest {
  configId: string
  password: string
  limit?: number
  days?: number
}

/**
 * 邮件获取响应
 */
export interface FetchEmailsResponse {
  success: boolean
  emails: Email[]
  error?: string
}

/**
 * 下载附件请求
 */
export interface DownloadAttachmentRequest {
  configId: string
  password: string
  emailId: string
  attachmentIndex: number
}

/**
 * 下载附件响应
 */
export interface DownloadAttachmentResponse {
  success: boolean
  filename?: string
  contentType?: string
  data?: string // base64 encoded
  error?: string
}
