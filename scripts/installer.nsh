; Custom NSIS script — creates Start Menu/Desktop shortcuts directly to Idiot.exe
; No wscript.exe/VBS wrapper needed on normal machines (ELECTRON_RUN_AS_NODE is dev-only).
; Runtime shortcut creation in main/index.ts guarded by !app.isPackaged to avoid conflicts.

!macro customInstall
  CreateShortCut "$DESKTOP\Idiot.lnk" "$INSTDIR\Idiot.exe"
  CreateShortCut "$SMPROGRAMS\Idiot.lnk" "$INSTDIR\Idiot.exe"
!macroend

!macro customUnInstall
  Delete "$DESKTOP\Idiot.lnk"
  Delete "$SMPROGRAMS\Idiot.lnk"
!macroend
