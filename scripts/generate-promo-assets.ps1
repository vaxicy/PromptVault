Add-Type -AssemblyName System.Drawing

$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $PSScriptRoot
$outDir = Join-Path $root "store-assets\promo"
New-Item -ItemType Directory -Force -Path $outDir | Out-Null

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

function Draw-Icon($g, $x, $y, $size, $color) {
  $pen = New-Pen $color ([Math]::Max(2, [int]($size / 10)))
  $pen.StartCap = [System.Drawing.Drawing2D.LineCap]::Round
  $pen.EndCap = [System.Drawing.Drawing2D.LineCap]::Round
  Draw-RoundRect $g $pen $x $y $size $size ([Math]::Max(4, [int]($size / 8)))
  $g.DrawLine($pen, $x + $size * 0.36, $y + $size * 0.18, $x + $size * 0.36, $y + $size * 0.82)
  $pen.Dispose()
}

function Draw-MiniCard($g, $x, $y, $w, $title, $desc) {
  Fill-RoundRect $g (New-Brush "#ffffff") $x $y $w 78 10
  Draw-RoundRect $g (New-Pen "#dedede" 1) $x $y $w 78 10
  Draw-Text $g $title ($x + 18) ($y + 13) 17 "#111111" "Bold" ($w - 36) 24
  Draw-Text $g $desc ($x + 18) ($y + 42) 13 "#666666" "Regular" ($w - 36) 22
}

function New-Canvas($path, $w, $h) {
  $bmp = [System.Drawing.Bitmap]::new($w, $h, [System.Drawing.Imaging.PixelFormat]::Format24bppRgb)
  $g = [System.Drawing.Graphics]::FromImage($bmp)
  $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
  $g.TextRenderingHint = [System.Drawing.Text.TextRenderingHint]::ClearTypeGridFit
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
  Fill-RoundRect $g (New-Brush "#111111") 42 42 58 58 14
  Draw-Icon $g 58 56 28 "#ffffff"
  Draw-Text $g "PromptVault" 116 42 31 "#111111" "Bold" 270 42
  Draw-Text $g "AI 提示词管理器" 118 88 19 "#444444" "Regular" 240 28
  Draw-Text $g "AI Prompt Manager" 118 116 16 "#777777" "Regular" 240 24
  Fill-RoundRect $g (New-Brush "#111111") 44 164 146 38 10
  Draw-Text $g "保存 · 搜索 · 复用" 60 172 15 "#ffffff" "Bold" 120 22
  Fill-RoundRect $g (New-Brush "#f7f7f7") 204 164 168 38 10
  Draw-RoundRect $g (New-Pen "#dedede" 1) 204 164 168 38 10
  Draw-Text $g "Save · Search · Reuse" 220 172 15 "#111111" "Bold" 140 22
  Draw-Text $g "本地保存，不上传提示词" 46 224 14 "#666666" "Regular" 180 22
  Draw-Text $g "Local-first, privacy-friendly" 226 224 14 "#666666" "Regular" 180 22
  Save-Canvas $c
}

function Generate-Marquee {
  $c = New-Canvas (Join-Path $outDir "marquee-promo-tile-1400x560.png") 1400 560
  $g = $c.Graphics
  Fill-RoundRect $g (New-Brush "#ffffff") 52 44 1296 472 34
  Draw-RoundRect $g (New-Pen "#dedede" 1) 52 44 1296 472 34
  Fill-RoundRect $g (New-Brush "#111111") 96 88 82 82 20
  Draw-Icon $g 118 108 42 "#ffffff"
  Draw-Text $g "PromptVault" 210 86 62 "#111111" "Bold" 480 78
  Draw-Text $g "保存、搜索、复用你的 AI 提示词" 216 176 34 "#333333" "Regular" 650 48
  Draw-Text $g "Save, search, and reuse your AI prompts" 218 226 27 "#666666" "Regular" 650 40
  Fill-RoundRect $g (New-Brush "#111111") 216 306 238 52 12
  Draw-Text $g "本地保存 / Local-first" 240 319 20 "#ffffff" "Bold" 200 28
  Fill-RoundRect $g (New-Brush "#f7f7f7") 474 306 260 52 12
  Draw-RoundRect $g (New-Pen "#dedede" 1) 474 306 260 52 12
  Draw-Text $g "侧边栏 / Sidebar" 500 319 20 "#111111" "Bold" 210 28
  Fill-RoundRect $g (New-Brush "#f7f7f7") 216 380 312 52 12
  Draw-RoundRect $g (New-Pen "#dedede" 1) 216 380 312 52 12
  Draw-Text $g "中英双语 / Bilingual UI" 242 393 20 "#111111" "Bold" 260 28
  Fill-RoundRect $g (New-Brush "#111111") 850 94 360 420 22
  Fill-RoundRect $g (New-Brush "#181818") 878 126 304 54 12
  Draw-Text $g "搜索提示词..." 930 141 18 "#bdbdbd" "Regular" 160 28
  Draw-Text $g "Search prompts..." 930 166 13 "#777777" "Regular" 160 22
  Draw-MiniCard $g 878 220 304 "Plan 模式" "Review and improve this plan"
  Draw-MiniCard $g 878 318 304 "修改方案" "Generate an actionable proposal"
  Draw-MiniCard $g 878 416 304 "SEO 标题" "Create titles and descriptions"
  Fill-RoundRect $g (New-Brush "#ffffff") 1236 246 48 118 16
  Draw-RoundRect $g (New-Pen "#dedede" 1) 1236 246 48 118 16
  Draw-Icon $g 1248 288 24 "#111111"
  Save-Canvas $c
}

Generate-SmallTile
Generate-Marquee

Write-Host "Generated promo assets in $outDir"
