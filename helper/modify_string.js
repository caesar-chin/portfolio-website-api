//exmaple: modifies "Weyes Blood, Brooklyn Steel" into "weyes_blood_brooklyn_steel" by removing spaces and punctuation and adding underscores
// comment
exports.modify_string = (arrayOfObjects) => {
  return arrayOfObjects
    .filter(obj => Object.keys(obj).length !== 0) // Remove empty objects
    .map(obj => {
      // Iterate over the keys of the object and modify each string value
      let modifiedObj = {};
      for (let key in obj) {
        if (typeof obj[key] === "string") {
          modifiedObj[key] = obj[key]
            .toLowerCase()
            .replace(/[^a-zA-Z0-9]/g, "_")  // Replace special characters with underscores
            .replace(/_{2,}/g, "_");         // Replace multiple underscores with a single one
        } else {
          modifiedObj[key] = obj[key]; // If the value is not a string, keep it as is
        }
      }
      return modifiedObj;
    });
};
