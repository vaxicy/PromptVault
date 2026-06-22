Add-Type -AssemblyName System.Drawing

$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $PSScriptRoot
$outDir = Join-Path $root "store-assets\screenshots"
New-Item -ItemType Directory -Force -Path $outDir | Out-Null

$W = 1280
$H = 800

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

function Draw-Icon($g, $kind, $x, $y, $size, $color = "#111111") {
  $pen = New-Pen $color 3
  $pen.StartCap = [System.Drawing.Drawing2D.LineCap]::Round
  $pen.EndCap = [System.Drawing.Drawing2D.LineCap]::Round
  if ($kind -eq "search") {
    $g.DrawEllipse($pen, $x, $y, $size * 0.62, $size * 0.62)
    $g.DrawLine($pen, $x + $size * 0.55, $y + $size * 0.55, $x + $size, $y + $size)
  } elseif ($kind -eq "doc") {
    $g.DrawRectangle($pen, $x + 4, $y + 2, $size - 8, $size - 4)
    $g.DrawLine($pen, $x + 10, $y + 13, $x + $size - 10, $y + 13)
  } elseif ($kind -eq "folder") {
    $g.DrawRectangle($pen, $x + 2, $y + 9, $size - 4, $size - 11)
    $g.DrawLine($pen, $x + 2, $y + 9, $x + 13, $y + 9)
    $g.DrawLine($pen, $x + 13, $y + 9, $x + 18, $y + 4)
    $g.DrawLine($pen, $x + 18, $y + 4, $x + $size - 4, $y + 4)
  } elseif ($kind -eq "tag") {
    $g.DrawLine($pen, $x + 4, $y + 4, $x + $size - 6, $y + 4)
    $g.DrawLine($pen, $x + $size - 6, $y + 4, $x + $size - 2, $y + 12)
    $g.DrawLine($pen, $x + $size - 2, $y + 12, $x + 12, $y + $size - 2)
    $g.DrawLine($pen, $x + 12, $y + $size - 2, $x + 4, $y + $size - 10)
    $g.DrawLine($pen, $x + 4, $y + $size - 10, $x + 4, $y + 4)
  } elseif ($kind -eq "pin") {
    $g.DrawLine($pen, $x + $size / 2, $y + $size * 0.65, $x + $size / 2, $y + $size)
    $g.DrawLine($pen, $x + 7, $y + $size * 0.62, $x + $size - 7, $y + $size * 0.62)
    $g.DrawLine($pen, $x + 12, $y + 4, $x + $size - 12, $y + 4)
    $g.DrawLine($pen, $x + 12, $y + 4, $x + 12, $y + $size * 0.35)
    $g.DrawLine($pen, $x + $size - 12, $y + 4, $x + $size - 12, $y + $size * 0.35)
  } elseif ($kind -eq "copy") {
    $g.DrawRectangle($pen, $x + 8, $y + 8, $size - 10, $size - 10)
    $g.DrawRectangle($pen, $x + 2, $y + 2, $size - 10, $size - 10)
  } elseif ($kind -eq "insert") {
    $g.DrawLine($pen, $x + $size - 2, $y + 4, $x + $size - 2, $y + $size - 4)
    $g.DrawLine($pen, $x + 4, $y + $size / 2, $x + $size - 8, $y + $size / 2)
    $g.DrawLine($pen, $x + 11, $y + 8, $x + 4, $y + $size / 2)
    $g.DrawLine($pen, $x + 11, $y + $size - 8, $x + 4, $y + $size / 2)
  }
  $pen.Dispose()
}

