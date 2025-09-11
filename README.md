# Women's Safety MERN Application

A comprehensive women's safety platform built with MERN stack (MongoDB, Express.js, React, Node.js) featuring real-time incident tracking, IoT device integration, and emergency response coordination.

## 🚀 Features

### Core Safety Features
- **Real-time SOS System**: Instant emergency alerts with live location tracking
- **IoT Device Integration**: Smart safety bands with fall detection, tamper alerts
- **Emergency Contacts**: Automated notifications to trusted contacts and responders
- **Live Location Tracking**: Real-time GPS monitoring during incidents
- **Voice Recording**: Automatic audio capture during emergencies
- **Community Network**: Local volunteer responder system

### User Management
- **Multi-role Authentication**: Users, volunteers, admins with role-based access
- **Device Pairing**: Secure Bluetooth/WiFi device registration
- **Profile Management**: Emergency contacts, medical info, preferences
- **Two-Factor Authentication**: Enhanced security with SMS/app verification

### Advanced Features
- **Geofencing**: Safe/unsafe zone alerts and notifications
- **Incident Analytics**: Heatmaps, response time metrics, safety insights
- **Admin Dashboard**: System monitoring, user management, incident coordination
- **Offline Support**: Store-and-forward capability when network unavailable

## 🏗️ Architecture

```
├── backend/                 # Node.js/Express API Server
│   ├── src/
│   │   ├── controllers/     # Route handlers
│   │   ├── models/         # MongoDB schemas
│   │   ├── routes/         # API routes
│   │   ├── middleware/     # Auth, validation, logging
│   │   ├── services/       # Business logic
│   │   ├── utils/          # Helper functions
│   │   └── websocket/      # Socket.IO handlers
│   ├── tests/              # Unit and integration tests
│   └── config/             # Database and environment config
│
├── frontend/               # React.js Web Application
│   ├── src/
│   │   ├── components/     # Reusable UI components
│   │   ├── pages/          # Main application pages
│   │   ├── store/          # Redux state management
│   │   ├── services/       # API calls and utilities
│   │   ├── hooks/          # Custom React hooks
│   │   └── utils/          # Helper functions
│   └── public/             # Static assets
│
└── docs/                   # Documentation
    ├── api/                # API documentation
    ├── deployment/         # Deployment guides
    └── architecture/       # System design docs
```

## 🛠️ Tech Stack

### Backend
- **Runtime**: Node.js 18+
- **Framework**: Express.js
- **Database**: MongoDB with Mongoose ODM
- **Real-time**: Socket.IO for WebSocket connections
- **Authentication**: JWT with refresh tokens
- **Validation**: Joi for request validation
- **Security**: Helmet, CORS, rate limiting
- **Logging**: Winston with structured logging
- **Testing**: Jest with Supertest

### Frontend
- **Framework**: React 18 with TypeScript
- **State Management**: Redux Toolkit with RTK Query
- **UI Library**: Material-UI (MUI) v5
- **Maps**: Mapbox GL JS
- **Real-time**: Socket.IO client
- **Forms**: React Hook Form with Yup validation
- **Routing**: React Router v6
- **Testing**: Jest with React Testing Library

### DevOps & Infrastructure
- **Containerization**: Docker and Docker Compose
- **CI/CD**: GitHub Actions
- **Monitoring**: Prometheus with Grafana
- **Logging**: ELK Stack (Elasticsearch, Logstash, Kibana)
- **Cloud**: AWS/GCP deployment ready

## 📋 Prerequisites

- Node.js 18+ and npm
- MongoDB 6.0+
- Redis (for caching and sessions)
- Git

## 🚀 Quick Start

### 1. Clone and Install
```bash
git clone <repository-url>
cd women-safety-mern
npm run install-all
```

### 2. Environment Setup
```bash
# Backend environment
cp backend/.env.example backend/.env
# Edit backend/.env with your configuration

# Frontend environment  
cp frontend/.env.example frontend/.env
# Edit frontend/.env with your configuration
```

### 3. Database Setup
```bash
# Start MongoDB and Redis
# Update connection strings in backend/.env
```

### 4. Run Development Servers
```bash
npm run dev
```

This starts:
- Backend API server: http://localhost:5000
- Frontend React app: http://localhost:3000

## 🔧 Environment Variables

### Backend (.env)
```env
NODE_ENV=development
PORT=5000
MONGODB_URI=mongodb://localhost:27017/women-safety
JWT_SECRET=your-jwt-secret
JWT_REFRESH_SECRET=your-refresh-secret
REDIS_URL=redis://localhost:6379

# External Services
SMS_API_KEY=your-sms-gateway-key
EMAIL_SERVICE_KEY=your-email-service-key
MAPBOX_TOKEN=your-mapbox-token
FCM_SERVER_KEY=your-fcm-key

# File Upload
CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=your-api-key
CLOUDINARY_API_SECRET=your-api-secret
```

### Frontend (.env)
```env
REACT_APP_API_URL=http://localhost:5000/api
REACT_APP_SOCKET_URL=http://localhost:5000
REACT_APP_MAPBOX_TOKEN=your-mapbox-token
```

## 📚 API Documentation

### Authentication Endpoints
```
POST /api/auth/register     # User registration
POST /api/auth/login        # User login
POST /api/auth/refresh      # Refresh JWT token
POST /api/auth/logout       # User logout
POST /api/auth/verify-otp   # OTP verification
```

### Device Management
```
GET    /api/devices         # List user devices
POST   /api/devices/pair    # Pair new device
DELETE /api/devices/:id     # Unpair device
GET    /api/devices/:id/status # Device status
```

### Incident Management
```
GET    /api/incidents       # List incidents
POST   /api/incidents       # Create incident (device trigger)
PUT    /api/incidents/:id   # Update incident
GET    /api/incidents/:id   # Get incident details
```

### Real-time WebSocket Events
```
incident:created           # New incident notification
incident:updated           # Incident status change
location:update            # Live location tracking
responder:assigned         # Responder assignment
device:status              # Device status change
```

## 🔐 Security Features

- **JWT Authentication**: Secure token-based authentication
- **Rate Limiting**: API endpoint protection
- **Data Encryption**: Sensitive data encryption at rest
- **Input Validation**: Comprehensive request validation
- **CORS Configuration**: Cross-origin request security
- **Helmet.js**: Security headers protection
- **Audit Logging**: Complete action audit trail

## 🧪 Testing

```bash
# Run all tests
npm test

# Backend tests only
cd backend && npm test

# Frontend tests only
cd frontend && npm test

# Test coverage
npm run test:coverage
```

## 📊 Monitoring & Analytics

- **Application Metrics**: Response times, error rates
- **Business Metrics**: Incident response times, user engagement
- **System Health**: Database performance, API availability
- **Security Monitoring**: Failed login attempts, suspicious activity

## 🚀 Deployment

### Development
```bash
npm run dev
```

### Production Build
```bash
npm run build
npm start
```

### Docker Deployment
```bash
docker-compose up -d
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Commit changes: `git commit -m 'Add amazing feature'`
4. Push to branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

For support and questions:
- Create an issue on GitHub
- Email: support@women-safety.com
- Documentation: [docs/](docs/)

## 🗺️ Roadmap

- [ ] Mobile app development (React Native)
- [ ] Advanced AI features (fall detection, anomaly detection)
- [ ] Integration with local emergency services
- [ ] Multi-language support
- [ ] Wearable device SDK
- [ ] Machine learning for predictive safety analytics

---

**⚠️ Important**: This is a safety-critical application. Always follow security best practices and conduct thorough testing before deployment.
