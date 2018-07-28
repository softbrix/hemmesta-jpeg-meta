const assert = require('assert');
const metaReader = require('../');

let fixture = __dirname + '/test.jpg';

describe('hemmesta-jpeg-meta', function() {
    it('should extract all meta information blocks from the jpeg', function() {
        return metaReader(fixture).then((result) => {
            // console.log(result);
            assert.equal(Object.keys(result).length, 8);
        });
    });
});