function Draw-Popup($g, $x, $y, $dark = $false, $grouped = $false) {
  $bg = if ($dark) { "#121212" } else { "#ffffff" }
  $card = if ($dark) { "#181818" } else { "#f7f7f7" }
  $border = if ($dark) { "#353535" } else { "#dedede" }
  $text = if ($dark) { "#f5f5f5" } else { "#111111" }
  $muted = if ($dark) { "#bdbdbd" } else { "#666666" }
  $shadow = New-Brush "#16000000"
  Fill-RoundRect $g $shadow ($x + 12) ($y + 18) 430 610 16
  $shadow.Dispose()
  Fill-RoundRect $g (New-Brush $bg) $x $y 430 610 14
  Draw-RoundRect $g (New-Pen $border 1) $x $y 430 610 14
  Draw-Text $g "PromptVault" ($x + 28) ($y + 24) 30 $text "Bold" 260 42
  Draw-Icon $g "search" ($x + 36) ($y + 104) 24 $muted
  Fill-RoundRect $g (New-Brush $card) ($x + 24) ($y + 88) 382 58 12
  Draw-RoundRect $g (New-Pen $border 1) ($x + 24) ($y + 88) 382 58 12
  Draw-Text $g "搜索提示词..." ($x + 78) ($y + 104) 20 $muted "Regular" 250 30
  Draw-Icon $g "doc" ($x + 28) ($y + 178) 22 $text
  Draw-Text $g "提示词" ($x + 60) ($y + 174) 20 $text "Bold" 84 30
  Draw-Icon $g "folder" ($x + 160) ($y + 178) 24 $muted
  Draw-Text $g "文件夹" ($x + 196) ($y + 174) 20 $muted "Bold" 86 30
  Draw-Icon $g "tag" ($x + 300) ($y + 178) 24 $muted
  Draw-Text $g "标签" ($x + 334) ($y + 174) 20 $muted "Bold" 70 30
  Fill-RoundRect $g (New-Brush $text) ($x + 24) ($y + 214) 76 3 1
  Fill-RoundRect $g (New-Brush $card) ($x + 24) ($y + 246) 92 46 7
  Draw-Text $g "智能⌄" ($x + 42) ($y + 258) 18 $muted "Regular" 70 28
  Fill-RoundRect $g (New-Brush $text) ($x + 352) ($y + 246) 42 46 7
  Draw-Text $g "+" ($x + 365) ($y + 249) 32 $(if ($dark) { "#111111" } else { "#ffffff" }) "Bold" 34 40
  $items = @(
    @("Plan 模式", "请给我优化方案 我说行了再执行", "vibe coding", "使用 44 次 · 刚刚"),
    @("修改方案", "请给我修改方案 我说行了再执行", "vibe coding", "使用 25 次 · 1 小时前"),
    @("修复错误", "请排查一下 统一修复", "vibe coding", "使用 7 次 · 3 小时前")
  )
  $cy = $y + 318
  foreach ($it in $items) {
    Fill-RoundRect $g (New-Brush $card) ($x + 24) $cy 382 112 10
    Draw-RoundRect $g (New-Pen $border 1) ($x + 24) $cy 382 112 10
    Draw-Text $g $it[0] ($x + 42) ($cy + 22) 21 $text "Bold" 220 30
    Draw-Text $g $it[1] ($x + 42) ($cy + 56) 16 $muted "Regular" 300 24
    Fill-RoundRect $g (New-Brush $(if ($dark) { "#242424" } else { "#eeeeee" })) ($x + 42) ($cy + 84) 92 24 12
    Draw-Text $g $it[2] ($x + 54) ($cy + 86) 14 $muted "Regular" 100 20
    Draw-Text $g $it[3] ($x + 154) ($cy + 86) 14 $muted "Regular" 180 20
    $cy += 128
  }
}

