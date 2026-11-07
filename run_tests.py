#!/usr/bin/env python3
"""
Test runner script for the RCA project
"""
import subprocess
import sys
import os

def run_tests():
    print("Running RCA Project Tests...")
    print("=" * 50)
    
    # Change to backend directory
    backend_dir = os.path.join(os.path.dirname(__file__), 'backend')
    frontend_dir = os.path.join(os.path.dirname(__file__), 'frontend')
    
    try:
        # Run backend tests
        print("\n1. Running Backend Tests...")
        os.chdir(backend_dir)
        
        # Try to run pytest for backend
        result = subprocess.run([
            sys.executable, '-m', 'pytest', 
            'tests/test_ai.py', 
            '-v', 
            '--tb=short'
        ], capture_output=True, text=True)
        
        print(result.stdout)
        if result.stderr:
            print("STDERR:", result.stderr)
        
        print(f"\nBackend tests completed with exit code: {result.returncode}")
        
        # Check if we should continue with frontend
        if result.returncode == 0:
            print("\n2. Running Comprehensive E2E Tests...")
            result2 = subprocess.run([
                sys.executable, '-m', 'pytest',
                'tests/test_comprehensive_e2e.py',
                '-v',
                '--tb=short'
            ], capture_output=True, text=True)
            
            print(result2.stdout)
            if result2.stderr:
                print("STDERR:", result2.stderr)
            
            print(f"\nComprehensive E2E tests completed with exit code: {result2.returncode}")
        
        return True
        
    except Exception as e:
        print(f"Error running tests: {e}")
        return False

def show_project_status():
    print("\n" + "=" * 60)
    print("RCA PROJECT STATUS REPORT")
    print("=" * 60)
    
    # Check backend structure
    backend_dir = os.path.join(os.path.dirname(__file__), 'backend')
    frontend_dir = os.path.join(os.path.dirname(__file__), 'frontend')
    
    print(f"\nBackend Directory: {backend_dir}")
    print(f"Frontend Directory: {frontend_dir}")
    
    # List backend tests
    backend_tests_dir = os.path.join(backend_dir, 'tests')
    if os.path.exists(backend_tests_dir):
        tests = os.listdir(backend_tests_dir)
        print(f"\nBackend Tests: {len(tests)} files")
        for test in tests:
            if test.endswith('.py'):
                print(f"  - {test}")
    
    # List frontend tests
    frontend_tests_dir = os.path.join(frontend_dir, 'tests')
    if os.path.exists(frontend_tests_dir):
        tests = os.listdir(frontend_tests_dir)
        print(f"\nFrontend Tests: {len(tests)} files")
        for test in tests:
            if test.endswith('.ts') or test.endswith('.spec.ts'):
                print(f"  - {test}")
    
    print(f"\nConfiguration Files:")
    print(f"  - docker-compose.yml")
    print(f"  - backend/requirements.txt")
    print(f"  - frontend/package.json")
    print(f"  - frontend/playwright.config.ts")

if __name__ == "__main__":
    show_project_status()
    
    if len(sys.argv) > 1 and sys.argv[1] == "--run-tests":
        success = run_tests()
        sys.exit(0 if success else 1)
    else:
        print("\nTo run tests, use: python run_tests.py --run-tests")
        print("\nTo view project status, run without arguments.")
