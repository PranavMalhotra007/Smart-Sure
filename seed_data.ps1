
# ============================================================
# SmartSure Data Seeding Script
# - Register customer: johndoe1@example.com / Password123
# - Add 50 policy types (admin)
# - Buy 22 policies as that customer
# - File 14 claims (20-50% coverage) for 14 of those policies
# ============================================================

$BASE_URL = "http://localhost:8080"
$ADMIN_EMAIL = "smartSureInsuranceSpring@gmail.com"
$ADMIN_PASSWORD = "Hello123@"
$CUSTOMER_EMAIL = "johndoe1@example.com"
$CUSTOMER_PASSWORD = "Password123"

function Invoke-Api {
    param(
        [string]$Method,
        [string]$Url,
        [object]$Body,
        [string]$Token
    )
    $headers = @{ "Content-Type" = "application/json" }
    if ($Token) { $headers["Authorization"] = "Bearer $Token" }

    $bodyJson = if ($Body) { $Body | ConvertTo-Json -Depth 5 } else { $null }

    try {
        if ($bodyJson) {
            $response = Invoke-RestMethod -Method $Method -Uri $Url -Headers $headers -Body $bodyJson -ErrorAction Stop
        } else {
            $response = Invoke-RestMethod -Method $Method -Uri $Url -Headers $headers -ErrorAction Stop
        }
        return $response
    } catch {
        $errMsg = $_.Exception.Message
        $statusCode = $_.Exception.Response.StatusCode.value__
        Write-Host "  [ERROR $statusCode] $errMsg" -ForegroundColor Red
        # Try to read response body
        try {
            $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
            $responseBody = $reader.ReadToEnd()
            Write-Host "  Response: $responseBody" -ForegroundColor Yellow
        } catch {}
        return $null
    }
}

# ============================================================
# STEP 1: Register Customer
# ============================================================
Write-Host "`n=== STEP 1: Registering Customer ===" -ForegroundColor Cyan

$registerBody = @{
    firstName = "John"
    lastName  = "Doe"
    email     = $CUSTOMER_EMAIL
    password  = $CUSTOMER_PASSWORD
    role      = "CUSTOMER"
}

$regResult = Invoke-Api -Method POST -Url "$BASE_URL/api/auth/register" -Body $registerBody
if ($regResult) {
    Write-Host "  [OK] Customer registered: $regResult" -ForegroundColor Green
} else {
    Write-Host "  [WARN] Registration may have failed or user already exists. Continuing..." -ForegroundColor Yellow
}

# ============================================================
# STEP 2: Admin Login to get token for policy type creation
# ============================================================
Write-Host "`n=== STEP 2: Admin Login ===" -ForegroundColor Cyan

$adminLoginBody = @{ email = $ADMIN_EMAIL; password = $ADMIN_PASSWORD }
$adminAuth = Invoke-Api -Method POST -Url "$BASE_URL/api/auth/login" -Body $adminLoginBody

if (-not $adminAuth -or -not $adminAuth.token) {
    Write-Host "  [WARN] Admin login failed. Trying alternative admin credentials..." -ForegroundColor Yellow
    $adminLoginBody = @{ email = "admin@smartsure.com"; password = "password" }
    $adminAuth = Invoke-Api -Method POST -Url "$BASE_URL/api/auth/login" -Body $adminLoginBody
}

if (-not $adminAuth -or -not $adminAuth.token) {
    Write-Host "  [ERROR] Could not login as admin. Policy types cannot be added via API without admin token." -ForegroundColor Red
    Write-Host "  Trying to detect token field name..." -ForegroundColor Yellow
    Write-Host "  Raw response: $($adminAuth | ConvertTo-Json)" -ForegroundColor Yellow
}

$adminToken = if ($adminAuth) { 
    if ($adminAuth.token) { $adminAuth.token }
    elseif ($adminAuth.accessToken) { $adminAuth.accessToken }
    elseif ($adminAuth.jwt) { $adminAuth.jwt }
    else { ($adminAuth | ConvertTo-Json) }
} else { $null }

