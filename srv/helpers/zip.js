const yauzl = require('yauzl');
// const yazl = require('yazl');
// const fs = require('fs');

// Package.json requirements to use this module:
// "yauzl": "^2.10.0",
// "yazl": "^2.5.1",

class ZipHelper {
    constructor() {
        this.zipContent = [];
    };

    readZip = async (inputData) => {
        this.zipContent = [];
        return new Promise((resolve, reject) => {
            yauzl.fromBuffer(inputData, { lazyEntries: true }, (err, inputZip) => {
                if (err) { return reject(err); }

                inputZip.readEntry();
                inputZip.on('entry', entry => {
                    inputZip.openReadStream(entry, { decompress: entry.isCompressed() ? true : null }, (err, readStream) => {
                        if (err) {
                            inputZip.close();
                            return reject(err);
                        }

                        let buffer = null;
                        readStream.on('data', d => { buffer = buffer ? Buffer.concat([buffer, d]) : d; });
                        readStream.on('end', () => {
                            this.zipContent[entry.fileName] = buffer;
                            inputZip.readEntry();
                        });
                        readStream.on('error', err => {
                            inputZip.close();
                            return reject(err);
                        });
                    });
                });
                inputZip.on('end', () => resolve(this.zipContent));
            });
        });
    };

    // manipulateZipFile = async (inputFileName, outputFileName) => {
    //     return new Promise((resolve, reject) => {
    //         const outputZip = new yazl.ZipFile();
    //         yauzl.open(inputFileName, { lazyEntries: true }, (err, inputZip) => {
    //             if (err) { return reject(err); }

    //             inputZip.readEntry();
    //             inputZip.on('entry', entry => {
    //                 inputZip.openReadStream(entry, { decompress: entry.isCompressed() ? true : null }, (err, readStream) => {
    //                     if (err) {
    //                         inputZip.close();
    //                         return reject(err);
    //                     }

    //                     let buffer = null;
    //                     readStream.on('data', d => { buffer = buffer ? Buffer.concat([buffer, d]) : d; });
    //                     readStream.on('end', () => {
    //                         if (entry.fileName == 'resources.cnt') {
    //                             buffer = Buffer.from(processFile(buffer.toString()));
    //                         }
    //                         outputZip.addBuffer(buffer, entry.fileName);
    //                         inputZip.readEntry();
    //                     });
    //                     readStream.on('error', err => {
    //                         inputZip.close();
    //                         return reject(err);
    //                     });
    //                 });
    //             });

    //             inputZip.on('end', () => {
    //                 outputZip.end();
    //                 const outputStream = fs.createWriteStream(outputFileName);
    //                 outputZip.outputStream.pipe(outputStream).on('close', () => resolve('ok'));
    //             });
    //         });
    //     });
    // };

    // processFile = (buffer) => {
    //     console.log(buffer);
    //     return buffer;
    // };
};
module.exports = {
    ZipHelper: ZipHelper
};