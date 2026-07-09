/**
 * 图像生成服务（文生图）
 * 支持通义万相（qwen）、DALL-E（openai）等
 */
import fs from 'fs';
import path from 'path';
import { randomUUID } from 'crypto';
import { getApiKey } from './keyService.js';
const UPLOADS_DIR = process.env.UPLOADS_DIR || path.join(process.cwd(), 'api/data/uploads');
export async function generateImage(opts) {
    const apiKey = getApiKey(opts.model);
    if (!apiKey) {
        throw new Error(`${opts.model} 未配置 API Key`);
    }
    const size = opts.size || '1024x1024';
    let imageBuffer;
    let fileName;
    let refImageBase64;
    if (opts.referenceImageUrl) {
        refImageBase64 = loadImageAsBase64(opts.referenceImageUrl);
    }
    switch (opts.model) {
        case 'qwen':
            imageBuffer = await genQwenWanxiang(apiKey, opts.prompt, size, refImageBase64, opts.referenceStrength);
            break;
        case 'openai':
            imageBuffer = await genOpenAIDalle(apiKey, opts.prompt, size);
            break;
        default:
            throw new Error(`模型 ${opts.model} 暂不支持图像生成`);
    }
    fileName = `${Date.now()}-${randomUUID()}.png`;
    const filePath = path.join(UPLOADS_DIR, fileName);
    if (!fs.existsSync(UPLOADS_DIR)) {
        fs.mkdirSync(UPLOADS_DIR, { recursive: true });
    }
    fs.writeFileSync(filePath, imageBuffer);
    return {
        url: `/uploads/${fileName}`,
        filePath,
        fileName,
    };
}
async function genQwenWanxiang(apiKey, prompt, size, refImageBase64, refStrength = 0.6) {
    const sizeMap = {
        '1024x1024': '1024*1024',
        '768x1024': '768*1024',
        '1024x768': '1024*768',
        '512x512': '512*512',
    };
    const model = refImageBase64 ? 'wanx2.1-t2i-turbo' : 'wanx2.1-t2i-turbo';
    const input = { prompt };
    if (refImageBase64) {
        input.reference_image = refImageBase64;
    }
    const parameters = {
        size: sizeMap[size] || '1024*1024',
        n: 1,
    };
    if (refImageBase64) {
        parameters.ref_prompt_weight = refStrength;
    }
    const res = await fetch('https://dashscope.aliyuncs.com/api/v1/services/aigc/image-generation/generation', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
            'X-DashScope-Async': 'enable',
        },
        body: JSON.stringify({
            model,
            input,
            parameters,
        }),
    });
    if (!res.ok) {
        const text = await res.text();
        throw new Error(`通义万相请求失败: ${res.status} ${text.slice(0, 200)}`);
    }
    const data = await res.json();
    const taskId = data.output?.task_id;
    if (!taskId) {
        throw new Error(`创建图像任务失败: ${data.message || JSON.stringify(data)}`);
    }
    const imageUrl = await pollQwenTask(apiKey, taskId);
    return await downloadImage(imageUrl);
}
async function pollQwenTask(apiKey, taskId) {
    const maxAttempts = 60;
    const intervalMs = 2000;
    for (let i = 0; i < maxAttempts; i++) {
        await new Promise((r) => setTimeout(r, intervalMs));
        const res = await fetch(`https://dashscope.aliyuncs.com/api/v1/tasks/${taskId}`, {
            headers: { 'Authorization': `Bearer ${apiKey}` },
        });
        if (!res.ok)
            continue;
        const data = await res.json();
        const status = data.output?.task_status;
        if (status === 'SUCCEEDED') {
            const url = data.output?.results?.[0]?.url;
            if (url)
                return url;
            throw new Error('图像生成成功但未获取到图片URL');
        }
        if (status === 'FAILED') {
            throw new Error('图像生成失败');
        }
    }
    throw new Error('图像生成超时');
}
async function genOpenAIDalle(apiKey, prompt, size) {
    const res = await fetch('https://api.openai.com/v1/images/generations', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            model: 'dall-e-3',
            prompt,
            n: 1,
            size,
            response_format: 'b64_json',
        }),
    });
    if (!res.ok) {
        const text = await res.text();
        throw new Error(`DALL-E 请求失败: ${res.status} ${text.slice(0, 200)}`);
    }
    const data = await res.json();
    const item = data.data?.[0];
    if (item?.b64_json) {
        return Buffer.from(item.b64_json, 'base64');
    }
    if (item?.url) {
        return await downloadImage(item.url);
    }
    throw new Error('DALL-E 返回数据格式异常');
}
async function downloadImage(url) {
    const res = await fetch(url);
    if (!res.ok)
        throw new Error(`下载图片失败: ${res.status}`);
    const arrayBuffer = await res.arrayBuffer();
    return Buffer.from(arrayBuffer);
}
function loadImageAsBase64(imageUrl) {
    if (imageUrl.startsWith('data:')) {
        return imageUrl;
    }
    if (imageUrl.startsWith('/uploads/')) {
        const fileName = imageUrl.replace('/uploads/', '');
        const filePath = path.join(UPLOADS_DIR, fileName);
        if (fs.existsSync(filePath)) {
            const ext = path.extname(filePath).toLowerCase();
            const mimeMap = {
                '.jpg': 'image/jpeg',
                '.jpeg': 'image/jpeg',
                '.png': 'image/png',
                '.gif': 'image/gif',
                '.webp': 'image/webp',
                '.bmp': 'image/bmp',
            };
            const mime = mimeMap[ext] || 'image/jpeg';
            const data = fs.readFileSync(filePath).toString('base64');
            return `data:${mime};base64,${data}`;
        }
    }
    throw new Error('参考图片不存在');
}
