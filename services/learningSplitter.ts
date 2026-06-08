/**
 * 学习目标 AI 智能拆分服务
 *
 * 调用 Claude API 将学习目标拆分为多个阶段和课程单元
 * 参考数据结构：六边形战士训练手册
 */

import type {
  AISplitRequest,
  AISplitResponse,
  LearningDimension,
  LearningDimensionConfig,
  LearningStage
} from '~/types/goal'

/**
 * 临时类型：包含 sessions 的阶段（用于预设模板）
 */
interface StageWithSessions {
  stageNo: number
  name: string
  weeks: string
  description?: string
  totalSessions: number
  completedSessions: number
  status: 'pending' | 'in_progress' | 'completed' | 'paused'
  order: number
  sessions: Array<{
    sessionNo: number
    title: string
    learn: string
    practice: string
    completed: boolean
    order: number
  }>
}

/**
 * 学习维度配置
 */
export const LEARNING_DIMENSIONS: Record<LearningDimension, LearningDimensionConfig> = {
  comm: { id: 'comm', name: '沟通表达', color: '#185FA5', description: '从"说得清楚"到"说得动人"' },
  psych: { id: 'psych', name: '心理洞察', color: '#BA7517', description: '社交、沟通、管理的底层操作系统' },
  pro: { id: 'pro', name: '专业硬实力', color: '#534AB7', description: 'T型发展：先竖后横' },
  social: { id: 'social', name: '社交情商', color: '#0F6E56', description: '社交能力可以刻意练习' },
  mgmt: { id: 'mgmt', name: '领导管理', color: '#993C1D', description: '从管理自己到管理组织' },
  learn: { id: 'learn', name: '学习思维', color: '#3B6D11', description: '元能力中的元能力' },
  energy: { id: 'energy', name: '身心能量', color: '#993556', description: '一切能力的底盘' }
}

/**
 * 默认系统提示词
 */
const DEFAULT_SYSTEM_PROMPT = `你是一位专业的学习教练，擅长将学习目标拆解为可执行的阶段化训练方案。

你的任务：
1. 分析用户的学习目标，识别其所属维度（comm=沟通表达, psych=心理洞察, pro=专业硬实力, social=社交情商, mgmt=领导管理, learn=学习思维, energy=身心能量）
2. 将目标拆分为 4 个阶段，每个阶段 2 周
3. 每个阶段设计 6-8 个学习单元（课程）
4. 每个学习单元包含：
   - title: 单元标题（简短有力）
   - learn: 学习内容（150-200字，说明核心概念和知识点）
   - practice: 实战练习（具体可执行的行动指令，50-100字）

输出格式：
必须返回合法的 JSON 对象，包含以下结构：
{
  "dimension": "维度ID",
  "goalDescription": "一句话描述这个学习目标",
  "estimatedWeeks": 8,
  "stages": [
    {
      "name": "阶段一：XXX",
      "weeks": "第1-2周",
      "description": "阶段描述（20字以内）",
      "sessions": [
        {
          "title": "单元标题",
          "learn": "学习内容",
          "practice": "实战练习"
        }
      ]
    }
  ]
}

原则：
- 从基础到进阶，循序渐进
- 每个阶段有明确的主题和目标
- 学习内容要精炼，避免冗长
- 实战练习要具体可执行
- 用词专业但不晦涩
- 考虑学习曲线，避免一开始就太难`

/**
 * Anthropic API 配置
 */
const ANTHROPIC_API_URL = 'https://api.anthropic.com/v1/messages'
const ANTHROPIC_API_VERSION = '2023-06-01'

/**
 * 获取 API Key
 */
function getApiKey(): string {
  // 优先从客户端缓存获取（用户手动输入）
  if (import.meta.client) {
    const cachedKey = (window as any).__LEARNING_ANTHROPIC_KEY__
    if (cachedKey) return cachedKey

    // 从 runtime config 获取
    // @ts-expect-error - useNuxtApp 在服务端不可用
    const nuxtApp = window.__NUXT__?.config
    return nuxtApp?.anthropicApiKey || ''
  }

  // 服务端从环境变量获取
  return process.env.ANTHROPIC_API_KEY || ''
}

/**
 * 设置 API Key（客户端调用）
 */
