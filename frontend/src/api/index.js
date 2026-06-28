import axios from 'axios'

const api = axios.create({
  baseURL: '/api',
  timeout: 10000
})

export default {
  getOverview: () => api.get('/overview').then(r => r.data),
  getProducts: (params) => api.get('/products', { params }).then(r => r.data),
  getProductDetail: (code) => api.get(`/products/${code}`).then(r => r.data),
  getTopChanges: (limit) => api.get('/top-changes', { params: { limit } }).then(r => r.data),
  getCostStructure: () => api.get('/cost-structure').then(r => r.data),
  getTrend: () => api.get('/trend').then(r => r.data),
  getScatterData: () => api.get('/all-products-scatter').then(r => r.data),
}
