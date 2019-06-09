var mediaInfo = require('./index.js');

if (process.argv.length < 3) {
  console.log('Must give source file parameter');
  console.log('Usage: node run.js <source_file>');
  process.exit(1);
}

var sourceFile = process.argv[2];

try {
  mediaInfo(sourceFile).then((info) => {
    if (info) {
        console.log('Size: ', info['size'], 'bytes');

        Object.keys(info).forEach((key) => {
            console.log(key, ':', info[key].length)
        })
    }
    return info;
  });
} catch (ex) {
  console.error(ex);
}