#!/bin/bash

# Criar diretório android/app se não existir
mkdir -p android/app

# Gerar keystore
keytool -genkey -v \
  -keystore android/app/keystore.jks \
  -alias iptvzeus \
  -keyalg RSA \
  -keysize 2048 \
  -validity 10000 \
  -storepass iptvzeus123 \
  -keypass iptvzeus123 \
  -dname "CN=IPTV Zeus, OU=Development, O=IPTV Zeus, L=Unknown, S=Unknown, C=BR" 