function Draw-Sidebar($g, $x, $y, $dark = $false) {
  $bg = if ($dark) { "#121212" } else { "#ffffff" }
  $card = if ($dark) { "#181818" } else { "#ffffff" }
  $hover = if ($dark) { "#242424" } else { "#f5f5f5" }
  $border = if ($dark) { "#353535" } else { "#dedede" }
  $text = if ($dark) { "#f5f5f5" } else { "#111111" }
  $muted = if ($dark) { "#bdbdbd" } else { "#666666" }
  Fill-RoundRect $g (New-Brush $bg) $x $y 360 700 0
  Draw-RoundRect $g (New-Pen $border 1) $x $y 360 700 0
  Draw-Text $g "PromptVault" ($x + 26) ($y + 28) 28 $text "Bold" 230 40
  Draw-Icon $g "search" ($x + 34) ($y + 126) 24 $muted
  Fill-RoundRect $g (New-Brush $card) ($x + 18) ($y + 112) 324 60 12
  Draw-RoundRect $g (New-Pen $border 1) ($x + 18) ($y + 112) 324 60 12
  Draw-Text $g "搜索提示词..." ($x + 74) ($y + 130) 18 $muted "Regular" 220 28
  Draw-Text $g "全部" ($x + 38) ($y + 206) 18 $text "Bold" 60 28
  Draw-Text $g "最近" ($x + 120) ($y + 206) 18 $muted "Bold" 60 28
  Draw-Text $g "置顶" ($x + 206) ($y + 206) 18 $muted "Bold" 60 28
  Fill-RoundRect $g (New-Brush $text) ($x + 32) ($y + 236) 58 3 1
  $items = @(
    @("Plan 模式", "请给我优化方案 我说行了再执行", "vibe coding", "使用 44 次 · 刚刚"),
    @("修改方案", "请给我修改方案 我说行了再执行", "vibe coding", "使用 25 次 · 1 小时前"),
    @("生成pin图", "我要做这个的 请给我生成pin图", "Amazon Affiliate Pinterest", "使用 3 次")
  )
  $cy = $y + 274
  $idx = 0
  foreach ($it in $items) {
    $fill = if ($idx -eq 0) { $hover } else { $bg }
    Fill-RoundRect $g (New-Brush $fill) ($x + 18) $cy 324 124 10
    if ($idx -eq 0) { Draw-RoundRect $g (New-Pen $border 1) ($x + 18) $cy 324 124 10 }
    Draw-Text $g $it[0] ($x + 36) ($cy + 20) 20 $text "Bold" 180 30
    Draw-Text $g $it[1] ($x + 36) ($cy + 54) 16 $muted "Regular" 260 24
    Draw-Text $g $it[2] ($x + 36) ($cy + 86) 15 $muted "Regular" 160 24
    Draw-Text $g $it[3] ($x + 198) ($cy + 86) 14 $muted "Regular" 130 24
    $cy += 138
    $idx += 1
  }
  Fill-RoundRect $g (New-Brush $(if ($dark) { "#181818" } else { "#f7f7f7" })) $x ($y + 654) 360 46 0
  Draw-Text $g "快捷键打开   Ctrl + Shift + P" ($x + 74) ($y + 666) 15 $muted "Regular" 240 24
}

function New-Canvas($path, $dark = $false) {
  $bmp = [System.Drawing.Bitmap]::new($W, $H, [System.Drawing.Imaging.PixelFormat]::Format24bppRgb)
  $g = [System.Drawing.Graphics]::FromImage($bmp)
  $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
  $g.TextRenderingHint = [System.Drawing.Text.TextRenderingHint]::ClearTypeGridFit
  $g.Clear([System.Drawing.ColorTranslator]::FromHtml($(if ($dark) { "#0d0d0d" } else { "#f4f4f4" })))
  return @{ Bitmap = $bmp; Graphics = $g; Path = $path }
}

function Save-Canvas($canvas) {
  $canvas.Graphics.Dispose()
  $canvas.Bitmap.Save($canvas.Path, [System.Drawing.Imaging.ImageFormat]::Png)
  $canvas.Bitmap.Dispose()
}

function Draw-BrowserMock($g, $x, $y, $w, $h, $dark = $false) {
  $bg = if ($dark) { "#050505" } else { "#ffffff" }
  $bar = if ($dark) { "#151515" } else { "#f2f2f2" }
  $border = if ($dark) { "#303030" } else { "#d8d8d8" }
  Fill-RoundRect $g (New-Brush $bg) $x $y $w $h 16
  Draw-RoundRect $g (New-Pen $border 1) $x $y $w $h 16
  Fill-RoundRect $g (New-Brush $bar) $x $y $w 52 16
  Fill-RoundRect $g (New-Brush "#ff5f57") ($x + 22) ($y + 20) 12 12 6
  Fill-RoundRect $g (New-Brush "#ffbd2e") ($x + 44) ($y + 20) 12 12 6
  Fill-RoundRect $g (New-Brush "#28c840") ($x + 66) ($y + 20) 12 12 6
  Fill-RoundRect $g (New-Brush $(if ($dark) { "#222222" } else { "#ffffff" })) ($x + 110) ($y + 14) ($w - 150) 24 12
}

