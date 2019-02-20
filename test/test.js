const assert = require('assert');
const metaReader = require('../');

let fixture = __dirname + '/test.jpg';
let non_fixture = __dirname + '/does_not_exist.jpg';

describe('hemmesta-jpeg-meta', function() {
    it('should extract all meta information blocks from the jpeg file', function() {
        return metaReader(fixture).then((result) => {
            assert.equal(Object.keys(result).length, 9);
            assert.equal(result['size'], 93696);
        });
    });

    it('should extract all meta information blocks from the jpeg buffer', function() {
        let fs = require('fs');
        let buffer = fs.readFileSync(fixture)
        return metaReader(buffer).then((result) => {
            assert.equal(Object.keys(result).length, 9);
            assert.equal(result['size'], 93696);
        });
    });

    it('should report if file is invalid', function() {
        metaReader(non_fixture).then((result) => {
            assert.fail('Did not report invalid file');
        }).catch(ex => {
            assert.ok(ex);
            assert(ex.message);
            assert(ex.message.startsWith('ENOENT: no such file or directory, open'));
        });
    });

    it('should report if argument is invalid', function() {
        metaReader(1).then((result) => {
            assert.fail('Did not report invalid argument');
        }).catch(ex => {
            assert.ok(ex);
            assert(ex.message);
            assert(ex.message.startsWith('Unknown argument type'));
        });
    });
});