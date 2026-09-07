' P&ID Doküman — kök başlatıcı (P&ID alt klasörüne yönlendirir)
Option Explicit

Dim shell, fso, rootDir, launcher

Set shell = CreateObject("WScript.Shell")
Set fso = CreateObject("Scripting.FileSystemObject")

rootDir = fso.GetParentFolderName(WScript.ScriptFullName)
launcher = fso.BuildPath(rootDir, "P&ID\P-ID-Dokuman.vbs")

If Not fso.FileExists(launcher) Then
  MsgBox "P&ID başlatıcı bulunamadı:" & vbCrLf & launcher, vbCritical, "P&ID Doküman"
  WScript.Quit 1
End If

shell.Run """" & launcher & """", 1, False
