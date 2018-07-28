let fs = require('fs');
const util = require('util');

var open = util.promisify(fs.open);
var read = util.promisify(fs.read);
var close = util.promisify(fs.close);

const DEBUG = false;
const BUFFER_SIZE = 8 * 1024;

function getBufferName(buffer) {
	let end = buffer.indexOf(0x00, 'hex');
	if(end > 0) {
		return buffer.slice(0, end).toString('utf8')
	}
	return 'unknown';
}

async function loadBlocksFromFile (fd, buffer) {
    var offset = 0, 
    fileOffset = 0,
    blocks = {};
    async function readFile(stepForward) {
        fileOffset += stepForward;
        offset = 0;
        if (DEBUG) console.log('reading file', fileOffset);
        // Read the file, callback methods has been promisified with util and returns both the buffer and the bytes read
        return (await read(fd, buffer, 0, buffer.length, fileOffset)).bytesRead;
    }
    let bytesRead = await readFile(0);
    if (!bytesRead || bytesRead < 8) {
        if (DEBUG) console.log("Too few bytes loaded: " + bytesRead);
        return null;
    }
    // check for jpeg magic bytes header
    if (buffer[offset++] != 0xFF || buffer[offset++] != 0xD8) {
        if (DEBUG) console.log("Buffer is not a valid JPEG");
        return false; // it is not a valid jpeg
    }
    
    // Loop through the file looking for the photoshop header bytes
    while (offset < bytesRead) {
        if (buffer[offset] != 0xFF) {
            if (DEBUG) console.log("Not a valid marker at offset " + offset + ", found: " + buffer[offset]);
            return false;
        }

        let blockMarker = buffer[++offset];
         // Start of image scan, end the loop
        if (blockMarker === 0xDA) {
            if(DEBUG) console.log('Start of image', fileOffset + offset);
            break;
        }
        let name = blockMarker;
        // Read block size and load into memory
        let size = buffer.readUInt16BE(++offset);
        let metaBuffer = new Buffer(size - 2);
        await read(fd, metaBuffer, 0, metaBuffer.length, fileOffset + offset + 2);
        
        // Load the block name if it has one
        if(blockMarker === 0xE0 || blockMarker === 0xE1 || blockMarker === 0xE2) {
            name = getBufferName(metaBuffer);
        }
        blocks[name] = metaBuffer;

        // Prepare next iteration
        offset += size;
        if(offset >= bytesRead - 4) {
            bytesRead = await readFile(offset);
        }
    }
    return blocks;
}

module.exports = async function(filePath) {
    let fd;
	try {
		fd = await open(filePath, 'r');
		const buffer = new Buffer(BUFFER_SIZE);
		return await loadBlocksFromFile(fd, buffer);
	} catch (ex) {
		console.error(ex);
	} finally {
		if(fd) {
			close(fd);
		}
	}
}