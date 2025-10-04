// Этот файл является СЕКРЕТНЫМ ПОСРЕДНИКОМ, работающим на сервере Vercel.
// Он безопасно обрабатывает запрос, учитывая выбранный тип тренера и текущие задачи.

import { GoogleGenAI } from '@google/genai';

// Имя переменной, которую вы должны создать в Vercel
const apiKey = process.env.GEMINI_API_KEY; 
const ai = new GoogleGenAI({ apiKey });
const model = "gemini-2.5-flash"; 

/**
 * 1. Определяет персонаж тренера, основываясь на выборе пользователя.
 * @param {string} coachType - Тип тренера ('wise', 'energizer', 'strategist').
 * @returns {string} - Инструкция для модели (System Instruction).
 */
function getSystemInstruction(coachType) {
    switch (coachType) {
        case 'wise':
            return "Ты — Мудрый Философ-Наставник. Твой стиль общения спокойный, глубокий, метафоричный. Ты всегда ищешь корневую причину сомнений и предлагаешь решения, основанные на долгосрочных ценностях. Отвечай только по-русски.";
        case 'energizer':
            return "Ты — Энерджайзер-Мотиватор. Твой стиль общения быстрый, очень позитивный и прямой. Используй много восклицательных знаков и призывов к немедленному действию. Отвечай только по-русски. Твоя цель — зажечь и вдохновить.";
        case 'strategist':
            return "Ты — Стратег-Планировщик. Твой стиль общения логичный, структурированный и сфокусирован на конкретных шагах. Ты разбиваешь большие цели на SMART-задачи, помогаешь их организовать, и требуешь отчетности. Отвечай только по-русски.";
        default:
            return "Ты — высококвалифицированный тренер по личностному росту и мотивации. Твой ответ должен быть вдохновляющим, позитивным и содержать конкретные шаги. Отвечай только по-русски.";
    }
}

/**
 * 2. Формирует полный запрос для модели, включая контекст задач.
 * @param {string} prompt - Вопрос пользователя.
 * @param {Array<string>} tasks - Текущий список задач пользователя.
 * @returns {string} - Полный контекстный запрос.
 */
function getFullPrompt(prompt, tasks) {
    if (tasks && tasks.length > 0) {
        const taskList = tasks.map((task, index) => `${index + 1}. ${task}`).join('\n');
        return `
            Пользователь задает вопрос: "${prompt}"

            Контекст: В разделе "Задачи" у пользователя сейчас находятся следующие пункты:
            ---
            ${taskList}
            ---
            Учитывай этот список при формировании ответа и предлагай изменения/добавления в эти задачи, если это уместно.
        `;
    }
    return prompt;
}


export default async function handler(req, res) {
    // Получаем ВСЕ данные из запроса клиента
    const { prompt, coachType, tasks } = req.body; 

    if (!prompt) {
        return res.status(400).json({ error: 'Требуется текстовый запрос (prompt).' });
    }

    try {
        // Выбираем System Instruction (персону)
        const systemInstruction = getSystemInstruction(coachType);
        // Формируем полный Prompt (включая задачи)
        const fullPrompt = getFullPrompt(prompt, tasks);


        const response = await ai.models.generateContent({
            model: model,
            contents: [{ role: "user", parts: [{ text: fullPrompt }] }],
            config: {
                systemInstruction: {
                    parts: [{ text: systemInstruction }]
                }
            }
        });

        const generatedText = response.text;

        // Отправляем ответ обратно в ваш index.html
        res.status(200).json({ text: generatedText });

    } catch (error) {
        console.error("Ошибка при вызове Gemini API:", error);
        res.status(500).json({ error: 'Произошла ошибка при обращении к AI-тренеру. Проверьте ключ GEMINI_API_KEY в Vercel.' });
    }
}