export function setAnthropicApiKey(key: string): void {
  if (import.meta.client) {
    ;(window as any).__LEARNING_ANTHROPIC_KEY__ = key
  }
}

/**
 * 获取是否已配置 API Key
 */
export function hasApiKey(): boolean {
  return !!getApiKey()
}

/**
 * 调用 Claude API 进行学习目标拆分
 */
export async function splitLearningGoal(request: AISplitRequest): Promise<AISplitResponse> {
  const apiKey = getApiKey()

  if (!apiKey) {
    throw new Error('未配置 Anthropic API Key，请在设置中添加')
  }

  const systemPrompt = request.dimension
    ? `${DEFAULT_SYSTEM_PROMPT}\n\n用户指定维度为：${LEARNING_DIMENSIONS[request.dimension].name}（${LEARNING_DIMENSIONS[request.dimension].id}）`
    : DEFAULT_SYSTEM_PROMPT

  const userPrompt = `请将以下学习目标拆解为阶段化训练方案：${request.title}

${request.dimension ? `指定维度：${LEARNING_DIMENSIONS[request.dimension].name}` : ''}

请返回 JSON 格式的拆分结果。`

  try {
    const response = await fetch(ANTHROPIC_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': ANTHROPIC_API_VERSION
      },
      body: JSON.stringify({
        model: 'claude-3-haiku-20240307',
        max_tokens: 4000,
        system: systemPrompt,
        messages: [
          {
            role: 'user',
            content: userPrompt
          }
        ]
      })
    })

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`API 请求失败: ${response.status} ${error}`)
    }

    const data = await response.json()

    if (data.error) {
      throw new Error(`API 错误: ${data.error.message}`)
    }

    // 解析响应内容
    const content = data.content?.[0]?.text || ''
    const jsonMatch = content.match(/```json\s*([\s\S]*?)\s*```/) || content.match(/\{[\s\S]*\}/)

    if (!jsonMatch) {
      throw new Error('无法解析 AI 响应，请重试')
    }

    const parsed = JSON.parse(jsonMatch[1] || jsonMatch[0])

    // 转换为 AISplitResponse 格式
    return convertToResponse(parsed, request)
  } catch (error: any) {
    if (error.message?.includes('API Key')) {
      throw new Error('API Key 无效，请检查配置')
    }
    throw error
  }
}

/**
 * 将 AI 响应转换为标准格式
 */
function convertToResponse(aiResult: any, request: AISplitRequest): AISplitResponse {
  const stages = aiResult.stages || []
  let sessionCount = 0
  let order = 1

  const flatStages = stages.map((stage: any, stageIdx: number) => {
    const sessions = (stage.sessions || []).map((session: any) => ({
      sessionNo: ++sessionCount,
      title: session.title || `第${sessionCount}课`,
      learn: session.learn || '',
      practice: session.practice || '',
      completed: false,
      order: order++
    }))

    return {
      stageNo: stageIdx + 1,
      name: stage.name || `阶段${stageIdx + 1}`,
      weeks: stage.weeks || `第${stageIdx * 2 + 1}-${stageIdx * 2 + 2}周`,
      description: stage.description || '',
      totalSessions: sessions.length,
      completedSessions: 0,
      status: stageIdx === 0 ? 'in_progress' : 'pending',
      order: stageIdx + 1,
      sessions
    }
  })

  return {
    goal: {
      title: request.title,
      dimension: aiResult.dimension || request.dimension || 'learn',
      description: aiResult.goalDescription || '',
      aiGenerated: true,
      totalStages: flatStages.length,
      estimatedWeeks: aiResult.estimatedWeeks || 8,
      totalSessions: sessionCount,
      status: 'pending',
      completedSessions: 0
    },
    stages: flatStages,
    sessions: flatStages.flatMap((stage: any, stageIdx: number) =>
      stage.sessions.map((session: any) => ({
        ...session,
        stageNo: stageIdx + 1
      }))
    )
  }
}

/**
 * 从参考数据结构中获取预定义的拆分模板
 * 用于某些常见学习目标的快速拆分（无需调用 API）
 */
