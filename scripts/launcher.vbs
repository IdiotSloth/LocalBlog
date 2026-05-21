Set WshShell = CreateObject("WScript.Shell")
Set fso = CreateObject("Scripting.FileSystemObject")
dir = fso.GetParentFolderName(WScript.ScriptFullName)
exePath = dir & "\Idiot.exe"
' If VBS is in resources/ subdir (NSIS install), try one level up
If Not fso.FileExists(exePath) Then
  exePath = fso.GetParentFolderName(dir) & "\Idiot.exe"
End If
' Clear the env var so Electron doesn't run in Node.js mode
WshShell.Environment("Process")("ELECTRON_RUN_AS_NODE") = ""
WshShell.Run """" & exePath & """" , 1, False
