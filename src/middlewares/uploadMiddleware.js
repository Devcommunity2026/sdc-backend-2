import cloudinary from '../config/cloudConfig.js'
import { CloudinaryStorage } from 'multer-storage-cloudinary'
import multer from 'multer'


const imageStorage = new CloudinaryStorage({
    cloudinary,
    params: async (req, file) => {
        const operation = req.body.operation || "default"

        return {
            folder: 'sdc/images',
            allowed_formats: ['png', 'jpg', 'jpeg'],
            public_id: `${operation}-${Date.now()}`
        }
    }
})

const pdfStorage = new CloudinaryStorage({
    cloudinary,
    params: async (req, file) => {
        const operation = req.body.operation || "default"

        return {
            folder: 'sdc/pdfs',
            resource_type: 'raw',
            allowed_formats: ['pdf'],
            public_id: `${operation}-${Date.now()}`
        }
    }
})

export const imageParser = multer({
    storage: imageStorage,
    limits: {
        fileSize: 5 * 1024 * 1024
    }
})

export const pdfParser = multer({
    storage: pdfStorage,
    limits: {
        fileSize: 10 * 1024 * 1024
    }
})