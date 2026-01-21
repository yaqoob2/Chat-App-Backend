const mime = require('mime-types');
console.log('audio/webm ->', mime.extension('audio/webm'));
console.log('audio/webm;codecs=opus ->', mime.extension('audio/webm;codecs=opus'));
