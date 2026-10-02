# Generate Chrome Web Store screenshots (1280x800) for PromptVault.
# Produces one independent set per language: store-assets/screenshots/zh-CN/ and /en/.

Add-Type -AssemblyName System.Drawing

$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $PSScriptRoot
$shotsRoot = Join-Path $root "store-assets\screenshots"
$W = 1280
$H = 800

# ---------------------------------------------------------------- translations

$Translations = @{
  zh = @{
    Search = "搜索提示词..."
    TabPrompts = "提示词"; TabFolders = "文件夹"; TabTags = "标签"
    Sort = "智能⌄"
    PopupCards = @(
      @("Plan 模式", "请给我优化方案 我说行了再执行", "vibe coding", "使用 44 次 · 刚刚"),
      @("修改方案", "请给我修改方案 我说行了再执行", "vibe coding", "使用 25 次 · 1 小时前"),
      @("修复错误", "请排查一下 统一修复", "vibe coding", "使用 7 次 · 3 小时前")
    )
    VarTitle = "变量 + 关键词，填值只要点一下"
    VarSubtitle = "把提示词变成能反复用的模板"
    VarDesc = "复制或插入时弹出填空框，常用值点一下就填好。"
    VarDialogTitle = "填写变量"
    VarDialogHint = "填入内容后插入，留空的变量会被移除"
    VarDialogPresetHint = "点击关键词即可一键填入，可添加、更新或删除"
    VarName1 = "主题"; VarValue1 = "写一篇产品文案"
    VarChips1 = @("产品文案", "SEO 标题", "用户反馈", "+ 添加关键词")
    VarName2 = "语气"; VarValue2 = "在此输入..."
    VarChips2 = @("正式", "轻松", "专业", "+ 添加关键词")
    VarCancel = "取消"; VarInsert = "插入"
    VarCards = @(
      @("doc", "变量模板", "用 {{主题}} 这样的占位符代替每次要换的内容。", "变量名支持中文。"),
      @("tag", "关键词一键填入", "常用值存成关键词，填变量时点一下即填入。", "每个变量最多 8 个，可随时增删改。"),
      @("folder", "每条提示词独立", "关键词跟着提示词走，同名变量互不影响。", "导出、回收站还原都会带上。")
    )
  }
  en = @{
    Search = "Search prompts..."
    TabPrompts = "Prompts"; TabFolders = "Folders"; TabTags = "Tags"
    Sort = "Smart ⌄"
    PopupCards = @(
      @("Plan mode", "Optimize my plan, wait for my go", "vibe coding", "Used 44 times · just now"),
      @("Revise plan", "Apply my feedback and update it", "vibe coding", "Used 25 times · 1h ago"),
      @("Fix this bug", "Find the root cause and fix it", "vibe coding", "Used 7 times · 3h ago")
    )
    VarTitle = "Variables with one-click keywords"
    VarSubtitle = "Turn prompts into reusable templates"
    VarDesc = "A fill-in dialog appears on copy or insert; frequent values are one tap away."
    VarDialogTitle = "Fill in Variables"
    VarDialogHint = "Fill in the values; blank ones will be removed"
    VarDialogPresetHint = "Click a keyword to fill it in; add, update or delete anytime"
    VarName1 = "Topic"; VarValue1 = "Write product launch copy"
    VarChips1 = @("Launch copy", "SEO titles", "+ Add keyword")
    VarName2 = "Tone"; VarValue2 = "Type here..."
    VarChips2 = @("Formal", "Casual", "Expert", "+ Add keyword")
    VarCancel = "Cancel"; VarInsert = "Insert"
    VarCards = @(
      @("doc", "Variable templates", "Use {{topic}} for the parts that change.", "Variable names can be Chinese."),
      @("tag", "One-click keywords", "Save frequent values as keywords.", "Fill them in with one tap (up to 8 each)."),
      @("folder", "Per-prompt keywords", "Keywords belong to their own prompt.", "Exported and restored with it.")
    )
  }
}

