// generate.js
// Обязательно используйте 'node-fetch' для Vercel, если вы не используете @google/genai

// ВАЖНО: Убедитесь, что в Vercel установлена переменная окружения GEMINI_API_KEY

export default async function (req, res) {
    if (req.method !== 'POST') {
        // Разрешаем только POST запросы
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    try {
        const { prompt, coachType, tasks } = req.body;
        
        if (!prompt || !coachType) {
            return res.status(400).json({ error: 'Missing required fields: prompt and coachType.' });
        }

        // 1. Получаем ключ API из переменных окружения Vercel
        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey) {
             console.error("GEMINI_API_KEY is not set in Vercel Environment Variables!");
             return res.status(500).json({ error: 'Server configuration error: API key missing.' });
        }
        
        // 2. Формируем System Instruction (очень важно для persona)
        const systemInstruction = buildSystemInstruction(coachType, tasks);

        // 3. Собираем финальный payload для Google API
        const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-05-20:generateContent?key=${apiKey}`;

        const payload = {
            contents: [{ parts: [{ text: prompt }] }],
            systemInstruction: { parts: [{ text: systemInstruction }] },
        };
        
        // 4. Отправляем запрос (используя fetch, который доступен в Node.js/Vercel)
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        const result = await response.json();

        if (response.ok && result.candidates && result.candidates.length > 0) {
            const text = result.candidates[0].content?.parts?.[0]?.text;
            if (text) {
                // Успешный ответ
                return res.status(200).json({ text: text });
            }
        }
        
        // Обработка ошибок, которые не были перехвачены response.ok (например, bad API key)
        const errorMessage = result.error?.message || 'Failed to generate content.';
        console.error("Gemini API Error:", errorMessage, result);
        return res.status(500).json({ error: errorMessage });

    } catch (error) {
        console.error('Server side error:', error);
        return res.status(500).json({ error: error.message || 'Internal server error.' });
    }
}

// Вспомогательная функция для создания System Instruction
function buildSystemInstruction(coachType, tasks) {
    let instruction = "Ты персональный AI-тренер и мотивационный наставник. Твои ответы должны быть вдохновляющими, полезными и соответствовать твоей выбранной роли.";

    switch (coachType) {
        case 'wise':
            instruction += " Твой стиль: Мудрый Философ. Говори спокойно, используй метафоры, цитаты, фокусируйся на глубинных причинах и долгосрочных целях. Избегай суеты.";
            break;
        case 'energizer':
            instruction += " Твой стиль: Энерджайзер. Говори очень энергично, коротко, с позитивом. Используй восклицательные знаки, эмодзи (не более 3-4 на ответ), мотивируй к немедленному действию.";
            break;
        case 'strategist':
            instruction += " Твой стиль: Стратег-Планировщик. Говори структурно. Разделяй ответ на пункты, предлагай конкретные шаги, используй списки. Сфокусируйся на оптимизации и эффективности.";
            break;
    }

    if (tasks && tasks.length > 0) {
        instruction += ` Твои текущие задачи (пожалуйста, учти их в своем ответе, если это уместно): ${tasks.join('; ')}.`;
    }
    
    return instruction;
}
