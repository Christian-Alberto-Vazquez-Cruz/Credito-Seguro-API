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
    try {
      const { data } = await api.get(`/obligaciones/${rfc}/detalles`);
      return data;
    } catch (error) {
      if (error.response?.status === 404) {
        return {
          error: false,
          mensaje: 'Sin obligaciones registradas',
          datos: []
        };
      }
      throw error;
    }
  }

  static async obtenerPagos(rfc) {
    const { data } = await api.get(`/pagos/${rfc}`)
    return data
  }

static async obtenerPagosPendientes(rfc) {
    try {
        const { data } = await api.get(`/pagos/${rfc}/pendientes`);
        return data;
    } catch (error) {
        if (error.response?.status === 404) {
            return { error: false, mensaje: 'Sin pagos pendientes', datos: [] };
        }
        throw error;
    }
}

  static async obtenerEstadisticasPago(rfc){
    const { data } = await api.get(`/pagos/estadisticas/${rfc}`)
    return data.datos
  }

  static async obtenerResumenBuro(rfc){
    const { data } = await api.get(`/buro/resumen/${rfc}`)
    return data.datos
  }
}
