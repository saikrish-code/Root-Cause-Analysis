# RCA Project - Localhost Access Guide

## 🚀 Quick Start

The RCA (Root Cause Analysis) system is now ready to run on localhost. Here's everything you need:

## 📍 **Direct Localhost Links**

### **Main Application:**
🔗 **http://localhost:5173**

### **Backend API:**
🔗 **http://localhost:8000**
🔗 **http://localhost:8000/docs** (API documentation)
🔗 **http://localhost:8000/redoc** (API documentation)

## 🛠️ **Project Structure**

```
Root Cause Analysis/
├── backend/
│   ├── app/main.py              # FastAPI application
│   ├── app/ai/                 # AI processing pipeline
│   ├── requirements.txt        # Python dependencies
│   └── tests/                 # Test suite
│       ├── test_ai.py          # AI unit tests
│       ├── test_api.py         # API integration tests
│       └── test_comprehensive_e2e.py  # End-to-end tests
│
├── frontend/
│   ├── src/App.tsx            # React application
│   ├── package.json           # Node.js dependencies
│   └── tests/                # E2E tests
│       └── playwright.e2e.spec.ts
│
├── setup.py                   # Setup script
└── README.md                  # This documentation
```

## 🚀 **How to Start the Project**

### **Option 1: Using Docker (Recommended)**
```bash
# Build and start all services

docker-compose up --build

# Or just start existing containers
docker-compose up -d
```

### **Option 2: Manual Setup**

#### **Step 1: Set Environment Variable**

#### **Step 2: Start Backend**
```bash
# Open a new terminal/command prompt
cd backend

# Set Python path
export PYTHONPATH="backend:$PYTHONPATH"

# Start backend server
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

#### **Step 3: Start Frontend**
```bash
# Open another terminal/command prompt
cd frontend

# Install dependencies
npm install

# Start frontend development server
npm run dev
```

## ✅ **Features Implemented**

- 🎯 **AI Email Processing**: Extract structured data from complaint emails
- 📊 **PDF Investigation Reports**: Process PDF investigation reports
- 🔍 **RCA Workflow**: 5 Whys and Fishbone analysis with AI suggestions
- 📋 **Evidence Management**: Evidence gap identification and tracking
- 🎛️ **CAPA Generation**: Root cause to action plan generation
- 📝 **Audit Logging**: AI vs user source separation
- 🧪 **Comprehensive Testing**: Full E2E test coverage

## 🧪 **Testing**

### **Run Backend Tests**
```bash
cd backend
export PYTHONPATH="backend:$PYTHONPATH"
python -m pytest tests/test_ai.py tests/test_api.py -v
```

### **Run Comprehensive E2E Tests**
```bash
cd backend
export PYTHONPATH="backend:$PYTHONPATH"
python -m pytest tests/test_comprehensive_e2e.py -v
```

## 📊 **Test Coverage**

| Test Category | Status |
|---------------|--------|
| Email Input & Extraction | ✅ Complete |
| PDF Processing | ✅ Complete |
| RCA Analysis | ✅ Complete |
| Evidence Management | ✅ Complete |
| CAPA Workflow | ✅ Complete |
| Audit Logging | ✅ Complete |
| E2E Testing | ✅ Complete |

## 🔧 **Common Issues & Solutions**

### **Import Errors**
```bash
# Fix Python path
cd backend
export PYTHONPATH="backend:$PYTHONPATH"
```

### **GROQ API Key Issues**
```bash
# Verify API key is set
```

### **Port Conflicts**
```bash
# Check if ports are in use
netstat -tuln | grep :8000
netstat -tuln | grep :5173
```

## 📋 **Project Summary**

The RCA project provides a complete solution for:

1. **Automated Investigation**: Process quality deviations automatically
2. **AI-Powered Analysis**: Leverage Groq's AI models for RCA
3. **User Workflow**: Complete end-to-end investigation management
4. **Comprehensive Testing**: Full test coverage including failure cases
5. **Audit Compliance**: Separate tracking of AI vs user changes

**Access the application now:** 🔗 **http://localhost:5173**

## 🛡️ **Support**

If you encounter any issues:
1. Check the README for setup instructions
2. Verify all dependencies are installed
3. Check if any processes are already running on the required ports
4. Review logs for error messages

The system is designed to be production-ready with comprehensive testing and robust error handling.
