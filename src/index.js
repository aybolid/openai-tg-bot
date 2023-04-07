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

const fs = require("fs");
const path = require("path");
const ffmpeg = require("fluent-ffmpeg");
const ffmpegPath = require("@ffmpeg-installer/ffmpeg").path;
ffmpeg.setFfmpegPath(ffmpegPath);

bot.on("voice", async (msg) => {
  const chatId = msg.chat.id;
  const fileId = msg.voice.file_id;

  const loadingMessage = await bot.sendMessage(
    chatId,
    "Слухаю голосове повідомлення..."
  );

  const { file_unique_id } = await bot.getFile(fileId);
  const fileStream = bot.getFileStream(fileId);

  const filePath = path.join("./src/data/voices/");
  const fileName = `${file_unique_id}`;

  const fullPath = filePath + fileName + ".ogg";
  fileStream.pipe(fs.createWriteStream(fullPath));

  fileStream.on("close", () => {
    ffmpeg(fullPath)
      .toFormat("mp3")
      .on("error", (err) => {
        console.log("Error:", err);
      })
      .save(filePath + fileName + ".mp3")
      .on("end", async () => {
        const transcript = await openai.createTranscription(
          fs.createReadStream(filePath + fileName + ".mp3"),
          "whisper-1"
        );
        await bot.editMessageText(transcript.data.text, {
          chat_id: chatId,
          message_id: loadingMessage.message_id,
        });
        fs.unlink(fullPath, (err) => {
          if (err) {
            console.error(err);
            return;
          }
        });
        fs.unlink(filePath + fileName + ".mp3", (err) => {
          if (err) {
            console.error(err);
            return;
          }
        });
      });
  });
});
