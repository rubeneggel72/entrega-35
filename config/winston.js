const winston = require('winston')
var logger = winston.createLogger({
    level: 'warn',
    transports : [
        new winston.transports.Console({level:'info', timestamp: true}),
        new winston.transports.File({ filename: 'warn.log', level:'warn', timestamp: true}),
        new winston.transports.File({ filename: 'error.log', level:'error', timestamp: true}),
    ]
})


module.exports = logger;