export function getPresetSplit(goalTitle: string): AISplitResponse | null {
  const normalized = goalTitle.toLowerCase()

  // 沟通表达预设
  if (normalized.includes('沟通') || normalized.includes('表达') || normalized.includes('演讲')) {
    return getCommPreset()
  }

  // 心理洞察预设
  if (normalized.includes('心理') || normalized.includes('洞察') || normalized.includes('认知')) {
    return getPsychPreset()
  }

  return null
}

/**
 * 沟通表达预设模板（参考 training-data.json）
 */
function getCommPreset(): AISplitResponse {
  const preset: {
    goal: AISplitResponse['goal']
    stages: StageWithSessions[]
  } = {
    goal: {
      title: '沟通表达提升',
      dimension: 'comm',
      description: '从"说得清楚"到"说得动人"',
      aiGenerated: true,
      totalStages: 4,
      estimatedWeeks: 8,
      totalSessions: 32,
      status: 'pending',
      completedSessions: 0
    },
    stages: [
      {
        stageNo: 1,
        name: '阶段一：清晰表达基础',
        weeks: '第1-2周',
        description: '消除口头禅，掌握基础表达技巧',
        totalSessions: 8,
        completedSessions: 0,
        status: 'in_progress',
        order: 1,
        sessions: [
          { sessionNo: 1, title: '消除填充词', learn: '识别"嗯、啊、然后、那个"等口头禅；了解填充词对可信度的损害', practice: '录一段2分钟自我介绍，回听并标记每个填充词，重录直到≤2个', completed: false, order: 1 },
          { sessionNo: 2, title: '一句话概括力', learn: '学习"结论先行"原则；区分主题句与支撑句', practice: '拿今天读的一篇文章，用一句话说出核心观点', completed: false, order: 2 },
          { sessionNo: 3, title: '语速与停顿控制', learn: '理想语速150-180字/分钟；停顿的3种作用', practice: '朗读一段200字文字，用手机测速，刻意在句号处停顿1秒', completed: false, order: 3 },
          { sessionNo: 4, title: '听众意识入门', learn: '沟通不是"我要说什么"而是"对方需要听什么"', practice: '同一件事分别讲给老板、同事、外行朋友听', completed: false, order: 4 },
          { sessionNo: 5, title: '观点先行训练', learn: '金字塔原理入门：结论→理由→证据', practice: '复盘最近一次工作汇报，用"观点先行"格式重写开头3句话', completed: false, order: 5 },
          { sessionNo: 6, title: '具体化表达', learn: '用数字、案例、类比替代模糊表述', practice: '把"这个项目效果很好"改成包含具体数据和对比的表述', completed: false, order: 6 },
          { sessionNo: 7, title: '积极倾听', learn: '倾听的3个层次；复述确认技巧', practice: '下次对话中刻意复述对方的话"你的意思是……对吗？"至少用3次', completed: false, order: 7 },
          { sessionNo: 8, title: '阶段复盘', learn: '回顾前7单元；做一次综合自评', practice: '找一个人做5分钟正式自我介绍+话题阐述，请对方给反馈', completed: false, order: 8 }
        ]
      },
      {
        stageNo: 2,
        name: '阶段二：结构化表达',
        weeks: '第3-4周',
        description: '掌握MECE、SCQA、PREP等框架',
        totalSessions: 8,
        completedSessions: 0,
        status: 'pending',
        order: 2,
        sessions: [
          { sessionNo: 9, title: 'MECE原则', learn: '相互独立、完全穷尽；常见分类错误', practice: '把"如何提高工作效率"用MECE拆成3-5个不重叠的子问题', completed: false, order: 9 },
          { sessionNo: 10, title: 'SCQA叙事框架', learn: '情境→冲突→问题→答案', practice: '用SCQA框架重写一封工作周报', completed: false, order: 10 },
          { sessionNo: 11, title: 'PREP说服公式', learn: 'Point→Reason→Example→Point', practice: '选一个有观点的议题，用PREP格式写一段200字发言稿', completed: false, order: 11 },
          { sessionNo: 12, title: 'STAR法则', learn: 'Situation→Task→Action→Result', practice: '用STAR法则写2个你自己的成就案例', completed: false, order: 12 },
          { sessionNo: 13, title: '归纳与演绎', learn: '归纳推理vs演绎推理；什么时候用哪个', practice: '分析一篇社论，标注哪些是归纳、哪些是演绎', completed: false, order: 13 },
          { sessionNo: 14, title: '视觉辅助原则', learn: '一页一观点；图表优于文字', practice: '把你上次汇报的PPT拿出来，每页砍到只剩一个核心信息', completed: false, order: 14 },
          { sessionNo: 15, title: '逻辑漏洞自查', learn: '常见逻辑谬误：偷换概念、以偏概全等', practice: '找一篇网络热帖，找出其中至少3个逻辑谬误', completed: false, order: 15 },
          { sessionNo: 16, title: '阶段复盘', learn: '综合运用结构框架做一次正式表达', practice: '准备一个5分钟主题分享，至少用到MECE+SCQA+PREP中的两种', completed: false, order: 16 }
        ]
      },
      {
        stageNo: 3,
        name: '阶段三：说服与影响力',
        weeks: '第5-6周',
        description: '情感共鸣、数据叙事、框架效应',
        totalSessions: 8,
        completedSessions: 0,
        status: 'pending',
        order: 3,
        sessions: [
          { sessionNo: 17, title: '情感共鸣技巧', learn: '故事的力量；镜像神经元原理', practice: '准备一个与你工作/生活相关的真实故事，控制在2分钟以内', completed: false, order: 17 },
          { sessionNo: 18, title: '数据叙事', learn: '数据+上下文才是信息；用对比让数字有意义', practice: '找一组公开数据，用"对比+故事"的方式讲成1分钟的洞察', completed: false, order: 18 },
          { sessionNo: 19, title: '框架效应', learn: '损失框架vs收益框架', practice: '同一件事分别用损失框架和收益框架写两版沟通文案', completed: false, order: 19 },
          { sessionNo: 20, title: '异议处理模型', learn: 'LQA模型：Listen→Question→Answer', practice: '找朋友角色扮演，练习LQA回应', completed: false, order: 20 },
          { sessionNo: 21, title: '互惠与承诺一致', learn: '西奥迪尼影响力原则', practice: '在接下来一周中，主动给3个人提供有价值的信息', completed: false, order: 21 },
          { sessionNo: 22, title: '社会证明与权威', learn: '人们从众的原因；恰当使用社会证明', practice: '分析一个成功的产品营销案例中的社会证明元素', completed: false, order: 22 },
          { sessionNo: 23, title: '谈判基础', learn: 'BATNA；锚定效应', practice: '模拟一次薪资谈判，写出你的BATNA和开场锚', completed: false, order: 23 },
          { sessionNo: 24, title: '阶段复盘', learn: '综合运用说服技巧', practice: '选一个重要但尚未说服成功的话题，设计一套完整的说服策略', completed: false, order: 24 }
        ]
      },
      {
        stageNo: 4,
        name: '阶段四：高阶表达',
        weeks: '第7-8周',
        description: '公众演讲、即兴表达、危机沟通',
        totalSessions: 8,
        completedSessions: 0,
        status: 'pending',
        order: 4,
        sessions: [
          { sessionNo: 25, title: '公众演讲设计', learn: 'TED演讲公式：1个核心观点+1个故事+1个行动号召', practice: '准备一个5分钟TED风格演讲提纲，录制并回看', completed: false, order: 25 },
          { sessionNo: 26, title: '开场与结尾', learn: '开场的7种方式；结尾的峰值效应', practice: '为一个话题设计3种不同的开场方式', completed: false, order: 26 },
          { sessionNo: 27, title: '即兴表达', learn: 'AREM模型：Answer→Reason→Example→Message', practice: '准备5个随机话题纸条，抽一个讲1分钟', completed: false, order: 27 },
          { sessionNo: 28, title: 'Q&A应对', learn: '处理不会的问题：PAR方法', practice: '准备一个主题让别人向你提问5分钟，练习PAR应对', completed: false, order: 28 },
          { sessionNo: 29, title: '书面表达升级', learn: '商务写作原则：一句话一信息', practice: '拿出一篇你之前写的长邮件，砍掉30%字数而不丢信息', completed: false, order: 29 },
          { sessionNo: 30, title: '跨文化沟通', learn: '高语境vs低语境文化', practice: '研究一个你经常打交道的外国文化，列出3个沟通注意事项', completed: false, order: 30 },
          { sessionNo: 31, title: '危机沟通', learn: '道歉的4要素', practice: '模拟一次你做错了事的道歉场景，写一封道歉邮件', completed: false, order: 31 },
          { sessionNo: 32, title: '终极挑战', learn: '回顾全部31个单元', practice: '做一次10分钟公开分享，录像并做全面复盘', completed: false, order: 32 }
        ]
      }
    ]
  }

  // 提取所有 sessions 到顶层，并添加 stageId
  const allSessions: NonNullable<AISplitResponse['sessions']> = []
  preset.stages.forEach((stage) => {
    stage.sessions.forEach((session) => {
      allSessions.push({
        ...session,
        // stageId 会在创建时设置
      })
    })
  })

  // 转换为 AISplitResponse
  return {
    goal: preset.goal,
    stages: preset.stages.map((s): Omit<LearningStage, 'id' | 'goalId' | 'createdAt'> => {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { sessions, ...rest } = s
      return {
        ...rest,
        description: rest.description || ''
      }
    }),
    sessions: allSessions
  }
}

