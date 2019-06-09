

module.exports = function getBufferName(buffer) {
    let skip = 4;   // Ignore the APP0 Header blocks (marker, size)
	let end = buffer.indexOf(0x00, skip, 'hex');
	if(end > 0) {
		return buffer.slice(skip, end).toString('utf8')
	}
	return 'unknown';
}