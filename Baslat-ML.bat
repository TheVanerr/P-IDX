@echo off
setlocal
cd /d "%~dp0codes"
call npm.cmd start ml
exit /b %ERRORLEVEL%
