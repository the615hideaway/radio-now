# Syncs the Radio Now Google Sheet into data/songs.json
param(
  [string]$SheetId = '10rum4RKKF5-CgLcoSwe55EcxzyEzBSDqfxVrnbAuikk',
  [string]$SheetName = 'Sheet1',
  [string]$OutPath = "$PSScriptRoot\..\data\songs.json"
)

function Get-CellValue($cell) {
  if (-not $cell) { return '' }
  if ($cell.f -and "$($cell.f)".Trim()) { return "$($cell.f)".Trim() }
  if ($null -eq $cell.v) { return '' }
  if ($cell.v -is [double] -or $cell.v -is [int]) { return ([int][Math]::Round($cell.v)).ToString() }
  return "$($cell.v)".Trim()
}

function Get-DriveId([string]$Url) {
  if (-not $Url) { return '' }
  if ($Url -match '/file/d/([^/]+)') { return $matches[1] }
  if ($Url -match '[?&]id=([^&]+)') { return $matches[1] }
  return ''
}

function Get-DriveDownload([string]$Url) {
  $id = Get-DriveId $Url
  if ($id) { return "https://drive.google.com/uc?export=download&id=$id" }
  return $Url
}

function Get-DriveStream([string]$Url) {
  $id = Get-DriveId $Url
  if ($id) { return "https://drive.usercontent.google.com/download?id=$id&export=download" }
  return $Url
}

function Get-DriveThumbnail([string]$Url) {
  $id = Get-DriveId $Url
  if ($id) { return "https://drive.google.com/thumbnail?id=$id&sz=w400" }
  return $Url
}

function Strip-Html([string]$Html) {
  if (-not $Html) { return '' }
  return ($Html -replace '<[^>]+>', ' ' -replace '\s+', ' ').Trim()
}

$gvizUrl = "https://docs.google.com/spreadsheets/d/$SheetId/gviz/tq?tqx=out:json&sheet=$([uri]::EscapeDataString($SheetName))"
$text = (Invoke-WebRequest -Uri $gvizUrl -UseBasicParsing).Content

if ($text -notmatch 'google\.visualization\.Query\.setResponse\(([\s\S]+)\);?') {
  throw 'Could not parse Google Sheet response'
}

$payload = $matches[1] | ConvertFrom-Json
$cols = @($payload.table.cols | ForEach-Object { $_.label })
$rows = @($payload.table.rows)

$songs = New-Object System.Collections.Generic.List[object]
$index = 0

foreach ($row in $rows) {
  $record = @{}
  for ($i = 0; $i -lt $cols.Count; $i++) {
    $label = $cols[$i]
    if (-not $label) { continue }
    $cell = $null
    if ($row.c.Count -gt $i) { $cell = $row.c[$i] }
    $record[$label] = Get-CellValue $cell
  }

  $artist = $record['Artist Name']
  $title = $record['Song Title']
  if (-not $artist -and -not $title) { continue }

  $index++
  $preview = $record['Preview Link']
  $mp3 = $record['MP3']
  if (-not $mp3) { $mp3 = $record['MP3s'] }
  $cover = $record['Cover']
  $wav = $record['WAV']

  $previewDriveId = Get-DriveId $preview
  $previewStreamUrl = ''
  if ($previewDriveId) {
    $previewStreamUrl = Get-DriveStream $preview
  } elseif ($preview -and $preview -match '^https?://') {
    $previewStreamUrl = $preview
  }

  $songs.Add([ordered]@{
    id                 = "song-$index"
    artistName         = $artist
    songTitle          = $title
    year               = $record['Year']
    mp3                = Get-DriveDownload $mp3
    previewLink        = $preview
    previewStreamUrl   = $previewStreamUrl
    previewDriveId     = $previewDriveId
    wav                = Get-DriveDownload $wav
    cover              = $cover
    coverThumbnailUrl  = Get-DriveThumbnail $cover
    songTime           = $record['Song Time']
    description        = Strip-Html $record['Description']
    musicStyle         = $record['Music Style']
    bandMembers        = $record['Band Members']
    songwriter         = $record['Songwriter']
    featuredArtist     = $record['Featured Artist']
    website            = $record['Website']
    recordLabel        = $record['Record Label']
    contactEmail       = $record['Contact E-Mail']
  })
}

$output = [ordered]@{
  success   = $true
  source    = 'google-sheet'
  sheetId   = $SheetId
  sheetName = $SheetName
  syncedAt  = (Get-Date).ToUniversalTime().ToString('o')
  songCount = $songs.Count
  songs     = $songs
}

$dir = Split-Path $OutPath -Parent
if (-not (Test-Path $dir)) { New-Item -ItemType Directory -Path $dir | Out-Null }

$json = $output | ConvertTo-Json -Depth 8
[System.IO.File]::WriteAllText($OutPath, $json, [System.Text.UTF8Encoding]::new($false))
Write-Host "Wrote $($songs.Count) songs to $OutPath"