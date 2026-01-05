import axios from 'axios'
import { env } from '../config/env.js'

const api = axios.create({
  baseURL: env.CIRCULO_CREDITO_BASE_URL,
  headers: {
    'x-api-key': env.CIRCULO_CREDITO_API_KEY,
    'Content-Type': 'application/json'
  },
  timeout: 10000
})

export class CirculoCreditoService {

  static async obtenerResumenCrediticio(rfc) {
    const { data } = await api.get(`/pagos/estadisticas/${rfc}`)
    return data
  }

  static async obtenerObligaciones(rfc) {
    const { data } = await api.get(`/obligaciones/${rfc}`)
    return data
  }

  static async obtenerDetallesObligaciones(rfc) {
    const { data } = await api.get(`/obligaciones/${rfc}/detalles`)
    return data
  }

  static async obtenerPagos(rfc) {
    const { data } = await api.get(`/pagos/${rfc}`)
    return data
  }

  static async obtenerPagosPendientes(rfc) {
    const { data } = await api.get(`/pagos/pendientes/${rfc}`)
    return data
  }

  static async obtenerEstadisticasPago(rfc){
    const { data } = await api.get(`/pagos/estadisticas/${rfc}`)
    return data
  }

  static async obtenerResumenBuro(rfc){
    const { data } = await api.get(`/buro/${rfc}`)
    return data
  }
}
