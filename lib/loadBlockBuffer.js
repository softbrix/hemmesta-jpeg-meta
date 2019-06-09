/**
 * Read block from buffer splits the buffer into JPEG blocks.
 */

const getBufferName = require('./getBufferName')
const DEBUG = false;

module.exports = async function loadBlocksFromBuffer(buffer) {
    var offset = 0, 
    blocks = {};
    let bufferSize = buffer.length;
    if (!bufferSize || bufferSize < 8) {
        throw new Error('Too few bytes: ' + bufferSize);
    }
    blocks['size'] = bufferSize;

    // check for jpeg magic bytes header
    if (buffer[offset++] != 0xFF || buffer[offset++] != 0xD8) {
        throw new Error("Buffer is not a valid JPEG");
    }
    
    // Loop through the file looking for the header bytes
    while (offset < bufferSize) {
        if (buffer[offset] != 0xFF) {
            throw new Error("Not a valid marker at offset " + offset + ", found: " + buffer[offset]);
        }
        const blockStart = offset;
        const blockMarker = buffer[++offset];
         // Start of image scan, end the loop
        if (blockMarker === 0xD9 /* EOI */ || blockMarker === 0xDA /* SOS */) {
            if(DEBUG) console.log('Start of image', offset);
            break;
        }
        let name = blockMarker;
        // Read block size and load into memory
        let size = buffer.readUInt16BE(++offset);
        let metaBuffer = Buffer.alloc(size + 2);
        buffer.copy(metaBuffer, 0, blockStart, metaBuffer.length + blockStart);
        
        // Load the block name if it has one
        if(blockMarker >= 0xE0 && blockMarker <= 0xE9) {
            name = getBufferName(metaBuffer);
        }
        blocks[name] = metaBuffer;

        // Prepare next iteration
        offset += size;
    }
    return blocks;
}