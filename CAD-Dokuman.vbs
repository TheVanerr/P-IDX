' CAD — P&ID otomatik çizim (tarayıcıda aç)
Option Explicit

Dim shell, fso, rootDir, indexHtml

Set shell = CreateObject("WScript.Shell")
Set fso = CreateObject("Scripting.FileSystemObject")

rootDir = fso.GetParentFolderName(WScript.ScriptFullName)
indexHtml = fso.BuildPath(rootDir, "CAD\index.html")

If Not fso.FileExists(indexHtml) Then
  MsgBox "CAD uygulaması bulunamadı:" & vbCrLf & indexHtml, vbCritical, "CAD"
  WScript.Quit 1
End If

shell.Run """" & indexHtml & """", 1, False
