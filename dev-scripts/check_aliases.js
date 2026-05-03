import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const bonesPath = path.join(__dirname, '../prisma/data/bones.json');
const bonesData = fs.readFileSync(bonesPath, 'utf8');
const bones = JSON.parse(bonesData);
const withAliases = bones.filter(b => b.aliases && b.aliases.length > 0);
console.log('Total bones: ' + bones.length);
console.log('Bones with aliases: ' + withAliases.length);
console.log('Bones without aliases: ' + (bones.length - withAliases.length));
