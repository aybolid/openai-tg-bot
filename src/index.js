require("dotenv").config();

const TelegramBot = require("node-telegram-bot-api");
const { Configuration, OpenAIApi } = require("openai");

const TOKEN = process.env.BOT_TOKEN;
const bot = new TelegramBot(TOKEN, { polling: true });

const configuration = new Configuration({
  apiKey: process.env.OPENAI_API_KEY,
});
const openai = new OpenAIApi(configuration);
console.log("Bot is alive!");

// *===================== COMMANDS =====================* //

const { prompts } = require("./data/prompts");

bot.onText(/\/quiz/, async (msg, _) => {
  const chatId = msg.chat.id;
  const loadingMessage = await bot.sendMessage(chatId, "Створюю вікторину...");

  let poll;

  try {
    const completion = await openai.createChatCompletion({
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "system",
          content: "You are an assistant that helps in creating quizes",
        },
        {
          role: "user",
          content: prompts.quiz,
        },
      ],
    });

    const resp = completion.data.choices[0].message.content;
    poll = JSON.parse(resp);
  } catch (err) {
    console.log("err: ", err);
    bot.editMessageText(
      "Помилка при отриманні даних від ChatGPT. Спробуйте ще раз.",
      {
        chat_id: chatId,
        message_id: loadingMessage.message_id,
      }
    );
    return;
  }

  try {
    await bot.sendPoll(chatId, poll.question, poll.options, {
      correct_option_id: poll.correctId,
      explanation: poll.explanation,
      type: "quiz",
      allows_multiple_answers: false,
      is_anonymous: false,
    });
    bot.deleteMessage(chatId, loadingMessage.message_id);
  } catch (err) {
    console.log("err: ", err);
    bot.editMessageText("Помилка при створенні вікторини. Спробуйте ще раз.", {
      chat_id: chatId,
      message_id: loadingMessage.message_id,
    });
    return;
  }
});
