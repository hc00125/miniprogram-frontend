# 须知、收益中心与商品分级交接

基线：`feat/product-order-management`，`64856e2`（PR #20 已合并）。

## 本次界面改动

- 老板须知、下单须知共用 `BossNoticePoster`；本地验收候选采用用户确认的667KB WebP外链，按宽度显示并支持点击放大。原PR曾包含完整PNG，候选已移出静态包。
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

## PR修正：采用已确认的667KB WebP外链

用户确认采用收到的须知图片压缩后的 WebP：1052 × 9725，682,750 字节（约667KiB），保留完整尺寸和文字内容，采用有损压缩。该图不是原 PNG 的逐像素无损副本。

- 外链：`https://api.huc125.cn/media/notices/boss-notice-20261014-q50.webp`。
- SHA256：`0b9c210f80553d16c51e2653fd00685be8ea8f42ca3f407e1c99b048418f6013`。
- 交接副本：`docs/assets/notices/boss-notice-20261014-q50.webp`，不进入静态包。
- 从候选 `static/` 移除了3.4MB原 PNG，组件和原生图片预览改为同一 HTTPS 地址；原线上 JPG 未覆盖。
- 保留本机已获准并上传的首页V2前四名请求及首页图片包体优化，不以PR原基线覆盖它们。
- 修改后完整前端套件496/496通过，微信构建与profile-build-check通过；550个构建文件共2,054,891字节。WebP公网下载200，image/webp，尺寸和SHA256核验通过。

以上修正用于更新本PR，合并目标保持 `feat/product-order-management`，不合入旧main。`.version` 与服务器已上传的开发版1.0.76保持一致，不主动递增；下次获准上传时由脚本正常递增。修正和测试不等于已合并、已上传或已切体验版；GitHub CI须按最终提交单独核验。发布前仍需安卓真机验证完整长图加载和点击放大。

## 已完成验证

- `node node_modules/@dcloudio/vite-plugin-uni/bin/uni.js build -p mp-weixin` 通过。
- `node tests/profile-build-check.cjs` 通过：实际 JS/WXML、两处须知完整显示及原生图片预览。
- 22 项商品名称兼容、收益、提现、商品封面、图标与支付相关回归检查通过。
- 线上六商品名称、介绍、价格、规格和等级关联已读回核对；五张新封面均公开下载成功并验证为 512 × 512 JPEG。
- 原图与用户桌面文件逐字节相同；本地 `project.config.json` 改动及未注册的帮助页草稿未纳入 PR。

本次没有操作微信开发者工具或手机，设备视觉效果仍需重编译检查。若开发者工具还显示旧名称或旧图，只清除编译缓存并重新编译，保留登录和业务数据。
