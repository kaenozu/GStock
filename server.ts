import { createServer } from 'http';
import { parse } from 'url';
import next from 'next';
import { SocketServer } from './src/lib/socket/socket-server';

const dev = process.env.NODE_ENV !== 'production';
const app = next({ dev });
const handle = app.getRequestHandler();

const port = process.env.PORT || 3000;

app.prepare().then(() => {
    const server = createServer((req, res) => {
        const parsedUrl = parse(req.url!, true);
        handle(req, res, parsedUrl);
    });

    // Initialize Socket.io Server
    const socketServer = new SocketServer(server);

    server.listen(port, () => {
        console.log(`> Ready on http://localhost:${port}`);
        console.log(`> WebSocket Server initialized`);
    });
});
