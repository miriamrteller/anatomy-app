const bones = require('./prisma/data/bones.json');
const withAliases = bones.filter(b => b.aliases && b.aliases.length > 0);
console.log('Total bones: ' + bones.length);
console.log('Bones with aliases: ' + withAliases.length);
console.log('Bones without aliases: ' + (bones.length - withAliases.length));
