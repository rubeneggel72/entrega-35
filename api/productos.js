const ProductosMongoDB=require('../db/productos.js')
var logger=require('../config/winston')
class Productos {
    constructor() {
        this.productosMongoDB = new ProductosMongoDB()
    }

    async get() {
        let productos = await this.productosMongoDB.leer()
        
        return productos.length? productos : []
    }

    async listar(id) {
        
        let prod = await this.productosMongoDB.leer(id)
    
        return prod || {error : 'producto no encontrado'}
    }

    async listarAll() {
        let productos = await this.productosMongoDB.leer()
        return productos.length? productos : {error : 'no hay productos cargados'}
    }

    async guardar(prod) {
        return await this.productosMongoDB.guardar(prod)
    }

    async actualizar(prod,id) {
        return await this.productosMongoDB.actualizar(prod,id)
    }

    async borrar(id) {
        return await this.productosMongoDB.borrar(id)
    }
}

module.exports= Productos
