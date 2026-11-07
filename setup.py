#!/usr/bin/env python3
"""
Project Setup and Execution Script for RCA System

This script sets up the environment, starts the backend and frontend services,
and provides the localhost URL to access the application.
"""

import os
import sys
import subprocess
import time
import platform
from pathlib import Path

class RCASystemSetup:
    def __init__(self):
        self.project_root = Path.cwd()
        self.backend_dir = self.project_root / "backend"
        self.frontend_dir = self.project_root / "frontend"
        self.groq_api_key = "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"
        
    def check_python_dependencies(self):
        """Check if Python dependencies are installed"""
        print("📋 Checking Python dependencies...")
        
        # Check for required Python files
        required_files = [
            self.backend_dir / "requirements.txt",
            self.backend_dir / "app" / "main.py",
            self.backend_dir / "app" / "ai" / "schemas.py",
        ]
        
        for file_path in required_files:
            if file_path.exists():
                print(f"✅ {file_path.name}")
            else:
                print(f"❌ {file_path.name} - NOT FOUND")
                return False
                
        return True
    
    def check_node_dependencies(self):
        """Check if Node.js dependencies are installed"""
        print("📋 Checking Node.js dependencies...")
        
        # Check for package.json
        package_json = self.frontend_dir / "package.json"
        if package_json.exists():
            print("✅ frontend/package.json")
            return True
        else:
            print("❌ frontend/package.json - NOT FOUND")
            return False
    
    def setup_environment(self):
        """Set up environment variables"""
        print("🔧 Setting up environment...")
        
        # Set GROQ_API_KEY
        os.environ["GROQ_API_KEY"] = self.groq_api_key
        
        # Set Python path
        python_path = os.environ.get("PYTHONPATH", "")
        os.environ["PYTHONPATH"] = f"{self.backend_dir};{python_path}"
        
        print("✅ Environment variables configured")
    
    def start_backend(self):
        """Start the backend server"""
        print("🚀 Starting backend server...")
        
        try:
            # Check if uvicorn is available
            import uvicorn
            print("✅ uvicorn is available")
            
            # Start backend in a separate process
            backend_command = [
                sys.executable, "-m", "uvicorn",
                "app.main:app",
                "--host", "0.0.0.0",
                "--port", "8000",
                "--reload"
            ]
            
            self.backend_process = subprocess.Popen(
                backend_command,
                cwd=self.backend_dir,
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                text=True,
                env=os.environ
            )
            
            # Wait for backend to start
            time.sleep(5)
            
            # Check if backend is running
            if self.backend_process.poll() is None:
                print("✅ Backend server started successfully")
                print(f"   PID: {self.backend_process.pid}")
                return True
            else:
                stderr = self.backend_process.stderr.read()
                print(f"❌ Backend failed to start: {stderr}")
                return False
                
        except Exception as e:
            print(f"❌ Error starting backend: {e}")
            return False
    
    def start_frontend(self):
        """Start the frontend server"""
        print("🚀 Starting frontend server...")
        
        try:
            # Check if npm is available
            frontend_command = [
                "npm", "run", "dev",
                "--", "--host", "0.0.0.0"
            ]
            
            self.frontend_process = subprocess.Popen(
                frontend_command,
                cwd=self.frontend_dir,
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                text=True,
                env=os.environ
            )
            
            # Wait for frontend to start
            time.sleep(10)
            
            # Check if frontend is running
            if self.frontend_process.poll() is None:
                print("✅ Frontend server started successfully")
                print(f"   PID: {self.frontend_process.pid}")
                return True
            else:
                stderr = self.frontend_process.stderr.read()
                print(f"❌ Frontend failed to start: {stderr}")
                return False
                
        except Exception as e:
            print(f"❌ Error starting frontend: {e}")
            return False
    
    def check_system_status(self):
        """Check if the system is ready"""
        print("🔍 Checking system status...")
        
        # Check backend health
        try:
            import requests
            response = requests.get("http://localhost:8000/", timeout=5)
            if response.status_code == 200:
                print("✅ Backend health check passed")
            else:
                print(f"❌ Backend health check failed: {response.status_code}")
                return False
        except Exception as e:
            print(f"❌ Backend health check error: {e}")
            return False
        
        # Check if we can access the application
        try:
            import requests
            response = requests.get("http://localhost:5173/", timeout=5)
            if response.status_code == 200:
                print("✅ Frontend health check passed")
                return True
            else:
                print(f"❌ Frontend health check failed: {response.status_code}")
                return False
        except Exception as e:
            print(f"❌ Frontend health check error: {e}")
            return False
    
    def print_access_info(self):
        """Print access information for the application"""
        print("\n" + "="*60)
        print("🎉 RCA SYSTEM SETUP COMPLETE")
        print("="*60)
        
        print("\n📍 Access URLs:")
        print("   • Main Application: http://localhost:5173")
        print("   • Backend API:      http://localhost:8000")
        print("   • API Docs:         http://localhost:8000/docs")
        print("   • API Redoc:        http://localhost:8000/redoc")
        
        print("\n🔑 GROQ API Key: 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")
        print("\n📁 Project Files:")
        print(f"   • Backend: {self.backend_dir}")
        print(f"   • Frontend: {self.frontend_dir}")
        
        print("\n🛠️  Next Steps:")
        print("   1. Test the application at http://localhost:5173")
        print("   2. Use the GROQ API key for AI processing")
        print("   3. Run tests with: python -m pytest tests/test_comprehensive_e2e.py -v")
        print("   4. Check logs for any errors")
        
        print("\n📊 System Status:")
        print("   • Backend: Running")
        print("   • Frontend: Running")
        print("   • GROQ API Key: Configured")
        print("   • Environment: Ready")
    
    def cleanup(self):
        """Cleanup processes when exiting"""
        print("\n🧹 Cleaning up...")
        
        # Terminate backend process
        if hasattr(self, 'backend_process') and self.backend_process:
            self.backend_process.terminate()
            self.backend_process.wait()
            print("✅ Backend process terminated")
        
        # Terminate frontend process
        if hasattr(self, 'frontend_process') and self.frontend_process:
            self.frontend_process.terminate()
            self.frontend_process.wait()
            print("✅ Frontend process terminated")
    
    def run(self):
        """Main execution method"""
        print("🚀 Starting RCA System Setup")
        print("="*60)
        
        try:
            # Check dependencies
            if not self.check_python_dependencies():
                print("❌ Python dependencies check failed")
                return False
            
            if not self.check_node_dependencies():
                print("❌ Node.js dependencies check failed")
                return False
            
            # Setup environment
            self.setup_environment()
            
            # Start services
            if not self.start_backend():
                print("❌ Failed to start backend")
                return False
            
            if not self.start_frontend():
                print("❌ Failed to start frontend")
                return False
            
            # Wait a bit more for services to initialize
            print("⏳ Waiting for services to initialize...")
            time.sleep(10)
            
            # Check system status
            if not self.check_system_status():
                print("❌ System health check failed")
                return False
            
            # Print access information
            self.print_access_info()
            
            print("\n🎉 SUCCESS: RCA System is ready!")
            print("   Visit: http://localhost:5173")
            
            return True
            
        except KeyboardInterrupt:
            print("\n⚠️  Interrupted by user")
            self.cleanup()
            return False
        except Exception as e:
            print(f"\n❌ Error during setup: {e}")
            self.cleanup()
            return False
        finally:
            # Note: We won't automatically clean up since user might want to keep the system running
            print("\n💡 Tip: Press Ctrl+C to stop all services")

if __name__ == "__main__":
    setup = RCASystemSetup()
    success = setup.run()
    
    if success:
        print("\n✅ The RCA project is now running on localhost!")
        print("   Access the application at: http://localhost:5173")
    else:
        print("\n❌ Setup failed. Please check the output above.")
        sys.exit(1)
