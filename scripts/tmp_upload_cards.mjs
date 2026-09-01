import { createClient } from '@base44/sdk';
import fs from 'node:fs';

const base44 = createClient({
  appId: '69daf616236dcba44672309d',
  serverUrl: 'https://base44.app',
  requiresAuth: false,
});

const files = [
  ['public/images/dentista-card.webp', 'dentista-card.webp'],
  ['public/images/ginecologo-card.webp', 'ginecologo-card.webp'],
  ['public/images/pediatra-card.webp', 'pediatra-card.webp'],
];

const results = {};
for (const [path, name] of files) {
  const buf = fs.readFileSync(path);
  const file = new File([buf], name, { type: 'image/webp' });
  const { file_url } = await base44.integrations.Core.UploadFile({ file });
  results[name] = file_url;
}
console.log(JSON.stringify(results, null, 2));
