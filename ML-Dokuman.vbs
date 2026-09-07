' ML (Makine Kod Yönetimi) — tarayıcıda aç
Option Explicit

Dim shell, fso, rootDir, indexHtml

Set shell = CreateObject("WScript.Shell")
Set fso = CreateObject("Scripting.FileSystemObject")

rootDir = fso.GetParentFolderName(WScript.ScriptFullName)
indexHtml = fso.BuildPath(rootDir, "ML\index.html")

If Not fso.FileExists(indexHtml) Then
  MsgBox "ML uygulaması bulunamadı:" & vbCrLf & indexHtml, vbCritical, "ML Doküman"
  WScript.Quit 1
End If

shell.Run """" & indexHtml & """", 1, False
