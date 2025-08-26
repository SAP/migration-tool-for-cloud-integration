import yauzl, { Entry, ZipFileOptions } from 'yauzl'
import yazl from 'yazl'
import fs from 'fs'

import { Settings } from '../config/settings'

// Package.json requirements to use this module:
// "yauzl": "^2.10.0",
// "yazl": "^2.5.1",

export default class ZipHelper {
    zipContent: Record<string, Buffer>

    constructor() {
        this.zipContent = {}
    }

    readZip = async (inputData: Buffer): Promise<Record<string, Buffer>> => {
        this.zipContent = {}
        return new Promise((resolve, reject) => {
            yauzl.fromBuffer(inputData, { lazyEntries: true }, (err, inputZip) => {
                if (err) { return reject(err) }

                inputZip.readEntry()
                inputZip.on('entry', (entry: Entry) => {
                    const options: ZipFileOptions = {
                        decompress: entry.isCompressed() ? true : null,
                        decrypt: null,
                        start: null,
                        end: null
                    }
                    inputZip.openReadStream(entry, options, (err, readStream) => {
                        if (err) {
                            inputZip.close()
                            return reject(err)
                        }

                        let buffer: Buffer
                        readStream.on('data', d => { buffer = buffer ? Buffer.concat([buffer, d]) : d })
                        readStream.on('end', () => {
                            this.zipContent[entry.fileName] = buffer
                            inputZip.readEntry()
                        })
                        readStream.on('error', err => {
                            inputZip.close()
                            return reject(err)
                        })
                    })
                })
                inputZip.on('end', () => resolve(this.zipContent))
            })
        })
    }

    manipulateZipFile = async (inputFileName: string, searchFileName: string, callback: Function): Promise<Buffer> => {
        return new Promise((resolve, reject) => {
            const outputZip = new yazl.ZipFile()
            yauzl.open(inputFileName, { lazyEntries: true }, (err, inputZip) => {
                if (err) { return reject(err) }

                inputZip.readEntry()
                inputZip.on('entry', (entry: Entry) => {
                    const options: ZipFileOptions = {
                        decompress: entry.isCompressed() ? true : null,
                        decrypt: null,
                        start: null,
                        end: null
                    }
                    inputZip.openReadStream(entry, options, (err, readStream) => {
                        if (err) {
                            inputZip.close()
                            return reject(err)
                        }

                        let buffer: Buffer
                        readStream.on('data', d => { buffer = buffer ? Buffer.concat([buffer, d]) : d })
                        readStream.on('end', async () => {
                            if (entry.fileName == searchFileName) {
                                const newContent = await callback(buffer.toString())
                                buffer = Buffer.from(newContent)
                            }
                            outputZip.addBuffer(buffer, entry.fileName)
                            inputZip.readEntry()
                        })
                        readStream.on('error', err => {
                            inputZip.close()
                            return reject(err)
                        })
                    })
                })

                inputZip.on('end', () => {
                    outputZip.end()
                    this.streamToString(outputZip.outputStream).then(data => {
                        Settings.Flags.ManipulateZipFileProduceOutputFile && fs.writeFileSync(inputFileName + '.output.zip', data)
                        resolve(data)
                    })
                })
            })
        })
    }
    streamToString = async (stream: NodeJS.ReadableStream): Promise<Buffer> => {
        let chunks: Buffer[] = []
        return new Promise((resolve, reject) => {
            stream.on('data', (chunk) => chunks.push(Buffer.from(chunk)))
            stream.on('error', (err) => reject(err))
            stream.on('end', () => resolve(Buffer.concat(chunks)))
        })
    }
}
