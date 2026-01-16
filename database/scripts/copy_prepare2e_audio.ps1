# ============================================================
# Copy Prepare 2e Level 1 Audio Files to Backend Public Folder
# Run this script in PowerShell from the ChatLingua root directory
# ============================================================

$SourceBase = "D:\English\Prepare 2e Level 1\Prepare 2e Level 1"
$TargetBase = "packages\backend\public\audio\word-maps\prepare-2e-l1"

# Create target directories
Write-Host "Creating directories..." -ForegroundColor Cyan
New-Item -ItemType Directory -Force -Path "$TargetBase\sb" | Out-Null
New-Item -ItemType Directory -Force -Path "$TargetBase\wb" | Out-Null

# Copy Student's Book Audio (Unit 0: tracks 001-010)
Write-Host "`nCopying Student's Book audio files..." -ForegroundColor Green
$SBSource = "$SourceBase\00 Student's Book Audio"

if (Test-Path $SBSource) {
    # Copy Unit 0 tracks (001-010)
    $unit0Tracks = @(
        "PREPARE2_L1_SB_001.mp3",  # Alphabet
        "PREPARE2_L1_SB_002.mp3",  # Spelling names
        "PREPARE2_L1_SB_003.mp3",  # What's your name?
        "PREPARE2_L1_SB_004.mp3",  # Numbers
        "PREPARE2_L1_SB_005.mp3",  # How old are you?
        "PREPARE2_L1_SB_006.mp3",  # Days of the week
        "PREPARE2_L1_SB_007.mp3",  # Classroom
        "PREPARE2_L1_SB_008.mp3",  # Colours
        "PREPARE2_L1_SB_009.mp3",  # Months
        "PREPARE2_L1_SB_010.mp3"   # Birthday
    )

    foreach ($track in $unit0Tracks) {
        $sourcePath = Join-Path $SBSource $track
        if (Test-Path $sourcePath) {
            Copy-Item $sourcePath -Destination "$TargetBase\sb\" -Force
            Write-Host "  Copied: $track" -ForegroundColor Gray
        } else {
            Write-Host "  Missing: $track" -ForegroundColor Yellow
        }
    }

    Write-Host "  Student's Book audio copied!" -ForegroundColor Green
} else {
    Write-Host "  Source folder not found: $SBSource" -ForegroundColor Red
}

# Copy Workbook Audio
Write-Host "`nCopying Workbook audio files..." -ForegroundColor Green
$WBSource = "$SourceBase\00 Workbook Audio"

if (Test-Path $WBSource) {
    # Copy Unit 0 workbook tracks (if any)
    $wbFiles = Get-ChildItem -Path $WBSource -Filter "PREPARE2_L1_WB_00*.mp3" -ErrorAction SilentlyContinue

    foreach ($file in $wbFiles) {
        Copy-Item $file.FullName -Destination "$TargetBase\wb\" -Force
        Write-Host "  Copied: $($file.Name)" -ForegroundColor Gray
    }

    if ($wbFiles.Count -eq 0) {
        Write-Host "  No Unit 0 workbook audio found" -ForegroundColor Yellow
    } else {
        Write-Host "  Workbook audio copied!" -ForegroundColor Green
    }
} else {
    Write-Host "  Source folder not found: $WBSource" -ForegroundColor Red
}

# Summary
Write-Host "`n============================================================" -ForegroundColor Cyan
Write-Host "SUMMARY" -ForegroundColor Cyan
Write-Host "============================================================" -ForegroundColor Cyan

$sbCount = (Get-ChildItem -Path "$TargetBase\sb" -Filter "*.mp3" -ErrorAction SilentlyContinue).Count
$wbCount = (Get-ChildItem -Path "$TargetBase\wb" -Filter "*.mp3" -ErrorAction SilentlyContinue).Count

Write-Host "Student's Book audio files: $sbCount" -ForegroundColor White
Write-Host "Workbook audio files: $wbCount" -ForegroundColor White
Write-Host "Total audio files: $($sbCount + $wbCount)" -ForegroundColor Green

# Display file sizes
$totalSize = 0
Get-ChildItem -Path $TargetBase -Recurse -Filter "*.mp3" | ForEach-Object {
    $totalSize += $_.Length
}
$totalSizeMB = [math]::Round($totalSize / 1MB, 2)
Write-Host "Total size: $totalSizeMB MB" -ForegroundColor White

Write-Host "`nAudio files are now available at:" -ForegroundColor Cyan
Write-Host "  /audio/word-maps/prepare-2e-l1/sb/PREPARE2_L1_SB_XXX.mp3" -ForegroundColor White
Write-Host "`nDone!" -ForegroundColor Green
