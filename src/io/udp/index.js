const dgram = require("dgram");
const Connection = require("./connection");

class Controller {
    constructor() {   
        this.connections = [];
        this.localAddress;
    }

    async bind(port = 2222, localAddress) {
        this.localAddress = localAddress;
        return new Promise((resolve, reject) => {
            this.socket = dgram.createSocket("udp4");
            this.socket.on("error", (error) => {
                console.log(`Bind error: ${error}`);
                reject(error);
            });
            this.socket.on("listening", () => {
                console.log("Bind successful");
                const address = this.socket.address();
                console.log(`server listening ${address.address}:${address.port}`);
                this._setupMessageEvent();
                resolve(true);
            });
            this.socket.bind({ port: port, address: localAddress });
        });
    }

    addConnection(config, rpi, address, port=2222) {
        let conn = new Connection(port, address, config, rpi, this.localAddress);
        return this.connections[this.connections.push(conn) - 1];
    }

    _setupMessageEvent() {
        this.socket.on("message", data => {
            this._messageRouter(data);
        });
    }

    _messageRouter(data) {
        this.connections.forEach(conn => {
            conn.parseData(data, this.socket);
        });
    }
}

module.exports = Controller;