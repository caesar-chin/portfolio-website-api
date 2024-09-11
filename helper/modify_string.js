//exmaple: modifies "Weyes Blood, Brooklyn Steel" into "weyes_blood_brooklyn_steel" by removing spaces and punctuation and adding underscores
// comment
exports.modify_string = (occasion_name) => {
  return occasion_name
    .toLowerCase()  // Convert the string to lowercase
    .replace(/[^a-zA-Z0-9]+/g, "_")  // Replace one or more non-alphanumeric characters with a single underscore
    .replace(/^_+|_+$/g, "");  // Remove leading and trailing underscores
};
