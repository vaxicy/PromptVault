Add-Type -AssemblyName System.Drawing

$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $PSScriptRoot
$outDir = Join-Path $root "store-assets\promo"
New-Item -ItemType Directory -Force -Path $outDir | Out-Null

# The promo badges use the real extension icon, not a hand-drawn lookalike.
$script:IconPath = Join-Path $root "icons\icon128.png"
if (-not (Test-Path $script:IconPath)) { throw "Extension icon not found: $($script:IconPath)" }

function New-Font($size, $style = "Regular") {
  $fontStyle = [System.Drawing.FontStyle]::$style
  return [System.Drawing.Font]::new("Microsoft YaHei UI", $size, $fontStyle, [System.Drawing.GraphicsUnit]::Pixel)
}

function New-Brush($hex) {
  return [System.Drawing.SolidBrush]::new([System.Drawing.ColorTranslator]::FromHtml($hex))
}

function New-Pen($hex, $width = 1) {
  return [System.Drawing.Pen]::new([System.Drawing.ColorTranslator]::FromHtml($hex), $width)
}

function Fill-RoundRect($g, $brush, $x, $y, $w, $h, $r) {
  if ($r -le 0) {
    $g.FillRectangle($brush, $x, $y, $w, $h)
    return
  }
  $path = [System.Drawing.Drawing2D.GraphicsPath]::new()
  $d = $r * 2
  $path.AddArc($x, $y, $d, $d, 180, 90)
  $path.AddArc($x + $w - $d, $y, $d, $d, 270, 90)
  $path.AddArc($x + $w - $d, $y + $h - $d, $d, $d, 0, 90)
  $path.AddArc($x, $y + $h - $d, $d, $d, 90, 90)
  $path.CloseFigure()
  $g.FillPath($brush, $path)
  $path.Dispose()
}

function Draw-RoundRect($g, $pen, $x, $y, $w, $h, $r) {
  if ($r -le 0) {
    $g.DrawRectangle($pen, $x, $y, $w, $h)
    return
  }
  $path = [System.Drawing.Drawing2D.GraphicsPath]::new()
  $d = $r * 2
  $path.AddArc($x, $y, $d, $d, 180, 90)
  $path.AddArc($x + $w - $d, $y, $d, $d, 270, 90)
  $path.AddArc($x + $w - $d, $y + $h - $d, $d, $d, 0, 90)
  $path.AddArc($x, $y + $h - $d, $d, $d, 90, 90)
  $path.CloseFigure()
  $g.DrawPath($pen, $path)
  $path.Dispose()
}

function Draw-Text($g, $text, $x, $y, $size, $color = "#111111", $style = "Regular", $w = 900, $h = 80) {
  $font = New-Font $size $style
  $brush = New-Brush $color
  $format = [System.Drawing.StringFormat]::new()
  $format.Trimming = [System.Drawing.StringTrimming]::EllipsisCharacter
  $format.FormatFlags = [System.Drawing.StringFormatFlags]::LineLimit
  $rect = [System.Drawing.RectangleF]::new($x, $y, $w, $h)
  $g.DrawString($text, $font, $brush, $rect, $format)
  $format.Dispose()
  $font.Dispose()
  $brush.Dispose()
}

# Draws the shipped extension icon (icons/icon128.png) at the given size.
function Draw-AppIcon($g, $x, $y, $size) {
  $img = [System.Drawing.Image]::FromFile($script:IconPath)
  $g.DrawImage($img, [System.Drawing.Rectangle]::new($x, $y, $size, $size))
  $img.Dispose()
}

# One prompt row of the popup: title, description and the two card actions.
function Draw-MiniCard($g, $x, $y, $w, $title, $desc) {
  Fill-RoundRect $g (New-Brush "#ffffff") $x $y $w 80 10
  Draw-RoundRect $g (New-Pen "#dedede" 1) $x $y $w 80 10
  Draw-Text $g $title ($x + 16) ($y + 12) 16 "#111111" "Bold" ($w - 140) 24
  Draw-Text $g $desc ($x + 16) ($y + 42) 13 "#666666" "Regular" ($w - 32) 22
  # copy / insert pills (the popup puts them on every card)
  Fill-RoundRect $g (New-Brush "#f2f2f2") ($x + $w - 114) ($y + 11) 44 22 11
  Draw-Text $g "复制" ($x + $w - 104) ($y + 16) 12 "#444444" "Bold" 30 16
  Fill-RoundRect $g (New-Brush "#111111") ($x + $w - 62) ($y + 11) 44 22 11
  Draw-Text $g "插入" ($x + $w - 52) ($y + 16) 12 "#ffffff" "Bold" 30 16
}

function New-Canvas($path, $w, $h) {
  $bmp = [System.Drawing.Bitmap]::new($w, $h, [System.Drawing.Imaging.PixelFormat]::Format24bppRgb)
  $g = [System.Drawing.Graphics]::FromImage($bmp)
  $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
  $g.TextRenderingHint = [System.Drawing.Text.TextRenderingHint]::ClearTypeGridFit
  # the app icon is scaled down from 128px, so ask for a smooth resample
  $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
  $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
  $g.Clear([System.Drawing.ColorTranslator]::FromHtml("#f4f4f4"))
  return @{ Bitmap = $bmp; Graphics = $g; Path = $path }
}

function Save-Canvas($canvas) {
  $canvas.Graphics.Dispose()
  $canvas.Bitmap.Save($canvas.Path, [System.Drawing.Imaging.ImageFormat]::Png)
  $canvas.Bitmap.Dispose()
}

