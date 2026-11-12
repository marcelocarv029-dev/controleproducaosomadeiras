@echo off
title CONTROLE DE PRODUCAO - SOMADEIRAS
where node >nul 2>&1
if %errorlevel%==0 (
  node server.mjs
) else (
  agy-node.cmd server.mjs
)
pause
