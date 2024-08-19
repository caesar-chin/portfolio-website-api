//exmaple: modifies "Weyes Blood, Brooklyn Steel" into "weyes_blood_brooklyn_steel" by removing spaces and punctuation and adding underscores
// comment
exports.modify_string = (occasion_name) => {
  return occasion_name
    .toLowerCase()
    .replace(/[^a-zA-Z0-9]/g, "_")
    .replace(/_{2,}/g, "_");
};

