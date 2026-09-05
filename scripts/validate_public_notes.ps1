param([string]$ContentPath = "quartz-knowledge-site/content")
$required = @('title','category','tags','source','updated','status','visibility')
$allowedStatus = @('draft','active','archived')
$errors = @()
$root = (Resolve-Path $ContentPath).Path
$files = Get-ChildItem -LiteralPath $ContentPath -Recurse -Filter *.md | Where-Object {
  $relative = $_.FullName.Substring($root.Length).TrimStart('\\')
  ($relative -split '\\').Count -ge 3 -and $_.Name -ne 'index.md'
}
foreach ($file in $files) {
  $text = Get-Content -LiteralPath $file.FullName -Raw
  if (-not $text.StartsWith('---')) { $errors += ($file.FullName + ': missing frontmatter'); continue }
  $front = ($text -split '---',3)[1]
  foreach ($key in $required) { $pattern = '(?m)^' + $key + '\s*:'; if ($front -notmatch $pattern) { $errors += ($file.FullName + ': missing ' + $key) } }
  if ($front -match '(?m)^status\s*:\s*(\S+)' -and $allowedStatus -notcontains $Matches[1]) { $errors += ($file.FullName + ': invalid status') }
  if ($front -match '(?m)^visibility\s*:\s*(\S+)' -and $Matches[1] -ne 'public') { $errors += ($file.FullName + ': visibility must be public') }
}
if ($errors.Count) { $errors | ForEach-Object { Write-Error $_ }; exit 1 }
Write-Host ('Validation passed: ' + $files.Count + ' public Markdown files') -ForegroundColor Green