/**
 * 心理洞察预设模板
 */
function getPsychPreset(): AISplitResponse {
  const preset: {
    goal: AISplitResponse['goal']
    stages: StageWithSessions[]
  } = {
    goal: {
      title: '心理洞察提升',
      dimension: 'psych',
      description: '从认识自己到理解他人，再到影响行为',
      aiGenerated: true,
      totalStages: 4,
      estimatedWeeks: 8,
      totalSessions: 24,
      status: 'pending',
      completedSessions: 0
    },
    stages: [
      {
        stageNo: 1,
        name: '阶段一：自我认知',
        weeks: '第1-2周',
        description: '认知偏差、情绪识别、人格理解',
        totalSessions: 6,
        completedSessions: 0,
        status: 'in_progress',
        order: 1,
        sessions: [
          { sessionNo: 1, title: '认知偏差基础', learn: '确认偏误、可得性启发、锚定效应', practice: '回顾今天做的一个决策，找出可能影响你的至少2个认知偏差', completed: false, order: 1 },
          { sessionNo: 2, title: '情绪识别与命名', learn: '情绪颗粒度；基本情绪vs复合情绪', practice: '建立情绪日记，今天起每天记录3次"此刻我感受到什么情绪"', completed: false, order: 2 },
          { sessionNo: 3, title: '大五人格入门', learn: 'OCEAN模型：开放性、尽责性、外向性、宜人性、神经质', practice: '做一次大五人格测评，写下你对结果的3个认同和2个意外', completed: false, order: 3 },
          { sessionNo: 4, title: '自我叙事', learn: '你对自己讲的故事决定了你是谁', practice: '写下"我是一个___的人"的5个填空，问自己：这是事实还是故事？', completed: false, order: 4 },
          { sessionNo: 5, title: '防御机制识别', learn: '否认、投射、合理化、升华', practice: '回忆一次让你不舒服的冲突，分析自己和对方可能用了什么防御机制', completed: false, order: 5 },
          { sessionNo: 6, title: '价值观澄清', learn: '价值观是行为的底层驱动', practice: '从50个价值观词卡中挑出最重要的5个，排序并写下为什么', completed: false, order: 6 }
        ]
      },
      {
        stageNo: 2,
        name: '阶段二：理解他人',
        weeks: '第3-4周',
        description: '共情训练、非语言沟通、归因理论',
        totalSessions: 6,
        completedSessions: 0,
        status: 'pending',
        order: 2,
        sessions: [
          { sessionNo: 7, title: '共情训练', learn: '认知共情vs情感共情', practice: '找一个与你观点不同的人的文章，用"对方的视角"写一段总结', completed: false, order: 7 },
          { sessionNo: 8, title: '非语言沟通', learn: '肢体语言、面部表情、语调', practice: '看一段静音访谈视频，猜测情绪，再开声音验证', completed: false, order: 8 },
          { sessionNo: 9, title: '归因理论', learn: '基本归因错误', practice: '回忆最近一次你对别人不满的事，用"情境归因"重新解释', completed: false, order: 9 },
          { sessionNo: 10, title: '群体心理', learn: '从众实验、群体极化、责任扩散', practice: '观察下一次团队会议，记录至少2个群体心理现象', completed: false, order: 10 },
          { sessionNo: 11, title: '人格障碍常识', learn: '了解边缘型、自恋型、回避型', practice: '反思过往关系中让你困惑的人，看是否有模式可循', completed: false, order: 11 },
          { sessionNo: 12, title: '依恋风格', learn: '安全型、焦虑型、回避型、混乱型', practice: '做依恋风格测评，思考它如何影响你的工作关系', completed: false, order: 12 }
        ]
      },
      {
        stageNo: 3,
        name: '阶段三：影响力与改变',
        weeks: '第5-6周',
        description: '西奥迪尼原则、习惯形成、行为设计',
        totalSessions: 6,
        completedSessions: 0,
        status: 'pending',
        order: 3,
        sessions: [
          { sessionNo: 13, title: '西奥迪尼6原则', learn: '互惠、承诺一致、社会证明、喜好、权威、稀缺', practice: '分析你最近被说服的消费决策，拆解对方用了哪些原则', completed: false, order: 13 },
          { sessionNo: 14, title: '习惯形成', learn: '习惯回路：触发→行为→奖励', practice: '选一个想建立的微小习惯，设计触发+奖励机制，本周开始执行', completed: false, order: 14 },
          { sessionNo: 15, title: '动机科学', learn: '内在动机vs外在动机；自我决定论', practice: '审视你现在的工作/学习动力，思考如何增强内在动机', completed: false, order: 15 },
          { sessionNo: 16, title: '决策心理', learn: '选择过载、损失厌恶、现状偏差', practice: '下次做重要决策时，用"10-10-10法则"', completed: false, order: 16 },
          { sessionNo: 17, title: '行为设计', learn: 'Fogg行为模型B=MAP', practice: '选一个想改变的行为，设计"让正确的事变容易"的方案', completed: false, order: 17 },
          { sessionNo: 18, title: '说服伦理边界', learn: '影响vs操纵的界限', practice: '回顾你最近一次说服别人的经历，画出"影响"和"操纵"的边界线', completed: false, order: 18 }
        ]
      },
      {
        stageNo: 4,
        name: '阶段四：高阶应用',
        weeks: '第7-8周',
        description: '积极心理学、心理韧性、团队心理安全',
        totalSessions: 6,
        completedSessions: 0,
        status: 'pending',
        order: 4,
        sessions: [
          { sessionNo: 19, title: '积极心理学', learn: 'PERMA幸福模型；心流状态', practice: '做VIA品格优势测评，接下来一周每天在工作中使用你的标志性优势', completed: false, order: 19 },
          { sessionNo: 20, title: '心理韧性', learn: '抗逆力4C模型', practice: '回忆你经历过的最难的一件事，分析你用了哪些韧性资源', completed: false, order: 20 },
          { sessionNo: 21, title: '团队心理安全', learn: '心理安全是高效团队第一要素', practice: '评估你所在团队的心理安全水平，列出3件可做的事', completed: false, order: 21 },
          { sessionNo: 22, title: '冲突心理学', learn: '冲突的5种处理方式', practice: '分析最近一次人际冲突，你用了哪种方式？最优方式是什么？', completed: false, order: 22 },
          { sessionNo: 23, title: '行为面试心理学', learn: '面试官的认知偏差', practice: '从心理学角度重新准备一次面试', completed: false, order: 23 },
          { sessionNo: 24, title: '综合复盘', learn: '心理学24单元的整合应用', practice: '选一个真实的人际/工作难题，综合运用心理洞察提出解决方案', completed: false, order: 24 }
        ]
      }
    ]
  }

  // 提取所有 sessions 到顶层，并添加 stageId
  const allSessions: NonNullable<AISplitResponse['sessions']> = []
  preset.stages.forEach((stage) => {
    stage.sessions.forEach((session) => {
      allSessions.push({
        ...session,
        // stageId 会在创建时设置
      })
    })
  })

  // 转换为 AISplitResponse
  return {
    goal: preset.goal,
    stages: preset.stages.map((s): Omit<LearningStage, 'id' | 'goalId' | 'createdAt'> => {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { sessions, ...rest } = s
      return {
        ...rest,
        description: rest.description || ''
      }
    }),
    sessions: allSessions
  }
}