function Screenshot-01 {
  $c = New-Canvas (Join-Path $outDir "01-main-interface.png")
  $g = $c.Graphics
  Draw-Text $g "PromptVault" 72 76 56 "#111111" "Bold" 420 70
  Draw-Text $g "保存、搜索、复用你的 AI 提示词" 76 148 29 "#333333" "Regular" 610 42
  Draw-Text $g "Save, search, and reuse your AI prompts" 78 190 24 "#555555" "Regular" 610 36
  Draw-Text $g "一个轻量、安静、隐私友好的提示词管理器。" 78 236 20 "#666666" "Regular" 600 30
  Draw-Text $g "A lightweight, quiet, privacy-friendly prompt manager." 78 266 17 "#777777" "Regular" 620 28
  Draw-Popup $g 744 86 $false
  Fill-RoundRect $g (New-Brush "#111111") 78 334 300 70 10
  Draw-Text $g "点击卡片即可复制" 104 344 19 "#ffffff" "Bold" 250 28
  Draw-Text $g "Click a card to copy" 104 372 15 "#d6d6d6" "Regular" 240 22
  Fill-RoundRect $g (New-Brush "#ffffff") 78 430 330 72 10
  Draw-RoundRect $g (New-Pen "#d8d8d8" 1) 78 430 330 72 10
  Draw-Text $g "本地保存，不上传提示词" 104 440 19 "#111111" "Bold" 290 28
  Draw-Text $g "Local storage, no prompt uploads" 104 468 15 "#666666" "Regular" 280 22
  Fill-RoundRect $g (New-Brush "#ffffff") 78 526 300 72 10
  Draw-RoundRect $g (New-Pen "#d8d8d8" 1) 78 526 300 72 10
  Draw-Text $g "中英双语界面" 104 536 19 "#111111" "Bold" 250 28
  Draw-Text $g "Chinese and English UI" 104 564 15 "#666666" "Regular" 260 22
  Save-Canvas $c
}

function Screenshot-02 {
  $c = New-Canvas (Join-Path $outDir "02-sidebar-workflow.png") $true
  $g = $c.Graphics
  Draw-BrowserMock $g 56 58 820 680 $true
  Draw-Text $g "ChatGPT" 96 128 32 "#f5f5f5" "Bold" 220 44
  Draw-Text $g "在网页侧边栏里快速调用常用提示词" 96 178 27 "#e5e5e5" "Regular" 600 40
  Draw-Text $g "Access prompts from an in-page sidebar" 96 218 22 "#bdbdbd" "Regular" 600 34
  Fill-RoundRect $g (New-Brush "#151515") 96 286 650 96 18
  Draw-Text $g "告诉我这个方案哪里可以优化，并给出修改建议。" 126 306 22 "#d8d8d8" "Regular" 570 32
  Draw-Text $g "Review this plan and suggest improvements." 126 340 18 "#9f9f9f" "Regular" 570 28
  Draw-Sidebar $g 860 58 $true
  Fill-RoundRect $g (New-Brush "#111111") 1220 332 52 112 16
  Draw-RoundRect $g (New-Pen "#444444" 1) 1220 332 52 112 16
  Draw-Icon $g "doc" 1234 374 24 "#ffffff"
  Save-Canvas $c
}

function Screenshot-03 {
  $c = New-Canvas (Join-Path $outDir "03-search-organize.png")
  $g = $c.Graphics
  Draw-Text $g "搜索、标签、文件夹，一起整理" 72 62 42 "#111111" "Bold" 760 56
  Draw-Text $g "Organize with search, tags, and folders" 76 116 28 "#444444" "Regular" 760 42
  Draw-Text $g "通过关键词、标签、文件夹快速找到需要的提示词。" 76 162 20 "#666666" "Regular" 720 30
  Draw-Text $g "Find the right prompt by keyword, tag, or folder." 76 190 17 "#777777" "Regular" 720 28
  Draw-Popup $g 70 216 $false
  $x = 610
  Fill-RoundRect $g (New-Brush "#ffffff") $x 218 560 118 16
  Draw-RoundRect $g (New-Pen "#dedede" 1) $x 218 560 118 16
  Draw-Icon $g "search" ($x + 34) 254 28 "#111111"
  Draw-Text $g "folder:营销  tag:SEO  title:标题" ($x + 84) 254 26 "#111111" "Bold" 430 38
  $features = @(
    @("文件夹分组", "Folder groups", "把工作流、项目、客户资料分开放。", "Separate workflows, projects, and clients.", "folder"),
    @("标签检索", "Tag search", "用 tag 快速定位主题和场景。", "Find prompts by topic and use case.", "tag"),
    @("置顶高频", "Pinned prompts", "把每天都用的提示词放在最前面。", "Keep daily prompts at the top.", "pin")
  )
  $fy = 382
  foreach ($f in $features) {
    Fill-RoundRect $g (New-Brush "#ffffff") $x $fy 560 104 16
    Draw-RoundRect $g (New-Pen "#dedede" 1) $x $fy 560 104 16
    Draw-Icon $g $f[4] ($x + 28) ($fy + 32) 30 "#111111"
    Draw-Text $g $f[0] ($x + 82) ($fy + 16) 22 "#111111" "Bold" 180 30
    Draw-Text $g $f[1] ($x + 268) ($fy + 18) 18 "#555555" "Regular" 230 28
    Draw-Text $g $f[2] ($x + 82) ($fy + 50) 16 "#666666" "Regular" 410 24
    Draw-Text $g $f[3] ($x + 82) ($fy + 74) 14 "#777777" "Regular" 430 22
    $fy += 126
  }
  Save-Canvas $c
}

