/**
 * pathOrBuffer - required parameter with a buffer
 */
module.exports = async function(pathOrBuffer) {
	try {
        if (Buffer.isBuffer(pathOrBuffer)) {
            return loadBlocksFromBuffer(pathOrBuffer)
        } else {
            throw new Error('Unknown argument type. Expected buffer but was: ' + typeof pathOrBuffer);
        }
	} catch (ex) {
        throw ex;
	}
}