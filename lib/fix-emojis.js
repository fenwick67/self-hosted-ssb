/*

Change emojis from github style :emoji: syntax to actual code points
Example usage:
var md = `fix passwords :heavy_check_mark: :battery: :horse:`
var fixed = fixEmojis(md);

*/


const db = require('./emojidb')
const MOG_MAP={};

db.filter(m=>m.emoji&&m.aliases).forEach(function(entry){  
  entry.aliases.forEach(alias=>{
    MOG_MAP[alias] = entry.emoji;
  })  
});

const emojiRegex = /(\:(\w|\+|\-)+\:)(?=\s|[\!\.\?]|$)/gim;

module.exports = function fixEmojis(input){
  return input.replace(emojiRegex,function(match){
    var uncoloned = match.replace(/\:/g,'');
    if(MOG_MAP[uncoloned]){
      return MOG_MAP[uncoloned];
    }
    return match;
  });
}