# ---------------------------------------------------------------- helpers

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
  } elseif ($kind -eq "send") {
    # paper plane
    $g.DrawLine($pen, $x + 2, $y + $size * 0.55, $x + $size - 2, $y + 2)
    $g.DrawLine($pen, $x + $size - 2, $y + 2, $x + $size * 0.45, $y + $size - 2)
    $g.DrawLine($pen, $x + $size * 0.45, $y + $size - 2, $x + $size * 0.42, $y + $size * 0.58)
    $g.DrawLine($pen, $x + $size * 0.42, $y + $size * 0.58, $x + 2, $y + $size * 0.55)
    $g.DrawLine($pen, $x + $size * 0.42, $y + $size * 0.58, $x + $size - 2, $y + 2)
  }
  $pen.Dispose()
}

function Draw-Popup($g, $x, $y, $dark = $false) {
  $T = $script:T
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
  Draw-Text $g $T.Search ($x + 78) ($y + 104) 20 $muted "Regular" 250 30
  Draw-Icon $g "doc" ($x + 28) ($y + 178) 22 $text
  Draw-Text $g $T.TabPrompts ($x + 60) ($y + 174) 20 $text "Bold" 100 30
  Draw-Icon $g "folder" ($x + 160) ($y + 178) 24 $muted
  Draw-Text $g $T.TabFolders ($x + 196) ($y + 174) 20 $muted "Bold" 90 30
  Draw-Icon $g "tag" ($x + 300) ($y + 178) 24 $muted
  Draw-Text $g $T.TabTags ($x + 334) ($y + 174) 20 $muted "Bold" 70 30
  Fill-RoundRect $g (New-Brush $text) ($x + 24) ($y + 214) 80 3 1
  Fill-RoundRect $g (New-Brush $card) ($x + 24) ($y + 246) 92 46 7
  Draw-Text $g $T.Sort ($x + 30) ($y + 258) 18 $muted "Regular" 80 28
  Fill-RoundRect $g (New-Brush $text) ($x + 352) ($y + 246) 42 46 7
  Draw-Text $g "+" ($x + 365) ($y + 249) 32 $(if ($dark) { "#111111" } else { "#ffffff" }) "Bold" 34 40
  # Only two cards fit inside the 610px panel — a third one would poke out of
  # the bottom edge (the mock is a static picture, not a scrollable list).
  $cy = $y + 318
  foreach ($it in @($T.PopupCards)[0..1]) {
    Fill-RoundRect $g (New-Brush $card) ($x + 24) $cy 382 112 10
    Draw-RoundRect $g (New-Pen $border 1) ($x + 24) $cy 382 112 10
    Draw-Text $g $it[0] ($x + 42) ($cy + 22) 21 $text "Bold" 230 30
    Draw-Text $g $it[1] ($x + 42) ($cy + 56) 16 $muted "Regular" 310 24
    Fill-RoundRect $g (New-Brush $(if ($dark) { "#242424" } else { "#eeeeee" })) ($x + 42) ($cy + 84) 92 24 12
    Draw-Text $g $it[2] ($x + 54) ($cy + 86) 14 $muted "Regular" 100 20
    Draw-Text $g $it[3] ($x + 154) ($cy + 86) 14 $muted "Regular" 190 20
    $cy += 128
  }
}

# Chips are measured, not guessed: English labels are much wider than the CJK
# ones at the same pixel size, so a hard-coded width always truncates one of
# the two languages.
function Measure-TextWidth($g, $text, $size, $style = "Regular") {
  $font = New-Font $size $style
  $w = $g.MeasureString($text, $font).Width
  $font.Dispose()
  return $w
}

