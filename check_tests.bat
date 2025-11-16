@echo off
cd /d "c:\Users\juamb\Desktop\Front\desarrollo_aplicaciones_front"
npm run test:ci > test_results.txt 2>&1
type test_results.txt
