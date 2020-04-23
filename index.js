const fastify = require('fastify')
const fastifyMultipart = require('fastify-multipart')
const concat = require('concat-stream')
const fastifyReplyFrom = require('fastify-reply-from')
const FormData = require('form-data')

const express = require('express')
const multer = require('multer')

const uploadMw = multer()

/**
 * TAGRET SERVER - express
 */
const target = express()

target.post(
  '/', 
  uploadMw.single('file'),
  (request, reply) => {
    console.log('==================================')
    console.log('Target - request received')
    console.log('File - ', request.file)
    console.log('==================================')
    reply.send(`File received: ${request.file.originalname}`)
  }
)

/**
 * PROXY SERVER - fastify
 */
const proxy = fastify({ logger: true })

proxy.register(fastifyMultipart)

proxy.register(fastifyReplyFrom, {
  base: 'http://localhost:3001/'
})

proxy.post('/', (request, reply) => {
  function _handleFile(field, file, filename, encoding, mimetype) {
    file.pipe(concat(function (buf) {
      const form = new FormData()

      form.append('file', buf, {
        filename,
        contentType: mimetype
      })

      request.body = form
    }))
  }

  function _onEnd(err) {
    // TODO: handle err
    const newHeader = request.body.getHeaders()

    reply.from('/', {
      rewriteRequestHeaders: (originalReq, headers) => {
        return newHeader
      }
    })
  }

  request.multipart(_handleFile, _onEnd)
})

// SERVER INIT
target.listen(3001, (err) => {
  if (err) {
    throw err
  }

  console.log('Target server is listening on 3001')

  proxy.listen(3000, (err) => {
    if (err) {
      throw err
    }
  })
})