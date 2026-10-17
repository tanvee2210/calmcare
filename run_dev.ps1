# CalmCare Development Runner
Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host " Starting CALMCARE End-to-End System..." -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Cyan

# 1. Start FastAPI Backend in background job
$BackendScript = {
    Set-Location "r:\calmcare\backend"
    python -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
}
$BackendJob = Start-Job -ScriptBlock $BackendScript
Write-Host "[✓] Backend started at http://127.0.0.1:8000" -ForegroundColor Green
Write-Host "    Swagger Docs: http://127.0.0.1:8000/docs" -ForegroundColor Gray

# 2. Start Vite Frontend in background job
$FrontendScript = {
    Set-Location "r:\calmcare\frontend"
    npm run dev -- --host 127.0.0.1 --port 5173
}
$FrontendJob = Start-Job -ScriptBlock $FrontendScript
Write-Host "[✓] Frontend started at http://127.0.0.1:5173" -ForegroundColor Green

Write-Host "`nPress Ctrl+C to stop services..." -ForegroundColor Yellow

try {
    while ($true) {
        Start-Sleep -Seconds 2
    }
} finally {
    Write-Host "`nStopping background jobs..." -ForegroundColor Red
    Stop-Job $BackendJob, $FrontendJob
    Remove-Job $BackendJob, $FrontendJob
    Write-Host "[✓] CalmCare stopped safely." -ForegroundColor Green
}
