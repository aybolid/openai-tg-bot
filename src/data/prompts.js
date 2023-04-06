const prompts = {
  quiz: `Send a JSON object in provided format: 
        { 
          question: poll question (1-300 characters), 
          options: array of 3-10 options (1-100 characters each option), 
          correctId: right answer options array index, 
          explanation: 0-200 characters,
        }
        Do not write anything but JSON.
        Question must be hard to answer.
        Poll language - ukrainian.`,
};

module.exports = {
  prompts,
};