Write-Host "  Admin token obtained: $($adminToken -ne $null)" -ForegroundColor $(if ($adminToken) { "Green" } else { "Red" })

# ============================================================
# STEP 3: Customer Login
# ============================================================
Write-Host "`n=== STEP 3: Customer Login ===" -ForegroundColor Cyan

$customerLoginBody = @{ email = $CUSTOMER_EMAIL; password = $CUSTOMER_PASSWORD }
$customerAuth = Invoke-Api -Method POST -Url "$BASE_URL/api/auth/login" -Body $customerLoginBody

$customerToken = if ($customerAuth) {
    if ($customerAuth.token) { $customerAuth.token }
    elseif ($customerAuth.accessToken) { $customerAuth.accessToken }
    elseif ($customerAuth.jwt) { $customerAuth.jwt }
    else { $null }
} else { $null }

Write-Host "  Customer token obtained: $($customerToken -ne $null)" -ForegroundColor $(if ($customerToken) { "Green" } else { "Red" })
Write-Host "  Customer Auth response keys: $(($customerAuth | Get-Member -MemberType Properties | Select-Object -ExpandProperty Name) -join ', ')" -ForegroundColor Gray

# ============================================================
# STEP 4: Add 50 Policy Types (as Admin)
# ============================================================
Write-Host "`n=== STEP 4: Adding 50 Policy Types ===" -ForegroundColor Cyan

$categories = @("HEALTH", "AUTO", "HOME", "LIFE", "TRAVEL", "BUSINESS")

