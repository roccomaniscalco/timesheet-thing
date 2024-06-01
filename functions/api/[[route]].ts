import { apiRoutes } from '@/server/api-routes'
import { handle } from 'hono/cloudflare-pages'

export const onRequest = handle(apiRoutes)
