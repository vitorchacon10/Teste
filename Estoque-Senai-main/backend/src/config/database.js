import { Sequelize } from 'sequelize';
import dotenv from 'dotenv';

dotenv.config();

// Se existir DATABASE_URL (é assim que o Render/Railway/etc fornecem o
// endereço do banco Postgres), usamos Postgres — isso é o que vai acontecer
// em produção. Se não existir (seu computador, no dia a dia), continua
// usando o SQLite local, exatamente como já funcionava até agora.
const usaPostgres = !!process.env.DATABASE_URL;

export const sequelize = usaPostgres
  ? new Sequelize(process.env.DATABASE_URL, {
      dialect: 'postgres',
      logging: false,
      dialectOptions: {
        // A maioria dos provedores gratuitos (Render, Railway, etc.) exige
        // SSL, mas com certificado "auto-assinado" — por isso o rejectUnauthorized: false.
        ssl: {
          require: true,
          rejectUnauthorized: false
        }
      }
    })
  : new Sequelize({
      dialect: 'sqlite',
      storage: process.env.DB_STORAGE || './database.sqlite',
      logging: false
    }); 