# UI 主题

个人中心头像卡片下方的「切换 UI」对游客和登录用户均可见。选择立即生效；点击完成或遮罩关闭，离开页面自动收起。

预设：夜幕蓝紫 `night`、元气粉蓝 `pink`、雾蓝 `mist`。首次使用、未知或损坏的偏好使用雾蓝。使用独立本机存储键 `touchi:ui-theme:v1`，不依赖账号、不清除登录信息；存储失败仍应用当前主题并提示无法保存。

`src/utils/theme.ts` 管理色值、渐变、持久化和原生导航栏。各页面在原有根 view 上绑定全局 mixin 的 `$appThemeStyle`，组件继承 CSS 变量。仅页面 onShow 更新原生导航及 tabBar，避免每个列表子组件重复调用。原生 switch 使用 `$appThemeAccent`。

`ThemePicker.vue` 提供主题面板。`uiIcons.ts` 根据当前主题返回配套 PNG，原生 tabBar 同时更新选中/未选中图标；资产位于 `static/icons/themes/{id}`。普通图标从现有 SVG 母版重新着色，保留双色细节；浅色/红色语义图标保留原资源。业务插图、用户头像、接口、计价和支付判断不随主题改变。

验证：`node --test tests/theme.test.cjs tests/home-next-stage.test.cjs tests/gift-persistent-entry.test.cjs tests/history-settings-navigation.test.cjs tests/rankings-navigation.test.cjs`；之后执行 `node node_modules/@dcloudio/vite-plugin-uni/bin/uni.js build -p mp-weixin`。

浏览器适配预览只用于源码组件的主题交互与配色检查，使用测试数据，不能替代微信开发者工具/真机的原生 tabBar、导航栏与支付验证。
