const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const swaggerUi = require('swagger-ui-express');
const swaggerJsdoc = require('swagger-jsdoc');
const path = require('path');

dotenv.config();

const app = express();

const swaggerOptions = {
    definition: {
        openapi: '3.0.0',
        info: {
            title: 'Unified Communication App API',
            version: '1.0.0',
            description: 'API documentation for the chat application',
        },
        servers: [
            {
                url: 'http://localhost:5000/api',
            },
        ],
        components: {
            securitySchemes: {
                bearerAuth: {
                    type: 'http',
                    scheme: 'bearer',
                    bearerFormat: 'JWT',
                },
            },
        },
        security: [{
            bearerAuth: []
        }],
    },
    apis: [path.join(__dirname, './routes/*.js')], // Use absolute path
};

const swaggerDocs = swaggerJsdoc(swaggerOptions);
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocs));

// Middleware
app.use(cors({ origin: process.env.FRONTEND_URL }));
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Routes - with explicit error handling
console.log('📦 Mounting routes...');

try {
    const authRoutes = require('./routes/authRoutes');
    app.use('/api/auth', authRoutes);
    console.log('✅ Auth routes mounted at /api/auth');
} catch (err) {
    console.error('❌ Failed to mount auth routes:', err.message);
}

try {
    const chatRoutes = require('./routes/chatRoutes');
    app.use('/api/chat', chatRoutes);
    console.log('✅ Chat routes mounted at /api/chat');
} catch (err) {
    console.error('❌ Failed to mount chat routes:', err.message);
}

try {
    const callRoutes = require('./routes/callRoutes');
    app.use('/api/calls', callRoutes);
    console.log('✅ Call routes mounted at /api/calls');
} catch (err) {
    console.error('❌ Failed to mount call routes:', err.message);
}

// Basic Route
app.get('/', (req, res) => {
    res.send('Unified Communication App API is running');
});

// 404 handler
app.use((req, res) => {
    console.log(`⚠️  404 - Route not found: ${req.method} ${req.url}`);
    res.status(404).json({
        error: 'Route not found',
        requested: `${req.method} ${req.url}`,
        availableRoutes: ['/api/auth', '/api/chat', '/api/calls']
    });
});

module.exports = app;
