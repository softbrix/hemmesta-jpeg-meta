const fs = require('fs');
const util = require('util');
const getBufferName = require('./getBufferName');

const fstat = util.promisify(fs.fstat);
const open = util.promisify(fs.open);
const read = util.promisify(fs.read);
const close = util.promisify(fs.close);

const DEBUG = false;
const BUFFER_SIZE = 8 * 1024;

async function readSize(fd) {
    let fst = await fstat(fd);
    return fst.size;
} 

async function loadBlocksFromFile(fd) {
    var offset = 0, 
    fileOffset = 0,
    blocks = {};
    const buffer = Buffer.alloc(BUFFER_SIZE);
    async function readFile(stepForward) {
        fileOffset += stepForward;
        offset = 0;
        if (DEBUG) console.log('reading file', fileOffset);
        // Read the file, callback methods has been promisified with util and returns both the buffer and the bytes read
        return (await read(fd, buffer, 0, buffer.length, fileOffset)).bytesRead;
    }
    let bufferSize = await readSize(fd);
    if (!bufferSize || bufferSize < 8) {
        throw new Error('Too few bytes: ' + bufferSize);
    }
    blocks['size'] = bufferSize;
    let bytesRead = await readFile(0);
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
            if(DEBUG) console.log('Start of image', fileOffset + offset);
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
            await read(fd, metaBuffer, 0, metaBuffer.length, fileOffset + offset - 2);
        }
        
        // Load the block name if it has one
        if(blockMarker >= 0xE0 && blockMarker <= 0xE9) {
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

module.exports = async function (pathOrBuffer) {
    const fd = await open(pathOrBuffer, 'r');
    return loadBlocksFromFile(fd).then((result) => {
        if(fd) {
            close(fd);
        }
        return result;
    });
};
