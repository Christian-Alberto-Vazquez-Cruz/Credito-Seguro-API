import dotenv from 'dotenv'

dotenv.config()

export const env = {
  PORT: process.env.PORT || 3001,
  NODE_ENV: process.env.NODE_ENV || 'development',

  CIRCULO_CREDITO_BASE_URL: process.env.CIRCULO_CREDITO_BASE_URL,
  CIRCULO_CREDITO_API_KEY: process.env.CIRCULO_CREDITO_API_KEY
}
