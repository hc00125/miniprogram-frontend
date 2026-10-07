# 排行榜合同 v1（2026-10-07 修正）

## 发布状态与开发分支边界

2026-10-07 的独立发布记录确认：排行榜后端已上线，微信开发版已上传为 1.0.69。本次仓库同步仅保存已授权代码，不重复部署、上传或迁移。

生产采用裁剪后的 release，而非整个开发分支：旧 Player 模型没有 `is_archived`，release 的只读榜单仅在模型存在该字段时附加归档过滤，始终保留 `is_publicly_visible`。该兼容补丁没有合并进当前开发树；开发树已有归档字段及相关功能，不能将仓库与线上 release 视为完全一致，也不能直接整树覆盖线上。

前端部署本机通过不入库的 `.env.production.local` 设置 `VITE_RANKINGS_API_PATH=/rankings/`；新环境需显式配置并构建。后端需在有效 Django settings 中显式设置 `RANKINGS_ENABLED=True`。环境文件、上传私钥、构建产物与私有计划不随本次提交。

## 已确认统计规则

- 陪玩：仅统计最终成功完成的订单，对实际完成服务的陪玩计数；未完成、老板取消、陪玩退出不计。同人同单只计一次。继续按成功接单时间归入北京自然周期，不擅自改为完成时间。
- 老板贡献：点单、礼物、冠名实际消费钻石；充值、余额、免费发放、库存礼物再次赠送不计。点单与礼物的成功退款扣回原消费周期，部分退款扣部分，待退/失败不扣；单笔净贡献不小于零。冠名按已成功完成购买的实际消费计入，不等到权益到期；用户已确认冠名退款暂走线下，本期不自动同步，以后展示手工调整。本轮不新增退款系统或手调后台。
- 北京时间自然日、周一零点自然周、自然月，左闭右开；同分并列1、1、3，稳定排序，最多50行（边界同分不扩容）。
- 只公开行标识、昵称、头像、指标；不得公开手机号、openid、登录名、余额、订单或消费明细。

## HTTP 与发布门禁

`GET /rankings/` 相对现有 BASE_URL，完整路由 `/api/rankings/`；`board=boss|player&period=day|week|month`。匿名只读，非法筛选400，非GET405。

HTTP200未开放：`{"available":false}`。开放：

|字段|规则|
|---|---|
|available|true|
|board / period|与请求一致|
|period_start / period_end|带时区ISO8601，左闭右开|
|updated_at|本次查询快照时间，带时区ISO8601|
|results|最多50行；空数组表示已开放但无人上榜|
|results[].id|唯一非空字符串，公开行标识|
|results[].rank|竞争排名1、1、3|
|results[].name|非空公开昵称，缺失用“陪玩”，不用登录名|
|results[].avatar_url|HTTPS或服务器相对路径，不可用为空|
|results[].value|陪玩非负安全整数；老板钻石最多1位小数|

前端继续显式配置 `VITE_RANKINGS_API_PATH=/rankings/` 才请求，未配置零请求。本次同步不改线上构建环境。后端开关 `RANKINGS_ENABLED` 默认关闭，隔离验收及独立发布显式开启。本阶段不缓存，避免完成/取消后旧资格继续展示；旧请求、隐藏、卸载回包不得更新页面。

## 陪玩数据源与完成资格

- 普通服务单：`Order.order_type=normal` 且 `Order.status=已完成`，成员 `OrderPlayer.status=已完成`；用其原始 `grab_time` 归期，按 `(player, order)` 去重。完成服务流程逐人成员标记，全部完成后才将订单标记完成；单独成员完成但整单未完成不计。
- 老板取消将订单标记已取消；陪玩退出会删除成员，客服取消/退款还可能保留已取消成员。均不能作为完成资格。未接单的指定邀请也不计。
- 续单创建复制成员为已接单，付款即把续单标成已完成，但只是将时长并入原服务单，不代表服务完成，也不是独立接单时间。因此续单复制行不额外计数，实际履约完成只计原服务单完成成员一次；不使用续单付款/复制时间冒充接单时间。
- 可验证的历史普通单完成成员正常纳入，不设上线起算日，不新增接单历史表，不为被删除取消成员补造时间。
- 公开资料沿用公开陪玩可见性门禁，已归档/隐藏成员不披露；不影响原账务或订单记录。

## 老板榜实际来源（复用既有业务，不重建购买页面）

- 点单按 `Payment.amount/paid_at`，仅 paid/refunded；减同笔 `Refund.status=succeeded` 金额。Checkout仅计基础Payment再加对应OrderSurcharge，不重复加checkout总额或钱包扣款；加价用真实完成扣款时间，减其成功入账的refunded_diamonds。
- 礼物应以 `WalletSpendAttempt` 完成消费对应 `shared_spend` 扣款流水的时间和金额为准，不用创建时间。`GiftRefund.status=completed` 才是成功退款，退款申请不能算成功。
- 冠名/包天复用 `PatronagePurchase`：payment_status=paid、attempt=completed、支付身份/金额匹配并有对应shared_spend扣款证据，按paid_at归期，每笔只计一次；不联表展开CrownGrant或PatronageEarning，包天赠冠不二算，撤冠/到期不视作退款。线下退款不自动扣回是本期获准限制，不是后台已经支持手调。
- 复用既有 `/gifts/purchase-records/`、`/patronage/records/` 的购买模型语义；原页面 `pages/client/gifts/index.vue`、`pages/client/patronage/records.vue` 和购买流程不改。通报接口统计的是赠送/授冠，不可直接拿通报数量当消费。
- 金额全过程Decimal：人民币元×10为钻石，0.01元=0.1钻；只在最终JSON数字输出转换，不叠加充值、钱包余额、工资或库存赠送。

本次仅同步开发仓库，未再次生产部署、生产迁移或上传。开发验收与独立发布是两次操作；部署状态及开发/线上差异见本文开头，不能将开发阶段的“未上线”记录当作当前发布状态。
