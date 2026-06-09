; Shifa Suite — Custom NSIS installer script
; Extends the default electron-builder NSIS installer

!macro customHeader
  ; Add a "Clinic Management Software" description under the product name
  !define MUI_WELCOMEPAGE_TEXT "Shifa Suite is a complete offline clinic management system for Pakistani clinics. It works without internet and keeps all patient data stored securely on your computer.$\r$\n$\r$\nClick Next to continue."
!macroend

!macro customInstall
  ; Write registry entry for "Programs and Features" description
  WriteRegStr HKCU "Software\ShifaSuite" "InstallDate" "$INSTDIR"
  WriteRegStr HKCU "Software\ShifaSuite" "Version" "${VERSION}"
!macroend

!macro customUnInstall
  ; Clean up registry keys on uninstall
  DeleteRegKey HKCU "Software\ShifaSuite"
!macroend
