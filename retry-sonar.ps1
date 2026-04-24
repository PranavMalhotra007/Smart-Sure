$TOKEN = 'sqa_ecff9e300c1a82856749351323ce04740138d5e5'
$ROOT  = 'D:\Spring Implementation\New folder\Smart Sure'

$services = @(
    @{ dir='PolicyService';       key='smartsure-policy-service';  name='SmartSure Policy Service' },
    @{ dir='claimService';        key='smartsure-claim-service';   name='SmartSure Claim Service' },
    @{ dir='paymentService';      key='smartsure-payment-service'; name='SmartSure Payment Service' },
    @{ dir='ApiGatewaySmartSure'; key='smartsure-api-gateway';     name='SmartSure API Gateway' }
)

$results = @()

foreach ($svc in $services) {
    $path = Join-Path $ROOT $svc.dir
    Write-Host ""
    Write-Host "========================================" -ForegroundColor Cyan
    Write-Host " Scanning: $($svc.name)"               -ForegroundColor Cyan
    Write-Host "========================================" -ForegroundColor Cyan

    Push-Location $path

    $mvnArgs = @(
        "clean", "package", "sonar:sonar",
        "-Dsonar.projectKey=$($svc.key)",
        "-Dsonar.projectName=$($svc.name)",
        "-Dsonar.login=$TOKEN",
        "-DskipTests",
        "-B"
    )

    & .\mvnw @mvnArgs

    if ($LASTEXITCODE -eq 0) {
        Write-Host "SUCCESS: $($svc.name)" -ForegroundColor Green
        $results += [PSCustomObject]@{ Service = $svc.name; Status = "SUCCESS" }
    } else {
        Write-Host "FAILED:  $($svc.name)" -ForegroundColor Red
        $results += [PSCustomObject]@{ Service = $svc.name; Status = "FAILED" }
    }

    Pop-Location
}

Write-Host ""
Write-Host "============================================================" -ForegroundColor Magenta
Write-Host " RETRY SCAN SUMMARY" -ForegroundColor Magenta
Write-Host "============================================================" -ForegroundColor Magenta
$results | Format-Table -AutoSize

$failed = $results | Where-Object { $_.Status -eq "FAILED" }
if ($failed.Count -eq 0) {
    Write-Host "All 4 retried scans PASSED!" -ForegroundColor Green
} else {
    Write-Host "$($failed.Count) still failing." -ForegroundColor Red
}
Write-Host "Dashboard: http://localhost:9010/projects" -ForegroundColor Cyan