# Draws one row of keyword chips (last item = the dashed "add" chip) and
# returns the y coordinate just below the row.
function Draw-ChipRow($g, $x, $y, $maxW, $items, $activeIndex = -1) {
  $cx = $x
  $cy = $y
  $i = 0
  foreach ($item in $items) {
    $isAdd = ($i -eq ($items.Count - 1))
    $chipW = [Math]::Round((Measure-TextWidth $g $item 15 "Bold")) + 34
    if (($cx + $chipW) -gt ($x + $maxW)) { $cx = $x; $cy += 44 }
    $isActive = (-not $isAdd) -and ($i -eq $activeIndex)
    $fill = if ($isAdd) { "#1b1b1b" } elseif ($isActive) { "#f5f5f5" } else { "#262626" }
    $stroke = if ($isAdd) { "#4a4a4a" } else { "#3a3a3a" }
    $fg = if ($isActive) { "#111111" } else { "#e6e6e6" }
    Fill-RoundRect $g (New-Brush $fill) $cx $cy $chipW 34 17
    Draw-RoundRect $g (New-Pen $stroke 1) $cx $cy $chipW 34 17
    Draw-Text $g $item ($cx + 17) ($cy + 8) 15 $fg "Bold" ($chipW - 24) 22
    $cx += $chipW + 10
    $i += 1
  }
  return $cy + 34
}

# The {{variable}} fill-in dialog — the feature this screenshot exists for.
function Draw-VariableDialog($g, $x, $y, $w = 600) {
  $T = $script:T
  $bg = "#161616"
  $card = "#1e1e1e"
  $border = "#333333"
  $text = "#f5f5f5"
  $muted = "#a8a8a8"
  $accent = "#8ab4f8"
  $h = 500
  $shadow = New-Brush "#20000000"
  Fill-RoundRect $g $shadow ($x + 12) ($y + 16) $w $h 18
  $shadow.Dispose()
  Fill-RoundRect $g (New-Brush $bg) $x $y $w $h 18
  Draw-RoundRect $g (New-Pen $border 1) $x $y $w $h 18

  Draw-Text $g $T.VarDialogTitle ($x + 28) ($y + 22) 24 $text "Bold" ($w - 120) 34
  Draw-Text $g $T.VarDialogHint ($x + 28) ($y + 62) 15 $muted "Regular" ($w - 56) 24
  Draw-Text $g $T.VarDialogPresetHint ($x + 28) ($y + 88) 15 $accent "Regular" ($w - 56) 24

  $fx = $x + 28
  $fw = $w - 56

  Draw-Text $g $T.VarName1 $fx ($y + 130) 16 $text "Bold" 220 24
  Fill-RoundRect $g (New-Brush $card) $fx ($y + 156) $fw 46 10
  Draw-RoundRect $g (New-Pen $border 1) $fx ($y + 156) $fw 46 10
  Draw-Text $g $T.VarValue1 ($fx + 16) ($y + 168) 17 $text "Regular" ($fw - 32) 26
  $after = Draw-ChipRow $g $fx ($y + 212) $fw $T.VarChips1 0

  Draw-Text $g $T.VarName2 $fx ($after + 26) 16 $text "Bold" 220 24
  Fill-RoundRect $g (New-Brush $card) $fx ($after + 52) $fw 46 10
  Draw-RoundRect $g (New-Pen $border 1) $fx ($after + 52) $fw 46 10
  Draw-Text $g $T.VarValue2 ($fx + 16) ($after + 64) 17 $muted "Regular" ($fw - 32) 26
  $after2 = Draw-ChipRow $g $fx ($after + 108) $fw $T.VarChips2 -1

  $by = $after2 + 34
  $cancelW = [Math]::Round((Measure-TextWidth $g $T.VarCancel 16 "Bold")) + 48
  $okW = [Math]::Round((Measure-TextWidth $g $T.VarInsert 16 "Bold")) + 56
  $okX = $x + $w - 28 - $okW
  $cancelX = $okX - 12 - $cancelW
  Fill-RoundRect $g (New-Brush "#1b1b1b") $cancelX $by $cancelW 44 10
  Draw-RoundRect $g (New-Pen $border 1) $cancelX $by $cancelW 44 10
  Draw-Text $g $T.VarCancel ($cancelX + 24) ($by + 11) 16 $text "Bold" ($cancelW - 32) 24
  Fill-RoundRect $g (New-Brush "#f5f5f5") $okX $by $okW 44 10
  Draw-Text $g $T.VarInsert ($okX + 28) ($by + 11) 16 "#111111" "Bold" ($okW - 40) 24
}

