Param(
    [string]$ProjectRef
)

Write-Host "🚀 Deploying Edge Functions to Supabase..." -ForegroundColor Cyan

# 1) Check Supabase CLI
$supabaseCli = (Get-Command supabase -ErrorAction SilentlyContinue)
if (-not $supabaseCli) {
    Write-Error "Supabase CLI not found. Install with: npm i -g supabase"
    exit 1
}

# 2) Ensure user is logged in
try {
    $null = supabase projects list 2>$null
} catch {
    Write-Error "Not logged in. Run: supabase login (or supabase login --token <ACCESS_TOKEN>)"
    exit 1
}

# 3) Ensure project is linked or project ref provided
function Get-LinkedProjectRef {
    try {
        $status = supabase status 2>$null | Out-String
        if ($status -match 'API URL\s*:\s*(https?://)([^/]+)/?') {
            $domain = $Matches[2]
            if ($domain -match '^([^.]+)\.') {
                return $Matches[1]
            }
        }
    } catch {}
    return $null
}

if (-not $ProjectRef) {
    $linkedRef = Get-LinkedProjectRef
    if ($linkedRef) {
        $ProjectRef = $linkedRef
        Write-Host "🔗 Detected linked project: $ProjectRef" -ForegroundColor Green
    } else {
        Write-Error "No project linked. Run: supabase link --project-ref <YOUR_PROJECT_REF>"
        exit 1
    }
}

# 4) Find all functions under supabase/functions
$functionsRoot = Join-Path $PSScriptRoot 'supabase' 'functions'
if (-not (Test-Path $functionsRoot)) {
    Write-Error "Functions directory not found at: $functionsRoot"
    exit 1
}

$functionDirs = Get-ChildItem -Path $functionsRoot -Directory -Recurse | Where-Object { Test-Path (Join-Path $_.FullName 'index.ts') -or Test-Path (Join-Path $_.FullName 'index.tsx') -or Test-Path (Join-Path $_.FullName 'index.js') }

if (-not $functionDirs -or $functionDirs.Count -eq 0) {
    Write-Error "No function directories with an index.* found under $functionsRoot"
    exit 1
}

# 5) Derive function names from immediate child of functions root
function Get-FunctionName {
    param([System.IO.DirectoryInfo]$dir)
    # function name is the directory name relative to supabase/functions (first segment after it)
    $relative = $dir.FullName.Substring($functionsRoot.Length).TrimStart('\\','/')
    $segments = $relative -split '[\\/]'
    return $segments[0]
}

$functionNames = $functionDirs | ForEach-Object { Get-FunctionName $_ } | Sort-Object -Unique

Write-Host "📦 Functions to deploy:" -ForegroundColor Yellow
$functionNames | ForEach-Object { Write-Host " - $_" }

# 6) Deploy each function
$errors = @()
foreach ($fn in $functionNames) {
    Write-Host "\n➡️  Deploying: $fn" -ForegroundColor Cyan
    try {
        supabase functions deploy $fn --project-ref $ProjectRef
        Write-Host "✅ Deployed: $fn" -ForegroundColor Green
    } catch {
        Write-Host "❌ Failed: $fn" -ForegroundColor Red
        $errors += $fn
    }
}

if ($errors.Count -gt 0) {
    Write-Host "\n⚠️  Completed with errors. Failed functions:" -ForegroundColor Yellow
    $errors | ForEach-Object { Write-Host " - $_" }
    exit 1
}

Write-Host "\n✅ All Edge Functions deployed successfully!" -ForegroundColor Green

Write-Host "\n🔗 Function URLs:" -ForegroundColor Yellow
try {
    $apiUrl = (supabase status | Select-String 'API URL').ToString().Split(':',2)[1].Trim()
    $base = $apiUrl.TrimEnd('/') + '/functions/v1'
    $functionNames | ForEach-Object { Write-Host (" - {0}: {1}/{0}" -f $_, $base) }
} catch {}


