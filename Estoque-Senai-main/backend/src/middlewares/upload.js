import multer from 'multer';
import path from 'path';
import { cloudinary, usaCloudinary } from '../config/cloudinary.js';

// Storage engine manual para o Cloudinary (evita o pacote multer-storage-cloudinary,
// que exige cloudinary@1.x e conflita com a versão 2.x que usamos aqui).
class CloudinaryStorageEngine {
  constructor(opts = {}) {
    this.folder = opts.folder || 'uploads';
  }

  _handleFile(req, file, cb) {
    const uploadStream = cloudinary.uploader.upload_stream(
      { folder: this.folder },
      (error, result) => {
        if (error) return cb(error);
        cb(null, {
          path: result.secure_url,   // URL completa (o que o app usa como photoUrl)
          filename: result.public_id, // id no Cloudinary (usado se precisar excluir depois)
          size: result.bytes
        });
      }
    );
    file.stream.pipe(uploadStream);
  }

  _removeFile(req, file, cb) {
    if (!file.filename) return cb(null);
    cloudinary.uploader.destroy(file.filename, cb);
  }
}

let storage;

if (usaCloudinary) {
  storage = new CloudinaryStorageEngine({ folder: 'senai-zerbini-estoque' });
} else {
  storage = multer.diskStorage({
    destination: (_, __, cb) => cb(null, 'src/uploads'),
    filename: (_, file, cb) => cb(null, Date.now() + '-' + Math.round(Math.random() * 1E9) + path.extname(file.originalname))
  });
}

export const upload = multer({ storage });