import { Hono } from 'hono'
import { SheetRoutes } from './document/sheet'
import { PDFRoutes } from './document/pdf'

const app = new Hono()
app.route('/pdf', PDFRoutes)
app.route('/sheets', SheetRoutes)

export { app as DocumentsRoutes }
