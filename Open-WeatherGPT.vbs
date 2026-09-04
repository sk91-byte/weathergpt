Option Explicit

Dim shell, fso, project, backendCommand, frontendCommand
Set shell = CreateObject("WScript.Shell")
Set fso = CreateObject("Scripting.FileSystemObject")
project = fso.GetParentFolderName(WScript.ScriptFullName)

backendCommand = "powershell.exe -NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -Command " & _
  Chr(34) & "Set-Location -LiteralPath '" & project & "'; & '" & project & "\venv\Scripts\python.exe' -m uvicorn backend.main:app --reload" & Chr(34)
shell.Run backendCommand, 0, False

frontendCommand = "powershell.exe -NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -Command " & _
  Chr(34) & "Set-Location -LiteralPath '" & project & "\mobile'; & 'C:\src\flutter\bin\flutter.bat' run -d chrome --web-port 5000" & Chr(34)
shell.Run frontendCommand, 0, False

WScript.Sleep 8000
shell.Run "http://localhost:5000", 1, False
