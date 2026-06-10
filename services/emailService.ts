import type { EmailConfig, Email, FetchEmailsRequest, FetchEmailsResponse, DownloadAttachmentResponse } from '~/types/email'

/**
 * 测试邮箱连接
 */
export async function testEmailConnection(config: EmailConfig, password: string): Promise<{ success: boolean; error?: string }> {
  try {
    const response = await $fetch<{ success: boolean; error?: string }>('/api/email/test-connection', {
      method: 'POST',
      body: {
        host: config.host,
        port: config.port,
        username: config.username,
        password,
        tls: config.tls
      }
    })
    return response
  } catch (e: any) {
    return { success: false, error: e.message || '连接测试失败' }
  }
}

/**
 * 获取邮件列表
 */
export async function fetchEmails(request: FetchEmailsRequest): Promise<FetchEmailsResponse> {
  try {
    const response = await $fetch<FetchEmailsResponse>('/api/email/fetch-mails', {
      method: 'POST',
      body: request
    })
    return response
  } catch (e: any) {
    return { success: false, emails: [], error: e.message || '获取邮件失败' }
  }
}

/**
 * 下载附件
 */
export async function downloadAttachment(
  configId: string,
  password: string,
  emailId: string,
  attachmentIndex: number
): Promise<DownloadAttachmentResponse> {
  try {
    const response = await $fetch<DownloadAttachmentResponse>('/api/email/download-attachment', {
      method: 'POST',
      body: {
        configId,
        password,
        emailId,
        attachmentIndex
      }
    })
    return response
  } catch (e: any) {
    return { success: false, error: e.message || '下载附件失败' }
  }
}

/**
 * 根据附件内容判断导入来源
 */
export function detectImportSourceFromFilename(filename: string): 'alipay' | 'wechat' | 'cmb' | 'cmb_credit' | null {
  const name = filename.toLowerCase()
  if (name.includes('alipay') || name.includes('支付宝')) {
    return 'alipay'
  }
  if (name.includes('wechat') || name.includes('微信')) {
    return 'wechat'
  }
  if (name.includes('cmb') && (name.includes('credit') || name.includes('信用卡'))) {
    return 'cmb_credit'
  }
  if (name.includes('cmb') || name.includes('招商')) {
    return 'cmb'
  }
  return null
}

/**
 * 获取用户信息（用于加密）
 */
export function getCurrentUserId(): string {
  if (import.meta.client) {
    return localStorage.getItem('lifeos:active-workspace-id') || ''
  }
  return ''
}
