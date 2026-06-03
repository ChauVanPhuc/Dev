#!/bin/bash

# Tu dong chuyen vao thu muc chua script
cd "$(dirname "$0")"

# Mau sac chuan Git Bash (Anh 2) - Khong in dam
GB_GREEN='\033[0;32m'
GB_MAGENTA='\033[0;35m'
GB_YELLOW='\033[0;33m'
GB_WHITE='\033[0;37m'
GB_CYAN='\033[0;36m'
NC='\033[0m'

clear
echo -e "${GB_GREEN}Administrator@ERP_G7 ${GB_MAGENTA}MINGW64 ${GB_YELLOW}$(pwd)${NC}"
echo -e "${GB_CYAN}======================================================${NC}"
echo -e "${GB_YELLOW}         ERP G7 - SMART PUBLISH SELECTOR${NC}"
echo -e "${GB_CYAN}======================================================${NC}"
echo -e "  ${GB_WHITE}1.${NC} ${GB_GREEN}LOCAL UPDATE${NC}  (Build Web & Restart Backend - Test tai may)"
echo -e "  ${GB_WHITE}2.${NC} ${GB_MAGENTA}FULL PUBLISH${NC}  (Bump Version + APK + Push GitHub + Restart)"
echo -e "${GB_CYAN}------------------------------------------------------${NC}"
echo -ne "${GB_WHITE}Chon che do (1 hoac 2): ${NC}"
read CHOICE

# Lay version hien tai
CURRENT_VER=$(grep '"version":' Mobile/package.json | sed 's/.*"version": "\(.*\)".*/\1/')

if [ "$CHOICE" == "1" ]; then
    # --- CHE DO 1: LOCAL UPDATE ---
    echo ""
    echo -e "${GB_CYAN}>>> DANG CHAY CHE DO CAP NHAT TAI MAY (LOCAL ONLY)${NC}"
    echo -e "${GB_WHITE}[1/2] Cleaning and Building Web assets...${NC}"
    rm -rf Mobile/dist FrontEnd/dist
    (cd Mobile && npm run build) && (cd FrontEnd && npm run build)

    echo ""
    echo -e "${GB_WHITE}[2/2] Restarting Backend services...${NC}"
    taskkill //F //FI "WINDOWTITLE eq Backend*" //T > /dev/null 2>&1
    sleep 2
    cd BackEnd
    start "ERP G7 PRODUCTION SERVER" cmd //k "cd /d %~dp0 && call start_server.bat"

    echo ""
    echo -e "${GB_GREEN}======================================================${NC}"
    echo -e "${GB_GREEN} SUCCESS: Build hoan tat! Backend da khoi dong lai.${NC}"
    echo -e "${GB_YELLOW} Hay kiem tra giao diện tai local hoac server hien tai.${NC}"
    echo -e "${GB_GREEN}======================================================${NC}"

