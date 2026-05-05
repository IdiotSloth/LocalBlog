$ws = New-Object -ComObject WScript.Shell
$sc = $ws.CreateShortcut("$env:APPDATA\Microsoft\Windows\Start Menu\Programs\Idiot.lnk")
$sc.TargetPath = "E:\5-work\web\scripts\launcher.bat"
$sc.WorkingDirectory = "E:\5-work\web\release\Idiot-win32-x64"
$sc.Description = "Idiot - Local Blog KB"
$sc.Save()
Write-Host "Start Menu shortcut created: Idiot.lnk"
