import express from 'express'
import cors from 'cors'
import cookieParser from 'cookie-parser'
import authRoute from './routes/authentication.js'
import profileRoute from './routes/profile.js'
import errorHandler from './middlewares/errorHandlerMiddleware.js'
import adminRoute from './routes/admin.js'
import apiAdminRoute from './routes/apiAdmin.js'
import editRoute from './routes/editContent.js'
import modRoute from './routes/moderatorContent.js'
import publicRoute from './routes/public.js'
import alumniRoute from './routes/alumni.js'
import bodyParser from 'body-parser'

const app = express()

// MiddleWares
app.use(cors({
    origin: [
      process.env.FRONTEND_URL,
      process.env.LOCAL_FRONTEND_URL
    ],
    credentials: true
}));

app.use(cookieParser())
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.json())


app.get('/test', (req, res) => {
    res.send('Test Passed')
})// test Route to check Server status 


app.use('/auth', authRoute) // Authentication route
app.use('/profile', profileRoute) // profile route
app.use('/admin', adminRoute) // admin route
app.use('/api/admin', apiAdminRoute) // api admin route
app.use('/edit', editRoute) // edit content only moderator and admin can do that 
app.use('/mod', modRoute) // get details of the Admin/Moderator Page
app.use('/public', publicRoute) // get details of the Admin/Moderator Page
app.use('/alumni', alumniRoute) // alumni route


// middleware which will handel Errors
app.use(errorHandler)

export default app