function Screenshot-04 {
  $c = New-Canvas (Join-Path $outDir "04-copy-insert.png")
  $g = $c.Graphics
  Draw-Text $g "复制或插入，少一次重复输入" 72 62 42 "#111111" "Bold" 760 56
  Draw-Text $g "Copy or insert with fewer repeated steps" 76 116 28 "#444444" "Regular" 760 42
  Draw-Text $g "主卡片点击复制；侧边栏按钮可插入到当前网页输入框。" 76 162 20 "#666666" "Regular" 760 30
  Draw-Text $g "Click cards to copy, or insert prompts into the active page input." 76 190 17 "#777777" "Regular" 820 28
  Draw-BrowserMock $g 60 216 720 500 $false
  Fill-RoundRect $g (New-Brush "#ffffff") 120 318 600 92 16
  Draw-RoundRect $g (New-Pen "#dedede" 1) 120 318 600 92 16
  Draw-Text $g "请根据这个产品截图生成标题和描述" 150 334 22 "#111111" "Regular" 500 34
  Draw-Text $g "Generate a title and description from this image" 150 366 18 "#666666" "Regular" 520 28
  Draw-Sidebar $g 820 116 $false
  Fill-RoundRect $g (New-Brush "#111111") 530 512 170 56 12
  Draw-Icon $g "copy" 556 528 24 "#ffffff"
  Draw-Text $g "复制 Copy" 592 526 20 "#ffffff" "Bold" 100 30
  Fill-RoundRect $g (New-Brush "#ffffff") 984 252 158 46 10
  Draw-RoundRect $g (New-Pen "#dedede" 1) 984 252 158 46 10
  Draw-Icon $g "insert" 1002 263 22 "#111111"
  Draw-Text $g "插入 Insert" 1036 262 18 "#111111" "Bold" 92 28
  Save-Canvas $c
}

function Screenshot-05 {
  $c = New-Canvas (Join-Path $outDir "05-privacy-backup.png")
  $g = $c.Graphics
  Draw-Text $g "本地保存，导入导出更安心" 72 62 42 "#111111" "Bold" 760 56
  Draw-Text $g "Local storage with easy backup" 76 116 28 "#444444" "Regular" 760 42
  Draw-Text $g "提示词默认保存在浏览器本地，不上传服务器；随时导出备份。" 76 162 20 "#666666" "Regular" 800 30
  Draw-Text $g "Prompts stay in your browser by default. Export anytime for backup." 76 190 17 "#777777" "Regular" 860 28
  Draw-Popup $g 76 224 $false
  $x = 620
  $cards = @(
    @("本地存储", "Local storage", "你的提示词内容默认保存在 Chrome 本地存储中。", "Your prompt content is stored locally in Chrome."),
    @("导入 / 导出", "Import / Export", "用 JSON 文件备份和迁移你的提示词库。", "Back up and move your prompt library with JSON."),
    @("深色 / 浅色主题", "Light / Dark theme", "主界面、侧边栏和悬浮按钮保持一致风格。", "Popup, sidebar, and floating button stay consistent.")
  )
  $y = 226
  foreach ($card in $cards) {
    Fill-RoundRect $g (New-Brush "#ffffff") $x $y 560 124 18
    Draw-RoundRect $g (New-Pen "#dedede" 1) $x $y 560 124 18
    Draw-Text $g $card[0] ($x + 36) ($y + 18) 26 "#111111" "Bold" 180 34
    Draw-Text $g $card[1] ($x + 228) ($y + 22) 20 "#555555" "Regular" 260 30
    Draw-Text $g $card[2] ($x + 36) ($y + 60) 17 "#666666" "Regular" 470 26
    Draw-Text $g $card[3] ($x + 36) ($y + 88) 15 "#777777" "Regular" 490 24
    $y += 150
  }
  Save-Canvas $c
}

Screenshot-01
Screenshot-02
Screenshot-03
Screenshot-04
Screenshot-05

Write-Host "Generated screenshots in $outDir"
