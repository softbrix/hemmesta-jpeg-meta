let fs = require('fs');
const util = require('util');

var fstat = util.promisify(fs.fstat);
var open = util.promisify(fs.open);
var read = util.promisify(fs.read);
var close = util.promisify(fs.close);

const DEBUG = false;
const BUFFER_SIZE = 8 * 1024;

function getBufferName(buffer) {
    let skip = 4;   // Ignore the APP0 Header blocks (marker, size)
	let end = buffer.indexOf(0x00, skip, 'hex');
	if(end > 0) {
		return buffer.slice(skip, end).toString('utf8')
	}
	return 'unknown';
}

function isString (value) {
    return typeof value === 'string' || value instanceof String;
}

async function readFileSize(fd) {
    let fst = await fstat(fd);
    return fst.size;
}

async function loadBlocks (buffer, bufferSize, readMoreFunc) {
    var offset = 0,
    fullOffset = 0,
    blocks = {};
    async function readMore(stepForward) {
        fullOffset += offset;
        offset = 0;
        return readMoreFunc(stepForward);
    }
    if (!bufferSize || bufferSize < 8) {
        throw new Error('Too few bytes: ' + bufferSize);
    }
    blocks['size'] = bufferSize;
    let bytesRead = await readMore(0);
    if (!bytesRead || bytesRead < 8) {
        throw new Error('Too few bytes loaded: ' + bytesRead);
    }
    // check for jpeg magic bytes header
    if (buffer[offset++] != 0xFF || buffer[offset++] != 0xD8) {
        throw new Error("Buffer is not a valid JPEG");
    }
    
    // Loop through the file looking for the photoshop header bytes
    while (offset < bytesRead) {
        if (buffer[offset] != 0xFF) {
            throw new Error("Not a valid marker at offset " + offset + ", found: " + buffer[offset]);
        }

        const blockStart = offset;
        const blockMarker = buffer[++offset];
         // Start of image scan, end the loop
        if (blockMarker === 0xD9 /* EOI */ || blockMarker === 0xDA /* SOS */) {
            if(DEBUG) console.log('Start of image', fullOffset + offset);
            break;
        }
        let name = blockMarker;
        // Read block size and load into memory
        let size = buffer.readUInt16BE(++offset);
        let metaBuffer = Buffer.alloc(size + 2);
        // Do we have the data in the buffer or do we need to read from file
        if (buffer.length > metaBuffer.length + blockStart) {
            buffer.copy(metaBuffer, 0, blockStart, metaBuffer.length + blockStart);
        } else {
            let bytesToCopy = metaBuffer.length;
            let bytesAvaliable = buffer.length - blockStart;
            let copyStart = blockStart;
            while (offset < bytesRead && bytesToCopy > 0) {
                buffer.copy(metaBuffer, metaBuffer.length - bytesToCopy, copyStart, copyStart + bytesAvaliable);
                bytesToCopy -= bytesAvaliable;
                bytesRead = await readMore(offset);
                copyStart = 0;
                bytesAvaliable = Math.min(buffer.length, bytesToCopy)
            }
        }
        
        // Load the block name if it has one
        if(blockMarker >= 0xE0 && blockMarker <= 0xE9) {
            name = getBufferName(metaBuffer);
        }
        blocks[name] = metaBuffer;

        // Prepare next iteration
        offset += size;
        if(offset >= bytesRead - 4) {
            bytesRead = await readMore(offset);
        }
    }
    return blocks;
}

/**
 * pathOrBuffer - required parameter with a buffer or file path as a string
 * readMoreFunc - method to read more information into the buffer
 */
module.exports = async function(pathOrBuffer, readMoreFunc) {
	try {
        if (Buffer.isBuffer(pathOrBuffer)) {
            readMoreFunc = readMoreFunc || function() { return pathOrBuffer.length };
            return loadBlocks(pathOrBuffer, pathOrBuffer.length, readMoreFunc)
        } else if (isString(pathOrBuffer)) {
            const fd = await open(pathOrBuffer, 'r');
            const buffer = Buffer.alloc(BUFFER_SIZE);
            let fileOffset = 0;
            readMoreFunc = async function readFile(stepForward) {
                fileOffset += stepForward;
                if (DEBUG) console.log('reading file', fileOffset);
                // Read the file, callback methods has been promisified with util and returns both the buffer and the bytes read
                return (await read(fd, buffer, 0, buffer.length, fileOffset)).bytesRead;
            }
		    return loadBlocks(buffer, await readFileSize(fd), readMoreFunc).then((result) => {
                if(fd) {
                    close(fd);
                }
                return result;
            });
        } else {
            throw new Error('Unknown argument type. Expected string or buffer but was: ' + typeof pathOrBuffer);
        }
	} catch (ex) {
        if(DEBUG) console.error(ex);
        throw ex;
	}
}