function Generate-SmallTile {
  $c = New-Canvas (Join-Path $outDir "small-promo-tile-440x280.png") 440 280
  $g = $c.Graphics
  Fill-RoundRect $g (New-Brush "#ffffff") 18 18 404 244 22
  Draw-RoundRect $g (New-Pen "#dedede" 1) 18 18 404 244 22
  Draw-AppIcon $g 42 42 58
  Draw-Text $g "PromptVault" 116 42 31 "#111111" "Bold" 270 42
  Draw-Text $g "AI 提示词管理器" 116 88 19 "#444444" "Regular" 240 28
  Draw-Text $g "AI Prompt Manager" 116 116 16 "#777777" "Regular" 240 24
  Fill-RoundRect $g (New-Brush "#111111") 42 164 156 38 10
  Draw-Text $g "保存 · 搜索 · 复用" 56 172 15 "#ffffff" "Bold" 132 22
  Fill-RoundRect $g (New-Brush "#f7f7f7") 214 164 184 38 10
  Draw-RoundRect $g (New-Pen "#dedede" 1) 214 164 184 38 10
  Draw-Text $g "Save · Search · Reuse" 228 172 14 "#111111" "Bold" 162 22
  Draw-Text $g "本地保存，不上传" 42 224 14 "#666666" "Regular" 170 22
  Draw-Text $g "Local-first, no upload" 214 224 14 "#666666" "Regular" 172 22
  Save-Canvas $c
}

function Generate-Marquee {
  $c = New-Canvas (Join-Path $outDir "marquee-promo-tile-1400x560.png") 1400 560
  $g = $c.Graphics
  Fill-RoundRect $g (New-Brush "#ffffff") 52 44 1296 472 34
  Draw-RoundRect $g (New-Pen "#dedede" 1) 52 44 1296 472 34
  Draw-AppIcon $g 96 88 82
  Draw-Text $g "PromptVault" 216 86 62 "#111111" "Bold" 480 78
  Draw-Text $g "保存、搜索、复用你的 AI 提示词" 216 176 34 "#333333" "Regular" 650 48
  Draw-Text $g "Save, search, and reuse your AI prompts" 216 226 27 "#666666" "Regular" 650 40
  Fill-RoundRect $g (New-Brush "#111111") 216 300 290 52 12
  Draw-Text $g "本地保存 / Local-first" 240 312 16 "#ffffff" "Bold" 248 28
  Fill-RoundRect $g (New-Brush "#f7f7f7") 526 300 290 52 12
  Draw-RoundRect $g (New-Pen "#dedede" 1) 526 300 290 52 12
  Draw-Text $g "中英双语 / Bilingual UI" 550 312 16 "#111111" "Bold" 248 28
  Fill-RoundRect $g (New-Brush "#f7f7f7") 216 376 600 52 12
  Draw-RoundRect $g (New-Pen "#dedede" 1) 216 376 600 52 12
  Draw-Text $g "复制 · 插入 · 可选自动发送 / Copy · Insert · Optional auto-send" 240 388 16 "#111111" "Bold" 560 28
  # Extension popup mock. This used to be a sidebar panel — the sidebar feature
  # is gone, so the promo must show the popup instead (floating card, header,
  # search field and prompt rows with their copy / insert buttons).
  $px = 900
  $py = 94
  $pw = 360
  $ph = 416
  Fill-RoundRect $g (New-Brush "#1c1c1c") ($px + 10) ($py + 14) $pw $ph 22
  Fill-RoundRect $g (New-Brush "#111111") $px $py $pw $ph 22
  Draw-Text $g "PromptVault" ($px + 26) ($py + 20) 22 "#f5f5f5" "Bold" 220 30
  Fill-RoundRect $g (New-Brush "#f5f5f5") ($px + $pw - 62) ($py + 17) 36 36 10
  # the "+" is drawn with lines: a text glyph is not reliably centred in a 36px box
  $ppen = New-Pen "#111111" 3
  $plusCx = $px + $pw - 44
  $plusCy = $py + 35
  $g.DrawLine($ppen, ($plusCx - 9), $plusCy, ($plusCx + 9), $plusCy)
  $g.DrawLine($ppen, $plusCx, ($plusCy - 9), $plusCx, ($plusCy + 9))
  $ppen.Dispose()
  Fill-RoundRect $g (New-Brush "#1a1a1a") ($px + 24) ($py + 70) ($pw - 48) 50 12
  $spen = New-Pen "#9a9a9a" 2
  $g.DrawEllipse($spen, ($px + 42), ($py + 87), 14, 14)
  $g.DrawLine($spen, ($px + 53), ($py + 98), ($px + 60), ($py + 105))
  $spen.Dispose()
  Draw-Text $g "搜索提示词 / Search" ($px + 74) ($py + 83) 16 "#bdbdbd" "Regular" 220 26
  Draw-MiniCard $g ($px + 24) ($py + 138) ($pw - 48) "Plan 模式" "Review and improve this plan"
  Draw-MiniCard $g ($px + 24) ($py + 226) ($pw - 48) "修改方案" "Generate an actionable proposal"
  Draw-MiniCard $g ($px + 24) ($py + 314) ($pw - 48) "SEO 标题" "Create titles and descriptions"
  Save-Canvas $c
}

Generate-SmallTile
Generate-Marquee

Write-Host "Generated promo assets in $outDir"
