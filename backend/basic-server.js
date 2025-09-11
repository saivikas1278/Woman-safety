const http = require('http');
const url = require('url');

const PORT = 5000;

const server = http.createServer((req, res) => {
  const parsedUrl = url.parse(req.url, true);
  
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Content-Type', 'application/json');

  if (parsedUrl.pathname === '/health') {
    res.statusCode = 200;
    res.end(JSON.stringify({
      status: 'OK',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      message: 'Women Safety Backend is running'
    }));
  } else if (parsedUrl.pathname === '/') {
    res.statusCode = 200;
    res.end(JSON.stringify({
      message: 'Women Safety Backend API',
      status: 'running',
      timestamp: new Date().toISOString(),
      endpoints: ['/health', '/']
    }));
  } else {
    res.statusCode = 404;
    res.end(JSON.stringify({
      error: 'Not Found',
      message: `Route ${parsedUrl.pathname} not found`
    }));
  }
});

server.listen(PORT, () => {
  console.log(`✅ Women Safety Backend Server is running!`);
  console.log(`🌐 Server URL: http://localhost:${PORT}`);
  console.log(`📊 Health Check: http://localhost:${PORT}/health`);
  console.log(`🔧 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`📅 Started at: ${new Date().toISOString()}`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM signal received: closing HTTP server');
  server.close(() => {
    console.log('HTTP server closed');
    process.exit(0);
  });
});
