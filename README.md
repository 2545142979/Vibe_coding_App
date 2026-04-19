# 错题复习提醒 App

一个基于 Expo + React Native + AsyncStorage 的极简错题复习提醒 App。

## 项目结构

```text
.
├─ App.js          # 主界面、分级复习、知识点备注、录入弹窗、滑动删除
├─ index.js        # Expo 入口文件
├─ app.json        # Expo 应用配置
├─ eas.json        # EAS Build 配置，包含 APK 的 preview 配置
├─ assets/         # 应用图标资源
├─ package.json    # 项目依赖和脚本
└─ README.md       # 使用说明
```

## 已实现功能

- 新增错题：录入“书名/资料名 + 页码/题号”
- 知识点备注：新增错题时可填写知识点，留空也没问题
- 分级复习：按“有点不会 / 比较不会 / 完全不会”选择不同复习节奏
- 本地存储：使用 AsyncStorage，不依赖后端
- 今日看板：只显示今天需要复习的题目
- 一键 Done：完成今天的复习后自动推算下一次复习时间
- 全部错题：按书名分组展示所有记录
- 左滑删除：在“全部错题”页中左滑删除某道题
- 应用图标：已配置 App logo 与 Android 自适应图标

## 分级复习规则

- `有点不会`：`2 / 5 / 10 / 21` 天
- `比较不会`：`1 / 2 / 4 / 7 / 15` 天
- `完全不会`：`1 / 2 / 3 / 5 / 8 / 13 / 21` 天

每道错题会单独保存自己的复习方案，所以不同题目可以使用不同强度的提醒节奏。

## 本地运行

1. 安装 Node.js LTS 版本。
2. 在当前目录打开终端。
3. 安装依赖：

```bash
npm install
```

4. 启动项目：

```bash
npx expo start
```

5. 在安卓手机上安装 `Expo Go`。
6. 用 `Expo Go` 扫终端里的二维码即可预览。

## 傻瓜式打包 APK

下面这套流程适合第一次打包安卓安装包的人：

### 第一步：注册 Expo 账号

- 打开 `https://expo.dev/signup`
- 注册一个账号

### 第二步：安装 EAS CLI

```bash
npm install -g eas-cli
```

### 第三步：登录 Expo

```bash
eas login
```

### 第四步：在项目目录执行初始化配置

```bash
eas build:configure
```

如果命令提示你已存在 `eas.json`，直接继续即可。

### 第五步：开始打包 APK

```bash
eas build -p android --profile preview
```

这条命令会按 `eas.json` 里的 `preview` 配置生成一个可直接安装到安卓手机的 `.apk` 文件。

### 第六步：下载 APK

- 打包完成后，终端会给你一个链接
- 打开链接
- 下载 `.apk`
- 发到你的安卓手机上安装

### 第七步：安卓手机安装 APK

- 用微信、QQ、浏览器、数据线都可以把 APK 发到手机
- 在手机里点开 APK
- 如果系统拦截，就允许“安装未知来源应用”
- 安装完成后直接打开

## 复习规则说明

当前实现里，每道题会按自己的难度方案来安排复习日期。点击 `Done` 后，系统会按该题的下一轮间隔继续推算下一次复习时间，这样即使你某天晚复习了，也不会出现“下一次提醒仍然落在过去”的情况。

## 最近一次打包记录

- EAS 项目：`@keil_jordan/wrong-problem-review`
- 打包命令：`eas build -p android --profile preview`
- 如果你后续再次修改代码，重新执行上面这条命令即可生成新的 APK。

## 官方文档参考

- Expo 创建与构建说明：`https://docs.expo.dev/build/setup/`
- Expo APK 构建说明：`https://docs.expo.dev/build-reference/apk/`
- AsyncStorage 安装说明：`https://docs.expo.dev/versions/latest/sdk/async-storage/`