$policyTypeTemplates = @(
    # HEALTH (10)
    @{ name="Basic Health Insurance"; desc="Essential health coverage for individuals"; cat="HEALTH"; basePremium=800; maxCoverage=500000; deductible=5000; term=12; minAge=18; maxAge=60 },
    @{ name="Family Health Shield"; desc="Comprehensive health plan for entire family"; cat="HEALTH"; basePremium=2000; maxCoverage=2000000; deductible=10000; term=12; minAge=0; maxAge=60 },
    @{ name="Senior Citizen Health Plan"; desc="Health coverage tailored for senior citizens"; cat="HEALTH"; basePremium=3500; maxCoverage=1000000; deductible=15000; term=12; minAge=60; maxAge=80 },
    @{ name="Critical Illness Cover"; desc="Covers life-threatening critical illnesses"; cat="HEALTH"; basePremium=1200; maxCoverage=3000000; deductible=0; term=12; minAge=21; maxAge=55 },
    @{ name="Dental & Vision Plan"; desc="Coverage for dental and vision care"; cat="HEALTH"; basePremium=400; maxCoverage=200000; deductible=2000; term=12; minAge=18; maxAge=65 },
    @{ name="Maternity Health Plan"; desc="Maternity and newborn care coverage"; cat="HEALTH"; basePremium=1500; maxCoverage=800000; deductible=8000; term=24; minAge=21; maxAge=40 },
    @{ name="Group Health Insurance"; desc="Health coverage for corporate employees"; cat="HEALTH"; basePremium=1000; maxCoverage=500000; deductible=5000; term=12; minAge=18; maxAge=60 },
    @{ name="Mental Health Wellness Plan"; desc="Coverage for mental health and therapy"; cat="HEALTH"; basePremium=600; maxCoverage=300000; deductible=3000; term=12; minAge=18; maxAge=60 },
    @{ name="Preventive Health Care Plan"; desc="Annual health checkups and preventive care"; cat="HEALTH"; basePremium=500; maxCoverage=150000; deductible=1000; term=12; minAge=25; maxAge=55 },
    @{ name="Accidental Health Cover"; desc="Health coverage for accidents and injuries"; cat="HEALTH"; basePremium=700; maxCoverage=600000; deductible=5000; term=12; minAge=18; maxAge=65 },

    # AUTO (10)
    @{ name="Comprehensive Car Insurance"; desc="Full coverage for car damage and theft"; cat="AUTO"; basePremium=2500; maxCoverage=1500000; deductible=20000; term=12; minAge=18; maxAge=70 },
    @{ name="Third Party Car Insurance"; desc="Mandatory third-party liability coverage"; cat="AUTO"; basePremium=1200; maxCoverage=750000; deductible=10000; term=12; minAge=18; maxAge=70 },
    @{ name="Two Wheeler Insurance"; desc="Coverage for motorcycles and scooters"; cat="AUTO"; basePremium=600; maxCoverage=200000; deductible=5000; term=12; minAge=18; maxAge=60 },
    @{ name="Commercial Vehicle Insurance"; desc="Coverage for commercial trucks and vans"; cat="AUTO"; basePremium=5000; maxCoverage=3000000; deductible=30000; term=12; minAge=21; maxAge=65 },
    @{ name="Electric Vehicle Insurance"; desc="Specialized coverage for EVs and batteries"; cat="AUTO"; basePremium=3000; maxCoverage=2000000; deductible=25000; term=12; minAge=18; maxAge=70 },
    @{ name="Zero Depreciation Car Cover"; desc="Car insurance with no depreciation deduction"; cat="AUTO"; basePremium=3500; maxCoverage=1800000; deductible=15000; term=12; minAge=18; maxAge=65 },
    @{ name="Pay As You Drive Plan"; desc="Usage-based car insurance for low mileage drivers"; cat="AUTO"; basePremium=1800; maxCoverage=1000000; deductible=15000; term=12; minAge=21; maxAge=65 },
    @{ name="Fleet Insurance"; desc="Coverage for multiple company vehicles"; cat="AUTO"; basePremium=8000; maxCoverage=5000000; deductible=50000; term=12; minAge=21; maxAge=60 },
    @{ name="Classic Car Insurance"; desc="Coverage for vintage and collector vehicles"; cat="AUTO"; basePremium=4500; maxCoverage=2500000; deductible=20000; term=12; minAge=25; maxAge=70 },
    @{ name="Auto Road Assistance Plan"; desc="24/7 roadside assistance and towing coverage"; cat="AUTO"; basePremium=800; maxCoverage=100000; deductible=0; term=12; minAge=18; maxAge=70 },

    # HOME (8)
    @{ name="Home Structure Insurance"; desc="Coverage for structural damage to your home"; cat="HOME"; basePremium=1500; maxCoverage=5000000; deductible=25000; term=12; minAge=21; maxAge=75 },
    @{ name="Home Contents Insurance"; desc="Protection for belongings inside your home"; cat="HOME"; basePremium=900; maxCoverage=2000000; deductible=15000; term=12; minAge=21; maxAge=75 },
    @{ name="Comprehensive Home Shield"; desc="All-in-one home and contents protection"; cat="HOME"; basePremium=2500; maxCoverage=8000000; deductible=30000; term=12; minAge=21; maxAge=75 },
    @{ name="Renters Insurance"; desc="Coverage for tenants renting a property"; cat="HOME"; basePremium=700; maxCoverage=1000000; deductible=10000; term=12; minAge=18; maxAge=70 },
    @{ name="Natural Disaster Home Cover"; desc="Coverage for earthquakes, floods, and storms"; cat="HOME"; basePremium=2000; maxCoverage=6000000; deductible=50000; term=12; minAge=21; maxAge=70 },
    @{ name="Fire and Theft Home Plan"; desc="Protection against fire, burglary and theft"; cat="HOME"; basePremium=1200; maxCoverage=3000000; deductible=20000; term=12; minAge=21; maxAge=75 },
    @{ name="Luxury Home Insurance"; desc="Premium coverage for high-value properties"; cat="HOME"; basePremium=5000; maxCoverage=20000000; deductible=100000; term=12; minAge=25; maxAge=70 },
    @{ name="New Construction Home Cover"; desc="Insurance for newly built homes"; cat="HOME"; basePremium=1800; maxCoverage=7000000; deductible=35000; term=12; minAge=21; maxAge=65 },

    # LIFE (8)
    @{ name="Term Life Insurance"; desc="Pure life cover for a fixed term"; cat="LIFE"; basePremium=1000; maxCoverage=10000000; deductible=0; term=120; minAge=18; maxAge=55 },
    @{ name="Whole Life Insurance"; desc="Lifetime coverage with savings component"; cat="LIFE"; basePremium=3000; maxCoverage=5000000; deductible=0; term=360; minAge=18; maxAge=55 },
    @{ name="Unit Linked Insurance Plan"; desc="Market-linked life insurance with investment"; cat="LIFE"; basePremium=5000; maxCoverage=8000000; deductible=0; term=120; minAge=21; maxAge=50 },
    @{ name="Child Education Plan"; desc="Life insurance with education savings benefit"; cat="LIFE"; basePremium=2000; maxCoverage=3000000; deductible=0; term=180; minAge=25; maxAge=45 },
    @{ name="Endowment Life Plan"; desc="Life cover with guaranteed maturity benefit"; cat="LIFE"; basePremium=4000; maxCoverage=6000000; deductible=0; term=240; minAge=18; maxAge=50 },
    @{ name="Group Term Life Insurance"; desc="Term life insurance for corporate groups"; cat="LIFE"; basePremium=800; maxCoverage=5000000; deductible=0; term=12; minAge=18; maxAge=60 },
    @{ name="Accidental Death Benefit Plan"; desc="Additional coverage for accidental death"; cat="LIFE"; basePremium=500; maxCoverage=2000000; deductible=0; term=12; minAge=18; maxAge=60 },
    @{ name="Pension and Annuity Plan"; desc="Retirement income and pension planning"; cat="LIFE"; basePremium=6000; maxCoverage=15000000; deductible=0; term=240; minAge=30; maxAge=55 },

    # TRAVEL (7)
    @{ name="International Travel Insurance"; desc="Global coverage for international trips"; cat="TRAVEL"; basePremium=1500; maxCoverage=2000000; deductible=5000; term=1; minAge=18; maxAge=70 },
    @{ name="Domestic Travel Plan"; desc="Coverage for travel within the country"; cat="TRAVEL"; basePremium=400; maxCoverage=500000; deductible=2000; term=1; minAge=18; maxAge=70 },
    @{ name="Annual Multi-Trip Plan"; desc="Unlimited trips covered for a full year"; cat="TRAVEL"; basePremium=5000; maxCoverage=3000000; deductible=5000; term=12; minAge=18; maxAge=65 },
    @{ name="Student Travel Insurance"; desc="Coverage for students studying abroad"; cat="TRAVEL"; basePremium=2000; maxCoverage=1500000; deductible=3000; term=12; minAge=18; maxAge=30 },
    @{ name="Senior Travel Protection"; desc="Travel coverage designed for senior citizens"; cat="TRAVEL"; basePremium=3000; maxCoverage=2000000; deductible=5000; term=1; minAge=60; maxAge=80 },
    @{ name="Adventure Sports Travel Cover"; desc="Coverage for extreme and adventure sports"; cat="TRAVEL"; basePremium=2500; maxCoverage=1000000; deductible=10000; term=1; minAge=18; maxAge=50 },
    @{ name="Business Travel Insurance"; desc="Coverage for frequent business travelers"; cat="TRAVEL"; basePremium=4000; maxCoverage=4000000; deductible=5000; term=12; minAge=18; maxAge=65 },

    # BUSINESS (7)
    @{ name="Commercial Property Insurance"; desc="Coverage for business premises and assets"; cat="BUSINESS"; basePremium=8000; maxCoverage=20000000; deductible=100000; term=12; minAge=21; maxAge=70 },
    @{ name="Professional Liability Insurance"; desc="Protection against professional errors and omissions"; cat="BUSINESS"; basePremium=5000; maxCoverage=10000000; deductible=50000; term=12; minAge=21; maxAge=70 },
    @{ name="Product Liability Insurance"; desc="Coverage for product-related claims and damage"; cat="BUSINESS"; basePremium=6000; maxCoverage=15000000; deductible=75000; term=12; minAge=21; maxAge=70 },
    @{ name="Business Interruption Cover"; desc="Income protection when business operations halt"; cat="BUSINESS"; basePremium=4000; maxCoverage=8000000; deductible=50000; term=12; minAge=21; maxAge=70 },
    @{ name="Cyber Liability Insurance"; desc="Coverage against cyber attacks and data breaches"; cat="BUSINESS"; basePremium=7000; maxCoverage=12000000; deductible=100000; term=12; minAge=21; maxAge=70 },
    @{ name="Workers Compensation Insurance"; desc="Coverage for employee work-related injuries"; cat="BUSINESS"; basePremium=3000; maxCoverage=5000000; deductible=20000; term=12; minAge=21; maxAge=70 },
    @{ name="Directors and Officers Insurance"; desc="Protection for corporate directors and officers"; cat="BUSINESS"; basePremium=10000; maxCoverage=25000000; deductible=150000; term=12; minAge=21; maxAge=70 }
)

