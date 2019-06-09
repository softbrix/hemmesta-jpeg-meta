
const loadBlocksFromBuffer = require('./lib/loadBlockBuffer');
const loadBlocksFromFile = require('./lib/loadBlockFile');

const DEBUG = false;

function isString (value) {
    return typeof value === 'string' || value instanceof String;
}

/**
 * pathOrBuffer - required parameter with a complete buffer or file path as a string
 */
module.exports = async function(pathOrBuffer) {
	try {
        if (Buffer.isBuffer(pathOrBuffer)) {
            return loadBlocksFromBuffer(pathOrBuffer);
        } else if (isString(pathOrBuffer)) {
		    return loadBlocksFromFile(pathOrBuffer);
        } else {
            throw new Error('Unknown argument type. Expected string or buffer but was: ' + typeof pathOrBuffer);
        }
	} catch (ex) {
        if(DEBUG) console.error(ex);
        throw ex;
	}
}