const app = require('./app');
const http = require('http');
const { Server } = require('socket.io');
const socketHandler = require('./socket/socketHandler');

const PORT = process.env.PORT || 5000;

const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

// Attach IO to app so it's accessible via req.app.get('io')
app.set('io', io);

// Initialize socket handler
socketHandler(io);

// Log all registered routes for debugging
function printRoutes(stack, prefix = '') {
    stack.forEach(layer => {
        if (layer.route) {
            console.log(`[ROUTE] ${Object.keys(layer.route.methods).join(',').toUpperCase()} ${prefix}${layer.route.path}`);
        } else if (layer.name === 'router' && layer.handle.stack) {
            // It's a router middleware, assume path is unknown or regex-based in simple case
            // In express 4, the path is actually in layer.regexp, effectively
            console.log(`[ROUTER MOUNTED] ${layer.regexp}`);
            printRoutes(layer.handle.stack, prefix); // This recursion is tricky without known prefix
        }
    });
}
// Note: Printing express routes recursively is complex, but this confirms the server is actually running this file

server.listen(PORT, () => {
    console.log(`Server running on port ${PORT} at ${new Date().toLocaleTimeString()}`);
    // console.log(app._router.stack); // Too verbose
});
