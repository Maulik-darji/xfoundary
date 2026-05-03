Add-Type -AssemblyName System.Drawing

function Create-Image {
    param(
        [int]$width,
        [int]$height,
        [string]$text,
        [int]$fontSize,
        [string]$outputPath
    )
    $bmp = New-Object System.Drawing.Bitmap $width, $height
    $graphics = [System.Drawing.Graphics]::FromImage($bmp)
    $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
    
    $colorTranslator = [System.Drawing.ColorTranslator]
    $bgColor = $colorTranslator::FromHtml("#6300dd")
    $graphics.Clear($bgColor)
    
    $font = New-Object System.Drawing.Font("Arial", $fontSize, [System.Drawing.FontStyle]::Bold)
    $brush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::White)
    
    $stringFormat = New-Object System.Drawing.StringFormat
    $stringFormat.Alignment = [System.Drawing.StringAlignment]::Center
    $stringFormat.LineAlignment = [System.Drawing.StringAlignment]::Center
    
    $rect = New-Object System.Drawing.RectangleF(0, 0, $width, $height)
    $graphics.DrawString($text, $font, $brush, $rect, $stringFormat)
    
    $bmp.Save($outputPath, [System.Drawing.Imaging.ImageFormat]::Png)
    
    $bmp.Dispose()
    $graphics.Dispose()
}

Create-Image -width 1200 -height 630 -text "XF" -fontSize 250 -outputPath "d:\FREELANCE TASKS\XFOUNDARY\public\og-image.png"
Create-Image -width 512 -height 512 -text "XF" -fontSize 200 -outputPath "d:\FREELANCE TASKS\XFOUNDARY\public\logo512.png"
Create-Image -width 192 -height 192 -text "XF" -fontSize 75 -outputPath "d:\FREELANCE TASKS\XFOUNDARY\public\logo192.png"
