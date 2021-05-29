const express = require('express')
const http = require('http')
const MongoDB = require('./db/db.js')
const logger = require('./config/winston')
const cluster = require('cluster')
const app = express()
const server = http.Server(app)
const worker = require('./worker')
const numCPUs = require('os').cpus().length
const PORT = parseInt(process.argv[2]) || 8080
const modo = process.argv[3] || 'FORK'

if (modo == 'CLUSTER') {
    /* MASTER */
    if (cluster.isMaster) {
        console.log('MODE CLUSTER')
        console.log(numCPUs)
        logger.log('info', `PID MASTER ${process.pid}`)
        // console.log(`PID MASTER ${process.pid}`)
        for (let i = 0; i < numCPUs; i++) {
            cluster.fork()
        }
        cluster.on('exit', worker => {
            logger.log('info', `Server started on port ${port} 'Worker'${worker.process.pid}`);
            // console.log('Worker', worker.process.pid, 'died', new Date().toLocaleString())
            cluster.fork()
        })
    }

    /* WORKERS */
    else {
        //console.log(parseInt(process.argv[2]))
        const PORT = parseInt(process.argv[2]) || 8080
        worker(app, server)
        app.listen(PORT, err => {
            if (!err) {
                logger.log('info', `Servidor express escuchando en el puerto ${PORT} - PID WORKER ${process.pid}`)
                // console.log(`Servidor express escuchando en el puerto ${PORT} - PID WORKER ${process.pid}`)
            }
        })
    }
}

/* MODO FORK*/
else {

    worker(app, server);
    /* ------------------------------------------------------- */
    const srv = server.listen(PORT, async () => {
        logger.log('info', `Servidor http escuchando en el puerto ${srv.address().port} modo ${modo}`)
        // console.log(`Servidor http escuchando en el puerto ${srv.address().port} modo ${modo}`)
        try {
            const mongo = new MongoDB('mongodb+srv://Eggel:coderhouse@cluster0.iazms.mongodb.net/ecommerce?retryWrites=true&w=majority')
            await mongo.conectar()
            logger.log('info', 'base MongoDB conectada')
            // console.log('base MongoDB conectada')
        }
        catch (error) {
            logger.log('error', `Error en conexión de Base de datos: ${error}`)
            // console.log(`Error en conexión de Base de datos: ${error}`)
        }
    })
}