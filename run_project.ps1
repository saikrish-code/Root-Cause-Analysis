# RCA Project - Single Command Setup Script
# Run this entire script to start the project

# Set environment variables
$env:GROQ_API_KEY = "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"
$env:PYTHONPATH = "C:\Users\Sai Krishna S\Documents\Root Cause Analysis\backend"

# Start backend in background job
Start-Job -Name "RCA-Backend" -ArgumentList $env:PYTHONPATH -ScriptBlock {
    param($pythonpath)
    Set-Location "C:\Users\Sai Krishna S\Documents\Root Cause Analysis\backend"
    uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
}

# Wait for backend to start
Start-Sleep -Seconds 3

# Start frontend (blocking call)
Set-Location "C:\Users\Sai Krishna S\Documents\Root Cause Analysis\frontend"
npm run dev