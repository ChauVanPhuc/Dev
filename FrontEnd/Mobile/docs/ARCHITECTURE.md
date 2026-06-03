# 📱 Mobile Architecture - SmartFlow v2

Tài liệu này mô tả kiến trúc Mobile App của SmartFlow v2, bao gồm Capacitor configuration, native plugins, mobile-specific features, và build process.

---

## 📋 Mục lục (Table of Contents)

1. [Tổng quan](#-tổng-quánverview)
2. [Technology Stack](#-technology-stack)
3. [Capacitor Configuration](#-capacitor-configuration)
4. [Native Plugins](#-native-plugins)
5. [Mobile-Specific Features](#-mobile-specific-features)
6. [Performance Optimization](#-performance-optimization)
7. [Build Process](#-build-process)
8. [Testing](#-testing)

---

## 🎯 Tổng quan (Overview)

### Mobile App Purpose

SmartFlow Mobile App được thiết kế cho công nhân tại xưởng sản xuất với các tính năng:

- Theo dõi kế hoạch sản xuất
- Tạo và quét phiếu giao
- Kiểm tra chất lượng (QC)
- Nhận thông báo thời gian thực
- Quét mã QR

### Platform Support

| Platform | Status | Notes |
|----------|--------|-------|
| **Android** | ✅ Supported | Android 7.0+ (API 24+) |
| **iOS** | ✅ Supported | iOS 12.0+ |
| **Web** | ✅ Supported | Progressive Web App (PWA) |

---

## 🛠️ Technology Stack

### Core Technologies

| Technology | Version | Purpose |
|------------|---------|---------|
| **React** | 18+ | UI Framework |
| **Vite** | 5+ | Build Tool |
| **Capacitor** | 6+ | Native Bridge |
| **React Router** | 6+ | Routing |
| **Zustand** | 4+ | State Management |
| **Axios** | 1.6+ | HTTP Client |

### Native Plugins

| Plugin | Purpose | Platform |
|--------|---------|----------|
| `@capacitor/camera` | Camera access | Android, iOS |
| `@capacitor/qr-scanner` | QR code scanning | Android, iOS |
| `@capacitor/local-notifications` | Local notifications | Android, iOS |
| `@capacitor/network` | Network status | Android, iOS |
| `@capacitor/app` | App lifecycle | Android, iOS |
| `@capacitor/clipboard` | Clipboard access | Android, iOS |

---

## ⚙️ Capacitor Configuration

### 1. capacitor.config.json

**Location:** `Mobile/capacitor.config.json`

```json
{
  "appId": "com.smartflow.app",
  "appName": "SmartFlow",
  "webDir": "dist",
  "server": {
    "androidScheme": "https"
  },
  "plugins": {
    "Camera": {
      "permissions": ["camera", "photos"]
    },
    "LocalNotifications": {
      "smallIcon": "ic_stat_icon_config_sample",
      "iconColor": "#488AFF",
      "sound": "beep.wav"
    },
    "QRScanner": {
      "showDefaultCamera": true,
      "scanOrientation": "portrait"
    }
  },
  "android": {
    "buildOptions": {
      "keystorePath": "path/to/keystore.jks",
      "keystoreAlias": "smartflow"
    }
  },
  "ios": {
    "scheme": "smartflow"
  }
}
```

### 2. Initialization

```bash
# Initialize Capacitor
npx cap init SmartFlow com.smartflow.app

# Add platforms
npx cap add android
npx cap add ios

# Sync files
npx cap sync
```

### 3. File Structure

```
Mobile/
├── capacitor.config.json
├── android/                      # Native Android project
│   ├── app/
│   │   ├── src/main/
│   │   │   ├── AndroidManifest.xml
│   │   │   ├── java/
│   │   │   └── res/
│   │   └── build.gradle
│   └── build.gradle
├── ios/                          # Native iOS project
│   ├── App/
│   │   ├── App/
│   │   │   ├── AppDelegate.swift
│   │   │   └── Info.plist
│   │   └── Assets.xcassets
│   └── Podfile
└── dist/                         # Build output
```

---

## 🔌 Native Plugins

### 1. Camera Plugin

**Installation:**
```bash
npm install @capacitor/camera
npx cap sync
```

**Usage:**
```javascript
import { Camera, CameraResultType } from '@capacitor/camera';

const takePicture = async () => {
  try {
    const image = await Camera.getPhoto({
      quality: 90,
      allowEditing: false,
      resultType: CameraResultType.Uri
    });
    
    return image.webPath;
  } catch (error) {
    console.error('Camera error:', error);
    throw error;
  }
};

// In component
const handleTakePhoto = async () => {
  const photoPath = await takePicture();
  setPhotos([...photos, photoPath]);
};
```

**Permissions (Android):**
```xml
<!-- android/app/src/main/AndroidManifest.xml -->
<uses-permission android:name="android.permission.CAMERA" />
<uses-feature android:name="android.hardware.camera" />
```

**Permissions (iOS):**
```xml
<!-- ios/App/App/Info.plist -->
<key>NSCameraUsageDescription</key>
<string>Camera is needed to take photos for delivery evidence</string>
<key>NSPhotoLibraryUsageDescription</key>
<string>Photo library is needed to select images</string>
```

### 2. QR Scanner Plugin

**Installation:**
```bash
npm install @capacitor/qr-scanner
npx cap sync
```

**Usage:**
```javascript
import { QRScanner } from '@capacitor/qr-scanner';

const scanQRCode = async () => {
  try {
    const result = await QRScanner.scan();
    return result.content;
  } catch (error) {
    console.error('QR scan error:', error);
    throw error;
  }
};

// In component
const handleScanQR = async () => {
  const qrContent = await scanQRCode();
  // Process QR code
  navigate(`/delivery/${qrContent}`);
};
```

**Permissions (Android):**
```xml
<uses-permission android:name="android.permission.CAMERA" />
```

**Permissions (iOS):**
```xml
<key>NSCameraUsageDescription</key>
<string>Camera is needed to scan QR codes</string>
```

### 3. Local Notifications Plugin

**Installation:**
```bash
npm install @capacitor/local-notifications
npx cap sync
```

**Usage:**
```javascript
import { LocalNotifications } from '@capacitor/local-notifications';

const scheduleNotification = async (title, body) => {
  await LocalNotifications.schedule({
    notifications: [
      {
        title,
        body,
        id: new Date().getTime(),
        schedule: { at: new Date() },
        sound: 'beep.wav',
        smallIcon: 'ic_stat_icon_config_sample',
        attachments: null
      }
    ]
  });
};

const requestPermission = async () => {
  const result = await LocalNotifications.requestPermissions();
  return result.display === 'granted';
};
```

### 4. Network Plugin

**Installation:**
```bash
npm install @capacitor/network
npx cap sync
```

**Usage:**
```javascript
import { Network } from '@capacitor/network';

const checkNetworkStatus = async () => {
  const status = await Network.getStatus();
  return status.connected;
};

// Listen to network changes
Network.addListener('networkStatusChange', (status) => {
  if (!status.connected) {
    alert('Mất kết nối mạng!');
  }
});
```

### 5. App Plugin

**Installation:**
```bash
npm install @capacitor/app
npx cap sync
```

**Usage:**
```javascript
import { App } from '@capacitor/app';

// Handle app state changes
App.addListener('appStateChange', ({ isActive }) => {
  if (isActive) {
    // App came to foreground
    refreshData();
  } else {
    // App went to background
    saveData();
  }
});

// Handle URL open
App.addListener('appUrlOpen', (data) => {
  // Handle deep link
  handleDeepLink(data.url);
});
```

---

## 📱 Mobile-Specific Features

### 1. Touch-Optimized UI

**Large Touch Targets:**
```css
/* Minimum touch target: 44x44px */
.button {
  min-height: 44px;
  min-width: 44px;
  padding: 12px 24px;
}

.input {
  min-height: 44px;
  padding: 12px;
}
```

**Swipe Gestures:**
```javascript
import { useSwipeable } from 'react-swipeable';

const handlers = useSwipeable({
  onSwipedLeft: () => navigate('/next'),
  onSwipedRight: () => navigate('/prev'),
  preventDefaultTouchmoveEvent: true,
  trackMouse: true
});

<div {...handlers}>
  {/* Content */}
</div>
```

### 2. Offline Support

**Service Worker:**
```javascript
// public/sw.js
const CACHE_NAME = 'smartflow-v1';
const urlsToCache = [
  '/',
  '/offline.html',
  '/manifest.json'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(urlsToCache))
  );
});

self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request)
      .then((response) => response || fetch(event.request))
  );
});
```

**Offline Detection:**
```javascript
const useOfflineDetection = () => {
  const [isOffline, setIsOffline] = useState(false);

  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return isOffline;
};
```

### 3. Deep Linking

**Android Manifest:**
```xml
<intent-filter>
  <action android:name="android.intent.action.VIEW" />
  <category android:name="android.intent.category.DEFAULT" />
  <category android:name="android.intent.category.BROWSABLE" />
  <data android:scheme="smartflow" android:host="delivery" />
</intent-filter>
```

**iOS Info.plist:**
```xml
<key>CFBundleURLTypes</key>
<array>
  <dict>
    <key>CFBundleURLSchemes</key>
    <array>
      <string>smartflow</string>
    </array>
  </dict>
</array>
```

**Handle Deep Link:**
```javascript
App.addListener('appUrlOpen', (data) => {
  const url = new URL(data.url);
  
  if (url.hostname === 'delivery') {
    const deliveryId = url.searchParams.get('id');
    navigate(`/delivery/${deliveryId}`);
  }
});
```

### 4. Push Notifications (FCM)

**Setup:**
```bash
npm install @capacitor/push-notifications
npx cap sync
```

**Usage:**
```javascript
import { PushNotifications } from '@capacitor/push-notifications';

const registerPushNotifications = async () => {
  const result = await PushNotifications.register();
  
  PushNotifications.addListener('registration', (token) => {
    // Send token to backend
    api.post('/accounts/fcm-token', { fcm_token: token.value });
  });
  
  PushNotifications.addListener('pushNotificationReceived', (notification) => {
    // Handle received notification
    showNotification(notification);
  });
};
```

---

## ⚡ Performance Optimization

### 1. Code Splitting

```javascript
// Lazy load screens
const PlanTrackingView = lazy(() => import('./Plan/Views/PlanTrackingView'));
const DeliveryCreateView = lazy(() => import('./Delivery/Views/DeliveryCreateView'));

// Use Suspense
<Suspense fallback={<LoadingScreen />}>
  <Routes>
    <Route path="/plan-tracking" element={<PlanTrackingView />} />
    <Route path="/delivery-create" element={<DeliveryCreateView />} />
  </Routes>
</Suspense>
```

### 2. Image Optimization

```javascript
// Compress images before upload
const compressImage = async (file) => {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        // Resize
        const maxWidth = 1024;
        const scale = maxWidth / img.width;
        canvas.width = maxWidth;
        canvas.height = img.height * scale;
        
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        
        // Compress
        canvas.toBlob((blob) => {
          resolve(new File([blob], file.name, { type: 'image/jpeg' }));
        }, 'image/jpeg', 0.7);
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  });
};
```

### 3. Virtual Scrolling

```javascript
import { FixedSizeList } from 'react-window';

const DeliveryList = ({ deliveries }) => (
  <FixedSizeList
    height={window.innerHeight - 200}
    itemCount={deliveries.length}
    itemSize={120}
    width="100%"
  >
    {({ index, style }) => (
      <div style={style}>
        <DeliveryCard delivery={deliveries[index]} />
      </div>
    )}
  </FixedSizeList>
);
```

### 4. Lazy Loading Images

```javascript
import { LazyLoadImage } from 'react-lazy-load-image-component';

<LazyLoadImage
  src={product.image}
  alt={product.name}
  effect="blur"
  threshold={100}
  wrapperClassName="w-full h-48 object-cover"
/>
```

---

## 🔨 Build Process

### 1. Development Build

```bash
# Build for web
npm run build

# Sync to native
npx cap sync

# Open in Android Studio
npx cap open android

# Open in Xcode
npx cap open ios
```

### 2. Production Build

**Android APK:**
```bash
# Build
npm run build
npx cap sync android

# In Android Studio:
# Build → Build Bundle(s) / APK(s) → Build APK(s)
# Choose: release
```

**iOS IPA:**
```bash
# Build
npm run build
npx cap sync ios

# In Xcode:
# Product → Archive
# Distribute App
```

### 3. Version Management

**package.json:**
```json
{
  "version": "2.0.0",
  "build": {
    "version": "200",
    "android": {
      "versionCode": 200
    },
    "ios": {
      "buildNumber": "200"
    }
  }
}
```

**capacitor.config.json:**
```json
{
  "version": "2.0.0",
  "android": {
    "versionCode": 200
  },
  "ios": {
    "buildNumber": "200"
  }
}
```

---

## 🧪 Testing

### 1. Unit Testing

```javascript
// __tests__/DeliveryForm.test.jsx
import { render, screen, fireEvent } from '@testing-library/react';
import DeliveryForm from '../Delivery/Views/DeliveryForm';

test('renders delivery form', () => {
  render(<DeliveryForm />);
  expect(screen.getByText('Tạo phiếu giao')).toBeInTheDocument();
});

test('submits form with valid data', () => {
  render(<DeliveryForm />);
  fireEvent.change(screen.getByLabelText('Số lượng'), { target: { value: '100' } });
  fireEvent.click(screen.getByText('Lưu'));
  // Assert submission
});
```

### 2. E2E Testing with Detox

**Installation:**
```bash
npm install --save-dev detox detox-cli
detox init
```

**Test:**
```javascript
// e2e/DeliveryFlow.test.js
describe('Delivery Flow', () => {
  it('should create delivery', async () => {
    await device.launchApp();
    
    await element(by.id('delivery-create-button')).tap();
    await element(by.id('quantity-input')).typeText('100');
    await element(by.id('submit-button')).tap();
    
    await expect(element(by.id('success-message'))).toBeVisible();
  });
});
```

### 3. Manual Testing Checklist

- [ ] Camera works on both Android and iOS
- [ ] QR scanner works correctly
- [ ] Push notifications received
- [ ] Offline mode works
- [ ] Deep links open correctly
- [ ] Performance acceptable on low-end devices
- [ ] UI looks good on different screen sizes

---

## 📞 Hỗ trợ (Support)

Nếu bạn có câu hỏi về Mobile architecture:

1. Kiểm tra **Capacitor Docs**: https://capacitorjs.com/docs
2. Kiểm tra **React Native Docs**: https://reactnative.dev/
3. Liên hệ **Mobile Team**: mobile@smartflowg7.cloud

---

**Last Updated:** 2026-06-03
**Version:** 2.0
**Branch:** test_v1
