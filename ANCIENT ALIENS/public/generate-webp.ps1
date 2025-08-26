# Helper: generate WebP variants for images used in the gallery
# Usage: run from the ANCIENT ALIENS/public folder in PowerShell
# Example: .\generate-webp.ps1

# Resolve script directory so this works when run from any cwd
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Definition
$images = @(
  [System.IO.Path]::Combine($scriptDir, 'images', 'giza.jpg'),
  [System.IO.Path]::Combine($scriptDir, 'images', 'baalbek.jpg'),
  [System.IO.Path]::Combine($scriptDir, 'images', 'stonehenge.jpg'),
  [System.IO.Path]::Combine($scriptDir, 'images', 'antikythera.jpg'),
  [System.IO.Path]::Combine($scriptDir, 'images', 'quimbaya.jpg'),
  [System.IO.Path]::Combine($scriptDir, 'images', 'nuremberg.jpg'),
  [System.IO.Path]::Combine($scriptDir, 'images', 'top_blocks_mass.png'),
  [System.IO.Path]::Combine($scriptDir, 'images', 'hero.png')
)

# Try to use cwebp if available, otherwise fall back to ImageMagick 'magick'
function Convert-ToWebP($inPath, $outPath) {
  if (Get-Command cwebp -ErrorAction SilentlyContinue) {
    & cwebp -q 85 $inPath -o $outPath
  } elseif (Get-Command magick -ErrorAction SilentlyContinue) {
    & magick convert $inPath -quality 85 $outPath
  } else {
    Write-Host "No webp converter found on PATH. Install libwebp (cwebp) or ImageMagick." -ForegroundColor Yellow
  }
}

foreach ($img in $images) {
  if (Test-Path $img) {
    $base = [System.IO.Path]::GetFileNameWithoutExtension($img)
    $ext = [System.IO.Path]::GetExtension($img)
    $dir = [System.IO.Path]::GetDirectoryName($img)

    $in1 = $img
    $in2 = Join-Path $dir ($base + "@2x" + $ext)
    $out1 = Join-Path $dir ($base + ".webp")
    $out2 = Join-Path $dir ($base + "@2x.webp")

    Write-Host "Processing $img -> $out1, $out2"

    Convert-ToWebP $in1 $out1
    if (Test-Path $in2) { Convert-ToWebP $in2 $out2 }
  } else {
    Write-Host "Skipping missing file: $img" -ForegroundColor DarkGray
  }
}

Write-Host "Done. If no converter was found, please install libwebp or ImageMagick and re-run."
