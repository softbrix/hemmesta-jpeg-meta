const assert = require('assert');
const metaReader = require('../');

let fixture = __dirname + '/test.jpg';
let non_fixture = __dirname + '/does_not_exist.jpg';

describe('hemmesta-jpeg-meta', function() {
    it('should extract all meta information blocks from the jpeg', function() {
        return metaReader(fixture).then((result) => {
            assert.equal(Object.keys(result).length, 9);
            assert.equal(result['size'], 93696);
        });
    });

    it('should report if file is invalid', function() {
        metaReader(non_fixture).then((result) => {
            assert.fail('Did not report ivalid file');
        }).catch(ex => {
            assert.ok(ex);
            assert(ex.message);
            assert(ex.message.startsWith('ENOENT: no such file or directory, open'));
        });
    });
});