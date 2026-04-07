const { symptomFields } = require("../config/symptomFields");

const symptomQuestions = symptomFields.map(({ id, question, type }) => ({
  id,
  question,
  type,
}));

module.exports = symptomQuestions;