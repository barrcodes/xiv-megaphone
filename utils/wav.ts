import { writeFileSync } from "node:fs";

type WavFormat = {
  audioFormat: number;
  numChannels: number;
  sampleRate: number;
  bitsPerSample: number;
};

type ParsedWavHeader = WavFormat & {
  dataOffset: number;
  dataSize: number;
};

function parseWavHeader(buffer: Buffer): ParsedWavHeader {
  if (
    buffer.toString("ascii", 0, 4) !== "RIFF" ||
    buffer.toString("ascii", 8, 12) !== "WAVE"
  ) {
    throw new Error("Invalid WAV buffer: missing RIFF/WAVE header");
  }

  let offset = 12;
  let format: WavFormat | null = null;
  let dataOffset = -1;
  let dataSize = -1;

  while (offset + 8 <= buffer.length) {
    const chunkId = buffer.toString("ascii", offset, offset + 4);
    const chunkSize = buffer.readUInt32LE(offset + 4);
    const chunkDataStart = offset + 8;

    if (chunkId === "fmt ") {
      format = {
        audioFormat: buffer.readUInt16LE(chunkDataStart),
        numChannels: buffer.readUInt16LE(chunkDataStart + 2),
        sampleRate: buffer.readUInt32LE(chunkDataStart + 4),
        bitsPerSample: buffer.readUInt16LE(chunkDataStart + 14),
      };
    }

    if (chunkId === "data") {
      dataOffset = chunkDataStart;
      dataSize = chunkSize;
      break;
    }

    offset = chunkDataStart + chunkSize + (chunkSize % 2);
  }

  if (!format) {
    throw new Error("Invalid WAV buffer: missing fmt chunk");
  }

  if (dataOffset < 0 || dataSize < 0) {
    throw new Error("Invalid WAV buffer: missing data chunk");
  }

  return {
    ...format,
    dataOffset,
    dataSize,
  };
}

export function extractPcmFromWav(buffer: Buffer): {
  format: WavFormat;
  pcm: Buffer;
} {
  const header = parseWavHeader(buffer);

  return {
    format: {
      audioFormat: header.audioFormat,
      numChannels: header.numChannels,
      sampleRate: header.sampleRate,
      bitsPerSample: header.bitsPerSample,
    },
    pcm: buffer.subarray(
      header.dataOffset,
      header.dataOffset + header.dataSize
    ),
  };
}

function createWavHeader(format: WavFormat, dataSize: number): Buffer {
  const blockAlign = (format.numChannels * format.bitsPerSample) / 8;
  const byteRate = format.sampleRate * blockAlign;

  const header = Buffer.alloc(44);

  header.write("RIFF", 0);
  header.writeUInt32LE(36 + dataSize, 4);
  header.write("WAVE", 8);

  header.write("fmt ", 12);
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(format.audioFormat, 20);
  header.writeUInt16LE(format.numChannels, 22);
  header.writeUInt32LE(format.sampleRate, 24);
  header.writeUInt32LE(byteRate, 28);
  header.writeUInt16LE(blockAlign, 32);
  header.writeUInt16LE(format.bitsPerSample, 34);

  header.write("data", 36);
  header.writeUInt32LE(dataSize, 40);

  return header;
}

function assertSameFormat(a: WavFormat, b: WavFormat): void {
  const same =
    a.audioFormat === b.audioFormat &&
    a.numChannels === b.numChannels &&
    a.sampleRate === b.sampleRate &&
    a.bitsPerSample === b.bitsPerSample;

  if (!same) {
    throw new Error(
      `WAV chunks have different formats. Expected ${JSON.stringify(
        a
      )}, received ${JSON.stringify(b)}`
    );
  }
}

export type PcmFormat = {
  channels: number;
  sampleRate: number;
  bitDepth: number;
};

export function createSilentPcm(format: PcmFormat, durationSeconds: number): Buffer {
  const bytesPerSample = format.bitDepth / 8;
  const numSamples = Math.ceil(format.sampleRate * durationSeconds);
  const numBytes = numSamples * format.channels * bytesPerSample;
  return Buffer.alloc(numBytes, 0);
}

export function combineWavChunks(
  wavChunks: Array<Buffer | Uint8Array | ArrayBuffer>
) {
  if (wavChunks.length === 0) {
    throw new Error("No WAV chunks provided");
  }

  let expectedFormat: WavFormat | null = null;
  const pcmChunks: Buffer[] = [];

  for (const chunk of wavChunks) {
    const buffer = Buffer.isBuffer(chunk)
      ? chunk
      : chunk instanceof ArrayBuffer
      ? Buffer.from(chunk)
      : Buffer.from(chunk.buffer, chunk.byteOffset, chunk.byteLength);

    const { format, pcm } = extractPcmFromWav(buffer);

    if (!expectedFormat) {
      expectedFormat = format;
    } else {
      assertSameFormat(expectedFormat, format);
    }

    pcmChunks.push(pcm);
  }

  const dataSize = pcmChunks.reduce((total, chunk) => total + chunk.length, 0);
  const header = createWavHeader(expectedFormat!, dataSize);
  return Buffer.concat([header, ...pcmChunks]);
}
