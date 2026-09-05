param([string]$ContentPath = "quartz-knowledge-site/content")
$required = @('title','category','tags','source','updated','status','visibility')
$allowedStatus = @('draft','active','archived')
$errors = @()
$files = Get-ChildItem -LiteralPath $ContentPath -Recurse -Filter *.md | Where-Object { $_.Name -notin @('资料模板.md','index.md') }
foreach ($file in $files) {
  $text = Get-Content -LiteralPath $file.FullName -Raw
  if (-not $text.StartsWith('---')) { $errors += "$($file.FullName): 缺少 YAML 元数据"; continue }
  $front = ($text -split '---',3)[1]
  foreach ($key in $required) { if ($front -notmatch "(?m)^$key\s*:") { $errors += "$($file.FullName): 缺少 $key" } }
  if ($front -match '(?m)^status\s*:\s*(\S+)' -and $allowedStatus -notcontains $Matches[1]) { $errors += "$($file.FullName): status 必须是 draft/active/archived" }
  if ($front -match '(?m)^visibility\s*:\s*(\S+)' -and $Matches[1] -ne 'public') { $errors += "$($file.FullName): 公开目录 visibility 必须为 public" }
}
if ($errors.Count) { $errors | ForEach-Object { Write-Error $_ }; exit 1 }
Write-Host "检查通过：$($files.Count) 个公开 Markdown 文件" -ForegroundColor Green