$policyTypeIds = @()
$addedCount = 0

foreach ($pt in $policyTypeTemplates) {
    $body = @{
        name              = $pt.name
        description       = $pt.desc
        category          = $pt.cat
        basePremium       = $pt.basePremium
        maxCoverageAmount = $pt.maxCoverage
        deductibleAmount  = $pt.deductible
        termMonths        = $pt.term
        minAge            = $pt.minAge
        maxAge            = $pt.maxAge
        coverageDetails   = "Standard coverage: $($pt.desc)"
    }

    $result = Invoke-Api -Method POST -Url "$BASE_URL/api/policy-types" -Body $body -Token $adminToken
    if ($result -and $result.id) {
        $policyTypeIds += $result.id
        $addedCount++
        Write-Host "  [$addedCount/50] Added: $($pt.name) (ID: $($result.id))" -ForegroundColor Green
    } else {
        Write-Host "  [SKIP] $($pt.name) - may already exist or failed" -ForegroundColor Yellow
        # Try to get existing policy types to use their IDs
    }
}

Write-Host "`n  Total policy types added: $addedCount" -ForegroundColor Cyan

# If we didn't add all 50 (e.g., some already existed), fetch existing ones
if ($policyTypeIds.Count -lt 22) {
    Write-Host "  Fetching existing policy types to supplement..." -ForegroundColor Yellow
    $existingTypes = Invoke-Api -Method GET -Url "$BASE_URL/api/policy-types"
    if ($existingTypes) {
        foreach ($et in $existingTypes) {
            if ($policyTypeIds -notcontains $et.id) {
                $policyTypeIds += $et.id
            }
        }
        Write-Host "  Total policy type IDs available: $($policyTypeIds.Count)" -ForegroundColor Cyan
    }
}

