/* prettier-ignore-start */

/* eslint-disable */

// @ts-nocheck

// noinspection JSUnusedGlobalSymbols

// This file is auto-generated by TanStack Router

// Import Routes

import { Route as rootRoute } from './routes/__root'
import { Route as IndexImport } from './routes/index'
import { Route as TimesheetsIndexImport } from './routes/timesheets.index'
import { Route as TimesheetsIdImport } from './routes/timesheets.$id'

// Create/Update Routes

const IndexRoute = IndexImport.update({
  path: '/',
  getParentRoute: () => rootRoute
} as any)

const TimesheetsIndexRoute = TimesheetsIndexImport.update({
  path: '/timesheets/',
  getParentRoute: () => rootRoute
} as any)

const TimesheetsIdRoute = TimesheetsIdImport.update({
  path: '/timesheets/$id',
  getParentRoute: () => rootRoute
} as any)

// Populate the FileRoutesByPath interface

declare module '@tanstack/react-router' {
  interface FileRoutesByPath {
    '/': {
      id: '/'
      path: '/'
      fullPath: '/'
      preLoaderRoute: typeof IndexImport
      parentRoute: typeof rootRoute
    }
    '/timesheets/$id': {
      id: '/timesheets/$id'
      path: '/timesheets/$id'
      fullPath: '/timesheets/$id'
      preLoaderRoute: typeof TimesheetsIdImport
      parentRoute: typeof rootRoute
    }
    '/timesheets/': {
      id: '/timesheets/'
      path: '/timesheets'
      fullPath: '/timesheets'
      preLoaderRoute: typeof TimesheetsIndexImport
      parentRoute: typeof rootRoute
    }
  }
}

// Create and export the route tree

export const routeTree = rootRoute.addChildren({
  IndexRoute,
  TimesheetsIdRoute,
  TimesheetsIndexRoute
})

/* prettier-ignore-end */

/* ROUTE_MANIFEST_START
{
  "routes": {
    "__root__": {
      "filePath": "__root.tsx",
      "children": [
        "/",
        "/timesheets/$id",
        "/timesheets/"
      ]
    },
    "/": {
      "filePath": "index.tsx"
    },
    "/timesheets/$id": {
      "filePath": "timesheets.$id.tsx"
    },
    "/timesheets/": {
      "filePath": "timesheets.index.tsx"
    }
  }
}
ROUTE_MANIFEST_END */
