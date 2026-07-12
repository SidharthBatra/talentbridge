import { BadRequestException } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { existsSync, mkdirSync } from 'fs';
import { diskStorage } from 'multer';
import { join } from 'path';

/**
 * Local-disk CV storage. Fixed path for the hackathon build —
 * swap `diskStorage` for an S3 (multer-s3) storage engine here in
 * production; nothing else in the upload flow needs to change since the
 * controller only ever deals with the returned `file.path` / a stored URL.
 */
export const CV_UPLOAD_DIR = join(process.cwd(), 'uploads', 'cvs');

export const CV_MAX_SIZE_BYTES = 5 * 1024 * 1024; // 5MB

function ensureUploadDir(): void {
  if (!existsSync(CV_UPLOAD_DIR)) {
    mkdirSync(CV_UPLOAD_DIR, { recursive: true });
  }
}
ensureUploadDir();

export const cvMulterOptions = {
  storage: diskStorage({
    destination: (_req: any, _file: any, cb: any) => {
      ensureUploadDir();
      cb(null, CV_UPLOAD_DIR);
    },
    filename: (_req: any, file: any, cb: any) => {
      cb(null, `${randomUUID()}.pdf`);
    },
  }),
  limits: { fileSize: CV_MAX_SIZE_BYTES },
  fileFilter: (_req: any, file: any, cb: any) => {
    if (file.mimetype !== 'application/pdf') {
      cb(
        new BadRequestException('Only PDF files are accepted for CV upload'),
        false,
      );
      return;
    }
    cb(null, true);
  },
};
