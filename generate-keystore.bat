@echo off

REM Criar diretório android/app se não existir
if not exist "android\app" mkdir "android\app"

REM Gerar keystore
keytool -genkey -v ^
  -keystore android\app\keystore.jks ^
  -alias iptvzeus ^
  -keyalg RSA ^
  -keysize 2048 ^
  -validity 10000 ^
  -storepass iptvzeus123 ^
  -keypass iptvzeus123 ^
  -dname "CN=IPTV Zeus, OU=Development, O=IPTV Zeus, L=Unknown, S=Unknown, C=BR"

echo Keystore gerada com sucesso!
pause 