elif [ "$CHOICE" == "2" ]; then
    # --- CHE DO 2: FULL PUBLISH ---
    echo ""
    echo -e "${GB_MAGENTA}>>> DANG CHAY CHE DO PHAT HANH DAY DU (CLOUD + APK)${NC}"
    echo -e "${GB_GREEN}[*] Current Status: v${CURRENT_VER}${NC}"

    # [FIX] Thiet lap GRADLE_USER_HOME va quet tim duong dan IntelliJ JBR de tranh loi ky tu tieng Viet hoac thieu Java
    export GRADLE_USER_HOME="M:\.gradle"
    export ANDROID_HOME="P:\Android\Sdk"
    export ANDROID_SDK_ROOT="P:\Android\Sdk"
    JB_PATH=$(ls -d "/c/Program Files/JetBrains"/IntelliJ* 2>/dev/null | head -n 1)
    if [ ! -z "$JB_PATH" ] && [ -d "$JB_PATH/jbr" ]; then
        WIN_JBR=$(echo "$JB_PATH/jbr" | sed 's/^\/\([a-zA-Z]\)\//\1:\\/' | sed 's/\//\\/g')
        export JAVA_HOME="$WIN_JBR"
        export PATH="$JB_PATH/jbr/bin:$PATH"
        echo -e "${GB_GREEN}[*] Tu dong phat hien va thiet lap JAVA_HOME: ${JAVA_HOME}${NC}"
        echo -e "${GB_GREEN}[*] Tu dong thiet lap GRADLE_USER_HOME: ${GRADLE_USER_HOME}${NC}"
    fi
    
    # Dinh nghia duong dan APK ngay tu dau
    APK_SOURCE="Mobile/android/app/build/outputs/apk/debug/app-debug.apk"
    echo ""
    echo -ne "${GB_WHITE}Enter New Version: ${NC}"
    read V_NUM
    echo -ne "${GB_WHITE}Release Notes:     ${NC}"
    read V_NOTE
    
    # [FIX] Sanitize input: Xoa ky tu ANSI escape va control characters tu Git Bash
    V_NUM=$(echo "$V_NUM" | sed 's/\x1b\[[0-9;]*[a-zA-Z]//g' | sed 's/\x1b\[//g' | sed 's/[[:cntrl:]]//g' | tr -d '[:space:]')
    V_NOTE=$(echo "$V_NOTE" | sed 's/\x1b\[[0-9;]*[a-zA-Z]//g' | sed 's/\x1b\[//g' | sed 's/[[:cntrl:]]//g')
    [ -z "$V_NOTE" ] && V_NOTE="Ban cap nhat $V_NUM"

    echo ""
    echo -e "${GB_CYAN}[1/5] Updating version code...${NC}"
    python scripts/bump_version.py "$V_NUM" "$V_NOTE"

    echo ""
    echo -e "${GB_CYAN}[2/5] Cleaning and Building Web assets...${NC}"
    rm -rf Mobile/dist FrontEnd/dist
    (cd Mobile && npm run build && npx cap sync android) && (cd FrontEnd && npm run build)

    echo ""
    echo -e "${GB_CYAN}[3/5] Building Android APK (Gradle)...${NC}"
    # Xoa o dia Z neu dang ton tai
    cmd //c "subst Z: /D" > /dev/null 2>&1
    # Tao o dia Z tro den thu muc hien tai (.)
    cmd //c "subst Z: %CD%"
    
    # Chay build tren o Z (khong co dau tieng Viet)
    echo -e "${GB_WHITE}Starting CLEAN and BUILD (assembleDebug) on virtual drive Z:...${NC}"
    # [FIX] Dong toan bo tien trinh java dang khoa file truoc khi build
    cmd //c "taskkill /F /IM java.exe 2>nul"
    # [FIX] Thiet lap truc tiep bien moi truong Windows de tranh loi dich Unix path cua Git Bash
    cmd //c "set GRADLE_USER_HOME=M:\.gradle&& set JAVA_HOME=M:\.jdk&& set PATH=M:\.jdk\bin;%PATH%&& set ANDROID_HOME=P:\Android\Sdk&& set ANDROID_SDK_ROOT=P:\Android\Sdk&& Z: && cd Mobile/android && gradlew.bat clean assembleDebug"
    
    # Kiem tra neu build loi
    if [ ! -f "$APK_SOURCE" ]; then
        echo ""
        echo -e "${GB_RED}ERROR: Build APK that bai (Khong tim thay file).${NC}"
        echo -e "${GB_YELLOW}Vui long kiem tra log Gradle phia tren.${NC}"
        cmd //c "subst Z: /D"
        read -p "Nhan Enter de thoat..."
        exit 1
    fi
    
    # Xoa o dia Z sau khi xong
    cmd //c "subst Z: /D"

    echo ""
    echo -e "${GB_CYAN}[4/5] Syncing with GitHub Cloud...${NC}"
    git add .
    git commit -m "Publish v${V_NUM}: ${V_NOTE}"
    git push origin dev

    echo ""
    echo -e "${GB_CYAN}[5/5] Moving APK & Restarting Backend...${NC}"
    
    if [ -f "$APK_SOURCE" ]; then
        echo -e "${GB_GREEN}>>> Thanh cong! Dang copy file APK moi...${NC}"
        # [FIX] Tao thu muc static/apps neu chua co
        mkdir -p BackEnd/static/apps
        # Copy vao thu muc static moi cua Backend
        cp "$APK_SOURCE" "BackEnd/static/apps/SmartFlow_v${V_NUM}.apk"
        cp "$APK_SOURCE" "BackEnd/static/apps/SmartFlow_Latest.apk"
    else
        echo -e "${GB_RED}!!! LOI: Khong tim thay file APK sau khi build. Co the Gradle bi loi.${NC}"
        echo -e "${GB_YELLOW}Hay kiem tra thong bao loi cua Gradle o phia tren.${NC}"
        read -p "Nhan Enter de tiep tuc cac buoc khac..."
    fi

    taskkill //F //FI "WINDOWTITLE eq Backend*" //T > /dev/null 2>&1
    sleep 2
    cd BackEnd
    start "ERP G7 PRODUCTION SERVER" cmd //k "cd /d %~dp0 && call start_server.bat"

    echo ""
    echo -e "${GB_GREEN}======================================================${NC}"
    echo -e "${GB_GREEN} SUCCESS: Version ${V_NUM} is now LIVE globally!${NC}"
    echo -e "${GB_GREEN}======================================================${NC}"
else
    echo -e "${GB_YELLOW}Lua chon khong hop le. Thoat.${NC}"
fi

echo ""
read -p "Press Enter to close..."
