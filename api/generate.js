import { GoogleGenAI } from '@google/genai';

// Используйте переменную окружения для вашего API-ключа. 
// По умолчанию SDK ищет GEMINI_API_KEY.
// Если вы используете другую переменную, замените 'GEMINI_API_KEY' на ее имя.
const apiKey = process.env.GEMINI_API_KEY;

// Инициализация Gemini
let ai;
if (apiKey) {
    ai = new GoogleGenAI({ apiKey });
} else {
    // В случае отсутствия ключа, мы все равно инициализируем, но функция 
    // будет возвращать ошибку 500, пока ключ не будет настроен.
    console.error("GEMINI_API_KEY не установлен. Пожалуйста, установите его в настройках Vercel.");
    ai = null; 
}


// Устанавливаем системную инструкцию для роли AI-коуча
const systemInstruction = {
    parts: [{ 
        text: "Ты — профессиональный AI-коуч по здоровью, фитнесу и питанию. Твои ответы должны быть поддерживающими, мотивирующими, основанными на доказательной медицине и персонализированными. Всегда предлагай конкретные, безопасные и реалистичные шаги. Отвечай только по теме здоровья и фитнеса." 
    }]
};

export default async function handler(req, res) {
    // Убедимся, что это POST-запрос, как и ожидается.
    if (req.method !== 'POST') {
        res.setHeader('Allow', ['POST']);
        return res.status(405).end(`Method ${req.method} Not Allowed`);
    }

    // Если ключ не найден при инициализации, сразу возвращаем ошибку 500
    if (!ai) {
        return res.status(500).json({ 
            error: 'Внутренняя ошибка сервера: не найден GEMINI_API_KEY.', 
            solution: 'Установите переменную окружения GEMINI_API_KEY в настройках Vercel.'
        });
    }

    try {
        const { prompt } = req.body;

        if (!prompt) {
            // Ошибка 400, если в теле запроса нет текста
            return res.status(400).json({ error: 'Отсутствует поле "prompt" в теле запроса.' });
        }
        
        console.log(`Received prompt: ${prompt}`);

        // Вызов API Gemini
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash', // Оптимальная модель для быстрых текстовых запросов
            contents: [{ 
                role: 'user', 
                parts: [{ text: prompt }] 
            }],
            config: {
                systemInstruction: systemInstruction, // Добавляем системную инструкцию
                temperature: 0.7, // Добавляем креативности
                // Для использования Google Search grounding добавьте:
                // tools: [{ google_search: {} }], 
            }
        });

        // Отправляем сгенерированный текст обратно клиенту
        res.status(200).json({ text: response.text });

    } catch (error) {
        // Логируем ошибку и отправляем общий ответ 500
        console.error('Gemini API Call Failed:', error.message);
        // Вместо просто error.message отправляем более понятную ошибку для пользователя
        res.status(500).json({ 
            error: 'Не удалось сгенерировать контент. Проверьте ваш API-ключ, лимиты или формат запроса.', 
            details: error.message 
        });
    }
}
