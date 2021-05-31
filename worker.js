const { getMaxListeners } = require('./config/winston')

const worker = (app, server) => {
    const logger = require('./config/winston')
    const express = require('express')
    const cookieParser = require('cookie-parser')
    const session = require('express-session')
    const MongoStore = require('connect-mongo')
    const { fork } = require('child_process')
    const Socket = require('socket.io')
    const io = Socket(server)
    const handlebars = require('express-handlebars')
    const Productos = require('./api/productos.js')
    const Mensajes = require('./api/mensajes.js')
    /* ------------------------------------------------- 
    -------------- PASSPORT FACEBOOK--------------------
    ------------------------------------------------- */

    const passport = require('passport');
    const FacebookStrategy = require('passport-facebook')
    const FACEBOOK_CLIENT_ID = process.env.FACEBOOK_CLIENT_ID || '311695*****';
    const FACEBOOK_CLIENT_SECRET = process.env.FACEBOOK_CLIENT_SECRET || 'fc3fe6f65e8********';
    passport.use(new FacebookStrategy({
        clientID: FACEBOOK_CLIENT_ID,
        clientSecret: FACEBOOK_CLIENT_SECRET,
        callbackURL: '/auth/facebook/callback',
        profileFields: ['id', 'displayName', 'photos', 'emails'],
        scope: ['email']
    }, function (accessToken, refreshToken, profile, done) {
        console.log(profile)
        let userProfile = profile;
        console.dir(userProfile, { depth: 4, colors: true })
        return done(null, userProfile);
    }));

    passport.serializeUser(function (user, cb) {
        cb(null, user);
    });

    passport.deserializeUser(function (obj, cb) {
        cb(null, obj);
    });


    /* ------------------------------------------------- 
    -------------- NODEMAILER- ETHEREAL-----------------
    ------------------------------------------------- */
    const nodemailer = require("nodemailer");
    async function sendEmailEthereal(data) {
        const transporter = nodemailer.createTransport({
            service: 'ethereal',
            host: 'smtp.ethereal.email',
            port: 587,
            auth: {
                user: 'jermey23@ethereal.email',
                pass: 'ZYGgZGZS7SaWmNjKZd'
            }
        });
        let info = await transporter.sendMail(data)
        console.log("Preview URL: %s", nodemailer.getTestMessageUrl(info));
    }

    /* ------------------------------------------------- 
    -------------- NODEMAILER- GMAIL--------------------
    ------------------------------------------------- */

    async function sendEmailGmail(data) {
        const transporter = nodemailer.createTransport({
            service: 'gmail',
            host: 'smtp.gmail.email',
            port: 587,
            secure: false,
            requireTLS: true,
            auth: {
                user: 'rubenalbertoeggel@gmail.com',
                pass: '*********'
            }
        });
        let info = await transporter.sendMail(data)
        console.log("Preview URL: %s", nodemailer.getTestMessageUrl(info));
    }
    /* ---------------------------------------------------------------------- */
    /*                                 SMS                                    */
    /* ---------------------------------------------------------------------- */

    const accountSid = 'AC7576bee11e67d056b81*******';
    const authToken = '1904dd0e72eb613e59d********';
    const client = require('twilio')(accountSid, authToken);
    const sendSMS = (dataSMS) => {
        client.messages.create(dataSMS)
            .then(message => console.log(message.sid))
            .catch(console.log)
    }



    /* ------------------------------------------------- */
    app.use(cookieParser())
    app.use(session({
        store: MongoStore.create({
            //En Atlas connect App: Make sure to change the node version to 2.2.12:
            mongoUrl: 'mongodb+srv://Eggel:coderhouse@cluster0.iazms.mongodb.net/ecommerce?retryWrites=true&w=majority',
            //mongoOptions: { useNewUrlParser: true, useUnifiedTopology: true },
            ttl: 600
        }),
        secret: 'shhhhhhhhhhhhhhhhhhhhh',
        resave: false,
        saveUninitialized: false,
        rolling: true,
        cookie: {
            maxAge: 600000
        }
    }))

    app.use(passport.initialize());
    app.use(passport.session());


    let productos = new Productos()
    let mensajes = new Mensajes()

    //--------------------------------------------
    //establecemos la configuración de handlebars
    app.engine(
        "hbs",
        handlebars({
            extname: ".hbs",
            defaultLayout: 'index.hbs',
        })
    );
    app.set("view engine", "hbs");
    app.set("views", "./views");

    //---------------------------------------------------------
    app.use(express.static('public'))
    /* -------------------------------------------------------- */
    /* -------------- LOGIN y LOGOUT DE USUARIO --------------- */
    /* -------------------------------------------------------- */
    app.use(express.urlencoded({ extended: true }))

    /* --------- LOGIN ---------- */
    app.get('/login', (req, res) => {
        if (req.isAuthenticated()) {
            res.render("home", {
                nombre: req.user.displayName,
                foto: req.user.photos[0].value,
                email: req.user.emails[0].value,
                contador: req.user.contador
            })
            let fyh = new Date().toLocaleString()
            /* --------- notificacion por Email Ethereal---------- */
            let data = {
                from: 'Notificaciones del Servidor 👻 desde ethereal.email',
                to: `${req.user.emails[0].value}`,
                subject: "Log Out ",
                html: `<b>Hola ${req.user.displayName} - has hecho Log In ${fyh}  </b>`
            };
            sendEmailEthereal(data).catch(console.error);
            /* --------- notificacion por Email Gmail---------- */
            data = {
                from: "Notificaciones del Servidor 👻 desde gmail.com",
                to: `${req.user.emails[0].value},rubeneggel@gmail.com`,
                subject: "Log In ",
                html: `<h2><b>Hola ${req.user.displayName} - has hecho Log In ${fyh}  </b><h2>
                <h3>Linda Foto!!!!</h3>
                <img src=${req.user.photos[0].value} alt=${req.user.displayName}></img>`
            };
            sendEmailGmail(data).catch(console.error);

        }
        else {
            res.sendFile(process.cwd() + '/public/login.html')
        }
    })


    app.get('/auth/facebook', passport.authenticate('facebook'));
    app.get('/auth/facebook/callback', passport.authenticate('facebook',
        {
            successRedirect: '/home',
            failureRedirect: '/faillogin'
        }
    ));

    app.get('/home', (req, res) => {
        console.log(req.user)
        res.redirect('/')

    })

    app.get('/faillogin', (req, res) => {
        res.render('login-error', {});
    })

    app.get('/logout', (req, res) => {
        let fyh = new Date().toLocaleString()
        let data = {
            from: '"Notificaciones del Servidor 👻" <jermey23@ethereal.email>',
            to: `${req.user.emails[0].value}`,
            subject: "Log Out ",

            html: `<b>Hola ${req.user.displayName} - has hecho Log Out ${fyh}  </b>`
        };
        sendEmailEthereal(data).catch(console.error);


        let nombre = req.user.displayName
        req.logout()
        res.render("logout", { nombre })
    })

    /* -------------------------------------------------------- */
    /* -------------------------------------------------------- */
    /* -------------------------------------------------------- */

    app.get('/info', (req, res) => {
        let argv = []
        process.argv.forEach((val, index) => {
            let newObj = {};
            newObj[index] = val
            argv.push(newObj)
        })

        let info = [{ 'argumento de entrada': argv },
        { 'sistema operativo': process.platform },
        { 'version de node': process.version },
        { 'memoria utilizado MB': process.memoryUsage() },
        { 'path de ejecucion': process.execPath },
        { 'process id: ': process.pid },
        { 'carpeta corriente': process.cwd() }
        ]

        // console.log('argumento de entrada'+argv)
        // console.log('sistema operativo'+ process.platform)
        // console.log('version de node'+ process.version)
        // console.log('path de ejecucion'+ process.execPath)
        // console.log('process id: '+ process.pid)
        // console.log('carpeta corriente'+ process.cwd())

        res.end(`${JSON.stringify(info)}`)
    })

    app.get('/randoms/:cant', (req, res) => {
        const computo = fork('./child/computo.js')

        let { cant } = req.params
        computo.send(cant)
        computo.on('message', sum => {
            res.end(`${sum}`)
        })
    })

    const router = express.Router()
    app.use('/api', router)
    router.use(express.json())
    router.use(express.urlencoded({ extended: true }))
    router.get('/productos/listar', async (req, res) => {
        res.json(await productos.listarAll())
    })

    router.get('/productos/listar/:id', async (req, res) => {
        let { id } = req.params
        res.json(await productos.listar(id))
    })

    router.post('/productos/guardar', async (req, res) => {
        let producto = req.body
        await productos.guardar(producto)
        res.json(producto)
        //res.redirect('/')
    })

    router.put('/productos/actualizar/:id', async (req, res) => {
        let { id } = req.params
        let producto = req.body
        await productos.actualizar(producto, id)
        res.json(producto)
    })

    router.delete('/productos/borrar/:id', async (req, res) => {
        let { id } = req.params
        let producto = await productos.borrar(id)
        res.json(producto)
    })

    router.get('/productos/vista', async (req, res) => {
        let prods = await productos.listarAll()

        res.render("vista", {
            productos: prods,
            hayProductos: prods.length
        })
    })

    router.get('/productos/vista-test', async (req, res) => {

        let cant = req.query.cant || 10
        let prods = []
        for (let i = 0; i < cant; i++) prods.push(getProdRandom(i + 1))

        //console.log(prods)
        res.render("vista", {
            productos: prods,
            hayProductos: prods.length
        })
    })

    /* -------------------- Web Sockets ---------------------- */
    io.on('connection', async socket => {
        console.log('Nuevo cliente conectado!');

        /* ------------------- */   /* Info Productos (ws) */
        /* ------------------- */
        /* Envio los mensajes al cliente que se conectó */
        socket.emit('productos', await productos.get());

        /* Escucho los mensajes enviado por el cliente y se los propago a todos */
        socket.on('update', async data => {
            if (data = 'ok') {
                io.sockets.emit('productos', await productos.get());
            }
        })

        /* ----------------------- */
        /* Centro de mensajes (ws) */
        /* ----------------------- */
        socket.emit('messages', await mensajes.getAll());

        socket.on('new-message', async function (data) {

            await mensajes.guardar(data);
            if (data.text.includes('administrador')) {
                dataSMS = {
                    body: `Nuevo mensaje de ${data.author.nombre} ${data.author.apellido} <${data.author.email}> ${data.fyh}- "${data.text} "`,
                    from: '+19042570175',
                    to: '+5493492520661'
                }
                sendSMS(dataSMS);
                console.log("mensaje enviado por SMS: " + JSON.stringify(dataSMS))
            }
            io.sockets.emit('messages', await mensajes.getAll());
        })
    })
}

module.exports = worker;