# ============================================================
# STEP 5: Buy 22 Policies as Customer
# ============================================================
Write-Host "`n=== STEP 5: Buying 22 Policies as Customer ===" -ForegroundColor Cyan

if (-not $customerToken) {
    Write-Host "  [ERROR] No customer token. Cannot purchase policies." -ForegroundColor Red
    exit 1
}

$purchasedPolicyIds = @()
$today = Get-Date -Format "yyyy-MM-dd"
$paymentFrequencies = @("MONTHLY", "QUARTERLY", "SEMI_ANNUAL", "ANNUAL")
$nominees = @("Jane Doe", "Robert Doe", "Mary Doe", "Alice Doe")
$relations = @("Spouse", "Father", "Mother", "Sibling")

for ($i = 0; $i -lt 22; $i++) {
    $ptId = $policyTypeIds[$i % $policyTypeIds.Count]
    $freq = $paymentFrequencies[$i % $paymentFrequencies.Count]
    $nominee = $nominees[$i % $nominees.Count]
    $relation = $relations[$i % $relations.Count]
    # Coverage between 50000 and 500000
    $coverage = [math]::Round((50000 + ($i * 20000)), 2)

    $purchaseBody = @{
        policyTypeId      = $ptId
        coverageAmount    = $coverage
        paymentFrequency  = $freq
        startDate         = $today
        nomineeName       = $nominee
        nomineeRelation   = $relation
        customerAge       = 30
    }

    $result = Invoke-Api -Method POST -Url "$BASE_URL/api/policies/purchase" -Body $purchaseBody -Token $customerToken
    if ($result -and $result.id) {
        $purchasedPolicyIds += $result.id
        Write-Host "  [$(($i+1))/22] Purchased Policy ID: $($result.id) | Coverage: $coverage | Type ID: $ptId" -ForegroundColor Green
    } else {
        Write-Host "  [FAIL] Could not purchase policy $($i+1) for type ID $ptId" -ForegroundColor Red
    }
}

