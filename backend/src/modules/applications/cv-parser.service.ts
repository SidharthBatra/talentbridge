import { Injectable } from '@nestjs/common';
import { readFile } from 'fs/promises';
// pdf-parse ships no ESM types entry point compatible with `import x from`
// under our tsconfig, so require() keeps this simple and matches its docs.
// eslint-disable-next-line @typescript-eslint/no-var-requires
const pdfParse = require('pdf-parse');

@Injectable()
export class CvParserService {
  async extractText(filePath: string): Promise<string> {
    const buffer = await readFile(filePath);
    const result = await pdfParse(buffer);
    return result.text.trim();
  }
}
