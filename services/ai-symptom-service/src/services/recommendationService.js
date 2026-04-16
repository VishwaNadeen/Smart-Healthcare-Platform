function buildRecommendation(result) {
  return {
    shouldBookAppointment: result.urgency === "medium" || result.urgency === "high",
    shouldStartTelemedicine: result.urgency === "medium",
    emergency: result.urgency === "high"
  };
}

module.exports = { buildRecommendation };