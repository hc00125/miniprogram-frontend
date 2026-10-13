# 须知、收益中心与商品分级交接

基线：`feat/product-order-management`，`64856e2`（PR #20 已合并）。

## 本次界面改动

- 老板须知、下单须知共用 `BossNoticePoster`，替换为用户提供的完整原 PNG，按宽度显示并支持点击放大。
- 鱼干收益中心删除审核期、兑换、提现说明小字，以及四项统计卡和默认抽成说明卡。订单号、老板昵称、时间、异常提示和提现逻辑保留。
- 暗区突围 / 大神包时的普通商城商品兼容旧名称，仅变更展示名称与介绍。商品、规格、接单等级 ID、价格及历史订单记录保持不变。
- 用户协议中的娱乐 mini、技术 mini 称谓同步为娱乐陪、技术陪，原抽成比例及范围保持不变。

## 已同步线上后台的六件商品

| 商品 ID | 旧名称 | 新名称 | 钻石/小时 | 规格 ID | 接单等级 ID |
| --- | --- | --- | ---: | --- | --- |
| 37 | 娱乐mini | 娱乐陪 | 300 | 109 | 10 |
| 38 | 技术mini | 技术陪 | 400 | 110 | 2 |
| 39 | 娱乐pro | 情绪陪 | 500 | 111 | 12 |
| 40 | 技术pro | 银牌 | 650 | 112 | 13 |
| 41 | 金牌 | 金牌 | 800 | 113 | 3 |
| 42 | 明星 | 魔王 | 1000 | 114 | 4 |

只更新商品名称、简介、详情，以及需要改字的五张封面。金牌封面保持原样。
五张封面经图片编辑工具替换等级文字，保留原插画风格；模型编辑不保证非标题区域逐像素相同。新封面均为 512 × 512，线上文件约 73–84 KiB。

六张用于迁移的源商品图位于 `docs/assets/hourly-service-covers/`，该目录不进入小程序静态资源包。
迁移服务器时同步数据库中的商品/规格/封面记录和 `media/packages/` 文件。当前图片地址如下：

- 娱乐陪：`https://api.huc125.cn/media/packages/2026/10/club-cover-1-entertainment-20261014.jpg`
- 技术陪：`https://api.huc125.cn/media/packages/2026/10/club-cover-2-technical-20261014.jpg`
- 情绪陪：`https://api.huc125.cn/media/packages/2026/10/club-cover-3-emotional-20261014.jpg`
- 银牌：`https://api.huc125.cn/media/packages/2026/10/club-cover-4-silver-20261014.jpg`
- 金牌：`https://api.huc125.cn/media/packages/2026/10/club-cover-5-fast-20261011.jpg`
- 魔王：`https://api.huc125.cn/media/packages/2026/10/club-cover-6-demon-20261014.jpg`

## 发布前待接入原图外链

用户已决定由朋友上传老板须知原图；本次保留原图供本地查看和交接。
`static/images/notices/boss-notice.png` 为 1152 × 10649，3,408,820 字节，SHA256：
`793072890d146abeb1837766ec173e8ca73bf30096644f50642b7c577fd980d7`。

目前原 PNG 随静态资源打包，超过小程序主包的常规体积限制。本 PR 可先审查，暂不可直接据此上传正式版本。
朋友完成原文件托管后，将 `BossNoticePoster.vue` 的 `POSTER_URL` 改为可公开访问的 HTTPS 图片链接，从 `static/` 移出原 PNG，并同步调整 `tests/profile-build-check.cjs` 的资源断言。核对下载文件尺寸和 SHA256，再构建、检查主包体积和真机加载。

## 已完成验证

- `node node_modules/@dcloudio/vite-plugin-uni/bin/uni.js build -p mp-weixin` 通过。
- `node tests/profile-build-check.cjs` 通过：实际 JS/WXML、两处须知完整显示及原生图片预览。
- 22 项商品名称兼容、收益、提现、商品封面、图标与支付相关回归检查通过。
- 线上六商品名称、介绍、价格、规格和等级关联已读回核对；五张新封面均公开下载成功并验证为 512 × 512 JPEG。
- 原图与用户桌面文件逐字节相同；本地 `project.config.json` 改动及未注册的帮助页草稿未纳入 PR。

本次没有操作微信开发者工具或手机，设备视觉效果仍需重编译检查。若开发者工具还显示旧名称或旧图，只清除编译缓存并重新编译，保留登录和业务数据。
