export const MODELS = [
    {
        id: 'qwen',
        name: '通义千问',
        provider: '阿里云百炼',
        description: '默认启用,无需配置 API Key,使用管理员 Key 调用(5 秒冷却)',
        defaultEnabled: true,
        supportsVision: true,
        color: '#615CED',
    },
    {
        id: 'openai',
        name: 'OpenAI GPT',
        provider: 'OpenAI',
        description: '需在秘钥管理配置 API Key,支持图片理解',
        defaultEnabled: false,
        supportsVision: true,
        color: '#10A37F',
    },
    {
        id: 'deepseek',
        name: 'DeepSeek',
        provider: 'DeepSeek',
        description: '需在秘钥管理配置 API Key,擅长推理与代码',
        defaultEnabled: false,
        supportsVision: false,
        color: '#4D6BFE',
    },
    {
        id: 'claude',
        name: 'Claude',
        provider: 'Anthropic',
        description: '需在秘钥管理配置 API Key,擅长长文本与代码',
        defaultEnabled: false,
        supportsVision: true,
        color: '#D97757',
    },
    {
        id: 'gemini',
        name: 'Gemini',
        provider: 'Google',
        description: '需在秘钥管理配置 API Key,支持多模态与长上下文',
        defaultEnabled: false,
        supportsVision: true,
        color: '#4285F4',
    },
    {
        id: 'glm',
        name: '智谱 GLM',
        provider: '智谱 AI',
        description: '需在秘钥管理配置 API Key,国产大模型,支持中文场景',
        defaultEnabled: false,
        supportsVision: true,
        color: '#3859FF',
    },
    {
        id: 'moonshot',
        name: 'Kimi',
        provider: '月之暗面',
        description: '需在秘钥管理配置 API Key,擅长超长文本处理',
        defaultEnabled: false,
        supportsVision: false,
        color: '#1D1D1F',
    },
    {
        id: 'doubao',
        name: '豆包',
        provider: '火山引擎',
        description: '需在秘钥管理配置 API Key,字节跳动大模型,响应迅速',
        defaultEnabled: false,
        supportsVision: true,
        color: '#1664FF',
    },
    {
        id: 'spark',
        name: '讯飞星火',
        provider: '科大讯飞',
        description: '需在秘钥管理配置 API Key,语音与中文理解能力突出',
        defaultEnabled: false,
        supportsVision: false,
        color: '#00B386',
    },
];
export function getModel(id) {
    return MODELS.find((m) => m.id === id);
}
export const QWEN_COOLDOWN_MS = 5000; // 通义千问 5 秒冷却
// 管理员默认 Key(从环境变量读取,前端不暴露)
export const ADMIN_KEYS = {
    qwen: process.env.QWEN_API_KEY || process.env.DASHSCOPE_API_KEY || '',
};