Write-Host "`n  Total policies purchased: $($purchasedPolicyIds.Count)" -ForegroundColor Cyan

# ============================================================
# STEP 6: File 14 Claims (20-50% of coverage amount)
# ============================================================
Write-Host "`n=== STEP 6: Filing 14 Claims (20-50% coverage) ===" -ForegroundColor Cyan

$claimReasons = @(
    "Hospital admission for surgery",
    "Car accident damage repair",
    "Home fire damage",
    "Medical emergency treatment",
    "Road accident injury",
    "Property theft claim",
    "Flood damage to property",
    "Vehicle collision repair",
    "Critical illness treatment",
    "Home break-in damage",
    "Accident hospitalization",
    "Vehicle total loss claim",
    "Storm damage to home",
    "Emergency surgery expenses"
)

$filedClaims = 0

# We need the policy coverage amounts to calculate 20-50%
# We'll use the coverage values we set during purchase

$coverageAmounts = @()
for ($i = 0; $i -lt 22; $i++) {
    $coverageAmounts += [math]::Round((50000 + ($i * 20000)), 2)
}

for ($i = 0; $i -lt [math]::Min(14, $purchasedPolicyIds.Count); $i++) {
    $policyId = $purchasedPolicyIds[$i]
    $coverage = $coverageAmounts[$i]

    # Random percentage between 20% and 50%
    $percentage = 20 + ($i % 31)  # cycles from 20 to 50
    $claimAmount = [math]::Round($coverage * $percentage / 100, 2)

    $claimBody = @{
        policyId = $policyId
        amount   = $claimAmount
    }

    $result = Invoke-Api -Method POST -Url "$BASE_URL/api/claims" -Body $claimBody -Token $customerToken
    if ($result -and $result.id) {
        $filedClaims++
        Write-Host "  [$filedClaims/14] Filed Claim ID: $($result.id) | Policy: $policyId | Amount: $claimAmount ($percentage% of $coverage)" -ForegroundColor Green
    } else {
        Write-Host "  [FAIL] Could not file claim $($i+1) for policy ID $policyId" -ForegroundColor Red
    }
}

Write-Host "`n  Total claims filed: $filedClaims" -ForegroundColor Cyan

# ============================================================
# SUMMARY
# ============================================================
Write-Host "`n============================================================" -ForegroundColor Magenta
Write-Host "SEEDING COMPLETE" -ForegroundColor Magenta
Write-Host "============================================================" -ForegroundColor Magenta
Write-Host "  Customer Email   : $CUSTOMER_EMAIL" -ForegroundColor White
Write-Host "  Customer Password: $CUSTOMER_PASSWORD" -ForegroundColor White
Write-Host "  Policy Types Added  : $addedCount / 50" -ForegroundColor White
Write-Host "  Policies Purchased  : $($purchasedPolicyIds.Count) / 22" -ForegroundColor White
Write-Host "  Claims Filed        : $filedClaims / 14" -ForegroundColor White
Write-Host "============================================================" -ForegroundColor Magenta