function New-Canvas($path, $dark = $false) {
  $dir = Split-Path -Parent $path
  New-Item -ItemType Directory -Force -Path $dir | Out-Null
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

# ---------------------------------------------------------------- screenshots

function Screenshot-01($lang) {
  $key = if ($lang -like "zh*") { "zh" } else { "en" }
  $script:T = $Translations[$key]
  $zh = ($key -eq "zh")
  $c = New-Canvas (Join-Path (Join-Path $shotsRoot $lang) "01-main-interface.png")
  $g = $c.Graphics
  Draw-Text $g "PromptVault" 72 76 56 "#111111" "Bold" 420 70
  if ($zh) {
    Draw-Text $g "保存、搜索、复用你的 AI 提示词" 76 148 29 "#333333" "Regular" 640 42
    Draw-Text $g "一个轻量、安静、隐私友好的提示词管理器。" 78 202 20 "#666666" "Regular" 600 30
    Draw-Text $g "支持文件夹、标签、变量模板和关键词一键填入。" 78 238 17 "#777777" "Regular" 620 28
  } else {
    Draw-Text $g "Save, search, and reuse your AI prompts" 76 148 29 "#333333" "Regular" 640 42
    Draw-Text $g "A lightweight, quiet, privacy-friendly prompt manager." 78 202 20 "#666666" "Regular" 620 30
    Draw-Text $g "Folders, tags, variables, and keyword presets." 78 238 17 "#777777" "Regular" 620 28
  }
  Draw-Popup $g 744 86 $false
  # feature chips
  Fill-RoundRect $g (New-Brush "#111111") 78 334 320 70 10
  if ($zh) {
    Draw-Text $g "点击卡片即可复制" 104 344 19 "#ffffff" "Bold" 270 28
    Draw-Text $g "复制或插入后自动置顶（可关闭）" 104 372 15 "#d6d6d6" "Regular" 290 22
  } else {
    Draw-Text $g "Click a card to copy" 104 344 19 "#ffffff" "Bold" 280 28
    Draw-Text $g "Auto-top after use (optional)" 104 372 15 "#d6d6d6" "Regular" 290 22
  }
  Fill-RoundRect $g (New-Brush "#ffffff") 78 430 330 72 10
  Draw-RoundRect $g (New-Pen "#d8d8d8" 1) 78 430 330 72 10
  if ($zh) {
    Draw-Text $g "插入后自动发送" 104 440 19 "#111111" "Bold" 290 28
    Draw-Text $g "在 ChatGPT 上自动点击发送按钮" 104 468 15 "#666666" "Regular" 290 22
  } else {
    Draw-Text $g "Auto send after insert" 104 440 19 "#111111" "Bold" 290 28
    Draw-Text $g "Auto-clicks Send on ChatGPT (opt-in)" 104 468 15 "#666666" "Regular" 300 22
  }
  Fill-RoundRect $g (New-Brush "#ffffff") 78 526 320 72 10
  Draw-RoundRect $g (New-Pen "#d8d8d8" 1) 78 526 320 72 10
  if ($zh) {
    Draw-Text $g "本地保存，不上传" 104 536 19 "#111111" "Bold" 280 28
    Draw-Text $g "数据只存在你的浏览器里" 104 564 15 "#666666" "Regular" 280 22
  } else {
    Draw-Text $g "Local-first storage" 104 536 19 "#111111" "Bold" 280 28
    Draw-Text $g "Data never leaves your browser" 104 564 15 "#666666" "Regular" 290 22
  }
  Save-Canvas $c
}

function Screenshot-02($lang) {
  $key = if ($lang -like "zh*") { "zh" } else { "en" }
  $script:T = $Translations[$key]
  $zh = ($key -eq "zh")
  $c = New-Canvas (Join-Path (Join-Path $shotsRoot $lang) "02-variables-keywords.png") $true
  $g = $c.Graphics
  Draw-Text $g $script:T.VarTitle 72 62 42 "#f5f5f5" "Bold" 940 56
  Draw-Text $g $script:T.VarSubtitle 76 116 28 "#d0d0d0" "Regular" 940 42
  Draw-Text $g $script:T.VarDesc 76 162 19 "#a8a8a8" "Regular" 940 30
  Draw-VariableDialog $g 72 224 600
  # right column: what keywords buy you
  $x = 700
  $y = 224
  foreach ($card in $script:T.VarCards) {
    Fill-RoundRect $g (New-Brush "#161616") $x $y 480 110 16
    Draw-RoundRect $g (New-Pen "#333333" 1) $x $y 480 110 16
    Draw-Icon $g $card[0] ($x + 26) ($y + 34) 28 "#f5f5f5"
    Draw-Text $g $card[1] ($x + 74) ($y + 20) 21 "#f5f5f5" "Bold" 380 30
    Draw-Text $g $card[2] ($x + 74) ($y + 54) 15 "#bdbdbd" "Regular" 380 24
    Draw-Text $g $card[3] ($x + 74) ($y + 78) 14 "#8f8f8f" "Regular" 380 22
    $y += 126
  }
  Save-Canvas $c
}

function Screenshot-03($lang) {
  $key = if ($lang -like "zh*") { "zh" } else { "en" }
  $script:T = $Translations[$key]
  $zh = ($key -eq "zh")
  $c = New-Canvas (Join-Path (Join-Path $shotsRoot $lang) "03-search-organize.png")
  $g = $c.Graphics
  if ($zh) {
    Draw-Text $g "搜索、标签、文件夹，一起整理" 72 70 42 "#111111" "Bold" 760 56
    Draw-Text $g "多方式检索，一下就找到" 76 128 28 "#444444" "Regular" 760 42
    Draw-Text $g "通过关键词、标签、文件夹或全文内容快速定位。" 76 182 19 "#666666" "Regular" 780 30
  } else {
    Draw-Text $g "Search, tags, and folders" 72 70 42 "#111111" "Bold" 760 56
    Draw-Text $g "Find any prompt in seconds" 76 128 28 "#444444" "Regular" 760 42
    Draw-Text $g "Search by keyword, tag, folder, or full text." 76 182 19 "#666666" "Regular" 780 30
  }
  Draw-Popup $g 70 216 $false
  $x = 610
  Fill-RoundRect $g (New-Brush "#ffffff") $x 218 560 118 16
  Draw-RoundRect $g (New-Pen "#dedede" 1) $x 218 560 118 16
  Draw-Icon $g "search" ($x + 34) 254 28 "#111111"
  if ($zh) {
    Draw-Text $g "folder:营销  tag:SEO  title:标题" ($x + 84) 254 24 "#111111" "Bold" 440 38
  } else {
    Draw-Text $g "folder:marketing  tag:SEO" ($x + 84) 254 24 "#111111" "Bold" 440 38
  }
  $features = if ($zh) {
    @(
      @("文件夹分组", "分组视图", "工作流、项目、客户资料分开放置。", "列表和按文件夹分组两种显示模式。", "folder"),
      @("标签检索", "快速定位", "用标签标记主题和场景，点一下就筛选。", "标签管理器支持搜索、重命名、删除。", "tag"),
      @("置顶高频", "高频优先", "常用提示词永远排在最前面。", "复制或插入后自动排到顶部。", "pin")
    )
  } else {
    @(
      @("Folder groups", "Grouped view", "Separate workflows, projects, and clients.", "Switch between list and grouped display.", "folder"),
      @("Tag search", "Fast filtering", "Mark topics and use cases with tags.", "Rename, search, and delete in tag manager.", "tag"),
      @("Pinned prompts", "Frequent first", "Daily prompts always stay on top.", "Used prompts automatically move up.", "pin")
    )
  }
  $fy = 382
  foreach ($f in $features) {
    Fill-RoundRect $g (New-Brush "#ffffff") $x $fy 560 104 16
    Draw-RoundRect $g (New-Pen "#dedede" 1) $x $fy 560 104 16
    Draw-Icon $g $f[4] ($x + 28) ($fy + 32) 30 "#111111"
    Draw-Text $g $f[0] ($x + 82) ($fy + 16) 22 "#111111" "Bold" 200 30
    Draw-Text $g $f[1] ($x + 288) ($fy + 18) 18 "#555555" "Regular" 230 28
    Draw-Text $g $f[2] ($x + 82) ($fy + 50) 16 "#666666" "Regular" 440 24
    Draw-Text $g $f[3] ($x + 82) ($fy + 74) 14 "#777777" "Regular" 450 22
    $fy += 126
  }
  Save-Canvas $c
}

function Screenshot-04($lang) {
  $key = if ($lang -like "zh*") { "zh" } else { "en" }
  $script:T = $Translations[$key]
  $zh = ($key -eq "zh")
  $c = New-Canvas (Join-Path (Join-Path $shotsRoot $lang) "04-copy-insert-autosend.png")
  $g = $c.Graphics
  if ($zh) {
    Draw-Text $g "复制、插入，还能自动发送" 72 62 42 "#111111" "Bold" 700 56
    Draw-Text $g "从保存到发送，一步到位" 76 116 28 "#444444" "Regular" 700 42
    Draw-Text $g "点击复制，或插入网页输入框；在 ChatGPT 上可自动点击发送。" 76 162 20 "#666666" "Regular" 700 30
    Draw-Text $g "默认关闭，可在设置中开启。" 76 190 17 "#777777" "Regular" 700 28
  } else {
    Draw-Text $g "Copy, insert, and auto-send" 72 62 42 "#111111" "Bold" 700 56
    Draw-Text $g "From saved prompt to sent message" 76 116 28 "#444444" "Regular" 700 42
    Draw-Text $g "Click to copy, insert into the input, or auto-click Send on ChatGPT." 76 162 20 "#666666" "Regular" 740 30
    Draw-Text $g "Off by default - enable it in settings." 76 190 17 "#777777" "Regular" 700 28
  }
  Draw-BrowserMock $g 60 216 660 500 $false
  Fill-RoundRect $g (New-Brush "#ffffff") 110 318 560 92 16
  Draw-RoundRect $g (New-Pen "#dedede" 1) 110 318 560 92 16
  if ($zh) {
    Draw-Text $g "请根据这个产品截图生成标题和描述" 140 334 22 "#111111" "Regular" 480 34
    Draw-Text $g "已从 PromptVault 一键插入，可直接发送" 140 366 18 "#666666" "Regular" 480 28
    Draw-Text $g "插入到 ChatGPT 后自动点击发送（默认关闭，设置中可开启）" 110 446 15 "#666666" "Regular" 560 24
  } else {
    Draw-Text $g "Write a title and description from this photo" 140 334 22 "#111111" "Regular" 480 34
    Draw-Text $g "Inserted from PromptVault in one click" 140 366 18 "#666666" "Regular" 480 28
    Draw-Text $g "On ChatGPT the send button is clicked for you - opt-in." 110 446 15 "#666666" "Regular" 560 24
  }
  # action chips: copy / insert into the page / auto-send
  Fill-RoundRect $g (New-Brush "#ffffff") 110 505 160 56 12
  Draw-RoundRect $g (New-Pen "#dedede" 1) 110 505 160 56 12
  Draw-Icon $g "copy" 134 521 24 "#111111"
  if ($zh) { Draw-Text $g "复制" 168 519 20 "#111111" "Bold" 90 30 } else { Draw-Text $g "Copy" 168 519 20 "#111111" "Bold" 90 30 }
  Fill-RoundRect $g (New-Brush "#ffffff") 286 505 160 56 12
  Draw-RoundRect $g (New-Pen "#dedede" 1) 286 505 160 56 12
  Draw-Icon $g "insert" 310 521 24 "#111111"
  if ($zh) { Draw-Text $g "插入" 344 519 20 "#111111" "Bold" 90 30 } else { Draw-Text $g "Insert" 344 519 20 "#111111" "Bold" 90 30 }
  Fill-RoundRect $g (New-Brush "#111111") 462 505 180 56 12
  Draw-Icon $g "send" 486 521 24 "#ffffff"
  if ($zh) { Draw-Text $g "发送" 520 519 20 "#ffffff" "Bold" 110 30 } else { Draw-Text $g "Send" 520 519 20 "#ffffff" "Bold" 110 30 }
  # the extension popup you copy/insert from
  Draw-Popup $g 760 100 $false
  Save-Canvas $c
}

function Screenshot-05($lang) {
  $key = if ($lang -like "zh*") { "zh" } else { "en" }
  $script:T = $Translations[$key]
  $zh = ($key -eq "zh")
  $c = New-Canvas (Join-Path (Join-Path $shotsRoot $lang) "05-privacy-backup.png")
  $g = $c.Graphics
  if ($zh) {
    Draw-Text $g "本地保存，导入导出更安心" 72 62 42 "#111111" "Bold" 760 56
    Draw-Text $g "4 种格式备份，随时迁移" 76 116 28 "#444444" "Regular" 760 42
    Draw-Text $g "提示词默认保存在浏览器本地，不上传任何服务器，无需注册账号。" 76 162 20 "#666666" "Regular" 800 30
    Draw-Text $g "支持 JSON / Markdown / CSV / TXT 导出，JSON 导入。" 76 190 17 "#777777" "Regular" 800 28
  } else {
    Draw-Text $g "Local-first, with easy backup" 72 62 42 "#111111" "Bold" 760 56
    Draw-Text $g "Back up and move your library anytime" 76 116 28 "#444444" "Regular" 760 42
    Draw-Text $g "Prompts stay in your browser by default - no servers, no account." 76 162 20 "#666666" "Regular" 800 30
    Draw-Text $g "Export as JSON / Markdown / CSV / TXT, import from JSON." 76 190 17 "#777777" "Regular" 800 28
  }
  Draw-Popup $g 76 224 $false
  $x = 620
  $cards = if ($zh) {
    @(
      @("本地存储", "默认开启", "提示词内容只保存在 Chrome 本地存储中。", "不收集、不上传，也没有账号体系。"),
      @("多格式导入导出", "4 种格式", "导出 JSON / Markdown / CSV / TXT，导入 JSON。", "随时备份、迁移你的提示词库。"),
      @("回收站", "可还原", "删除的提示词先进入回收站，随时还原。", "默认关闭，可在设置中开启。")
    )
  } else {
    @(
      @("Local storage", "Default", "Prompt content lives in Chrome's local storage.", "Nothing collected, nothing uploaded."),
      @("Import/Export", "4 formats", "Export JSON / Markdown / CSV / TXT, import JSON.", "Back up or move your library anytime."),
      @("Trash", "Restorable", "Deleted prompts go to the trash first.", "Restore anytime; off by default.")
    )
  }
  $y = 226
  foreach ($card in $cards) {
    Fill-RoundRect $g (New-Brush "#ffffff") $x $y 560 124 18
    Draw-RoundRect $g (New-Pen "#dedede" 1) $x $y 560 124 18
    Draw-Text $g $card[0] ($x + 36) ($y + 18) 26 "#111111" "Bold" 210 34
    Draw-Text $g $card[1] ($x + 266) ($y + 22) 20 "#555555" "Regular" 240 30
    Draw-Text $g $card[2] ($x + 36) ($y + 60) 17 "#666666" "Regular" 480 26
    Draw-Text $g $card[3] ($x + 36) ($y + 88) 15 "#777777" "Regular" 490 24
    $y += 150
  }
  Save-Canvas $c
}

# ---------------------------------------------------------------- run

Screenshot-01 "zh-CN"; Screenshot-02 "zh-CN"; Screenshot-03 "zh-CN"; Screenshot-04 "zh-CN"; Screenshot-05 "zh-CN"
Screenshot-01 "en";    Screenshot-02 "en";    Screenshot-03 "en";    Screenshot-04 "en";    Screenshot-05 "en"

Write-Host "Generated screenshots in $shotsRoot (zh-CN + en)"
