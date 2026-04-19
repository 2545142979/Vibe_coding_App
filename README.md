# 错题复习提醒 App

一个基于 `Expo + React Native + AsyncStorage` 的极简错题复习 App。

你不需要拍照、扫描或抄题，只要记录：

- 这道错题在哪本书
- 是哪一页 / 哪一题
- 属于什么知识点（可选）
- 你到底有多不会

然后 App 会按照分级复习节奏，在每天打开时提醒你该复习哪些题。

## 功能亮点

- 极简录入：只填 `书名/资料名` 和 `页码/题号`
- 知识点备注：可选填写，方便后续按知识点回忆
- 分级复习：按不会程度使用不同复习节奏
- 今日看板：首页只显示今天要复习的题
- 一键完成：点击 `Done` 自动推进到下一轮
- 全部错题：按书名分组浏览全部记录
- 左滑删除：录错了可以直接删
- 本地存储：数据保存在手机本地，不依赖后端
- 自定义图标：已配置 App logo 和 Android 自适应图标

## 分级复习规则

- `有点不会`：`2 / 5 / 10 / 21` 天
- `比较不会`：`1 / 2 / 4 / 7 / 15` 天
- `完全不会`：`1 / 2 / 3 / 5 / 8 / 13 / 21` 天

每道题都会保存自己的复习方案，所以不同题目可以使用不同强度的复习节奏。

## 项目结构

```text
.
├─ App.js          # 主界面、复习逻辑、录入弹窗、列表、删除交互
├─ index.js        # Expo 入口文件
├─ app.json        # Expo 应用配置
├─ eas.json        # EAS Build 配置
├─ assets/         # 图标资源
├─ package.json    # 依赖与脚本
├─ package-lock.json
└─ README.md
```

## 本地运行

1. 安装 Node.js LTS
2. 在项目目录打开终端
3. 安装依赖：

```bash
npm install
```

4. 启动开发服务器：

```bash
npx expo start
```

5. 安卓手机安装 `Expo Go`
6. 用 `Expo Go` 扫终端二维码预览

## 打包安卓 APK

### 1. 注册 Expo 账号

- 打开 `https://expo.dev/signup`
- 注册并登录

### 2. 安装 EAS CLI

```bash
npm install -g eas-cli
```

### 3. 登录 Expo

```bash
eas login
```

### 4. 初始化 EAS

```bash
eas init
```

如果项目已经绑定过 EAS，可以跳过这一步。

### 5. 打包 APK

```bash
eas build -p android --profile preview
```

这条命令会生成一个可以直接安装到安卓手机的 `.apk` 文件。

### 6. 下载并安装

- 打包完成后打开终端给出的链接
- 下载生成的 `.apk`
- 发到安卓手机安装
- 如果系统拦截，允许“安装未知来源应用”即可

## 当前仓库

- GitHub：`git@github.com:2545142979/Vibe_coding_App.git`
- 默认分支：`main`

## 技术说明

- 数据存储：`@react-native-async-storage/async-storage`
- UI：纯 React Native 原生组件
- 构建：Expo + EAS Build
- 平台：当前已完成 Android APK 打包流程

## 官方参考

- Expo 构建说明：`https://docs.expo.dev/build/setup/`
- Expo APK 说明：`https://docs.expo.dev/build-reference/apk/`
- AsyncStorage 说明：`https://docs.expo.dev/versions/latest/sdk/async-storage/`
